import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/calendar/events/route"

// Hoisted mocks
const mockGetCurrentUser = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  appointment: {
    findMany: vi.fn(),
  },
  classSession: {
    findMany: vi.fn(),
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}))

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}))

describe("Calendar Events API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const request = new Request("http://localhost/api/calendar/events?from=2025-01-01&to=2025-01-31")
    const response = await GET(request)

    expect(response.status).toBe(401)
    const text = await response.text()
    expect(text).toBe("Unauthorized")
    expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.classSession.findMany).not.toHaveBeenCalled()
  })

  it("returns 400 when missing 'from' parameter", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "1", name: "Test User", email: "test@example.com", role: "COACH" })

    const request = new Request("http://localhost/api/calendar/events?to=2025-01-31")
    const response = await GET(request)

    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe("Missing date range")
  })

  it("returns 400 when missing 'to' parameter", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "1", name: "Test User", email: "test@example.com", role: "COACH" })

    const request = new Request("http://localhost/api/calendar/events?from=2025-01-01")
    const response = await GET(request)

    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe("Missing date range")
  })

  it("returns appointments and sessions for date range", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "1", name: "Test User", email: "test@example.com", role: "COACH" })

    const mockAppointments = [
      { id: 1, title: "Client Session", startTime: new Date("2025-01-15T10:00:00Z"), endTime: new Date("2025-01-15T11:00:00Z") },
      { id: 2, title: "Team Meeting", startTime: new Date("2025-01-20T14:00:00Z"), endTime: new Date("2025-01-20T15:00:00Z") },
    ]

    const mockSessions = [
      { id: 1, title: "Yoga Class", startTime: new Date("2025-01-18T09:00:00Z"), endTime: new Date("2025-01-18T10:00:00Z"), classType: { name: "Yoga", color: "#FF5733" } },
    ]

    mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments)
    mockPrisma.classSession.findMany.mockResolvedValue(mockSessions)

    const request = new Request("http://localhost/api/calendar/events?from=2025-01-01&to=2025-01-31")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveProperty("appointments")
    expect(data).toHaveProperty("sessions")
    expect(data.appointments).toHaveLength(2)
    expect(data.appointments[0].title).toBe("Client Session")
    expect(data.appointments[1].title).toBe("Team Meeting")
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].title).toBe("Yoga Class")
  })

  it("queries appointments by userId or coachId", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "1", name: "Test User", email: "test@example.com", role: "COACH" })

    mockPrisma.appointment.findMany.mockResolvedValue([])
    mockPrisma.classSession.findMany.mockResolvedValue([])

    const request = new Request("http://localhost/api/calendar/events?from=2025-01-01&to=2025-01-31")
    await GET(request)

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: 1 },
          { coachId: 1 },
        ],
        startTime: {
          gte: new Date("2025-01-01"),
          lt: new Date("2025-01-31"),
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    })
  })

  it("queries sessions with SCHEDULED status", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "1", name: "Test User", email: "test@example.com", role: "COACH" })

    mockPrisma.appointment.findMany.mockResolvedValue([])
    mockPrisma.classSession.findMany.mockResolvedValue([])

    const request = new Request("http://localhost/api/calendar/events?from=2025-01-01&to=2025-01-31")
    await GET(request)

    expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith({
      where: {
        status: "SCHEDULED",
        startTime: {
          gte: new Date("2025-01-01"),
          lt: new Date("2025-01-31"),
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        classType: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    })
  })

  it("handles date range conversion correctly", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "2", name: "Another User", email: "another@example.com", role: "CLIENT" })

    mockPrisma.appointment.findMany.mockResolvedValue([])
    mockPrisma.classSession.findMany.mockResolvedValue([])

    const fromDate = "2025-02-01T00:00:00Z"
    const toDate = "2025-02-28T23:59:59Z"
    const request = new Request(`http://localhost/api/calendar/events?from=${fromDate}&to=${toDate}`)
    await GET(request)

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        }),
      })
    )

    expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        }),
      })
    )
  })

  it("handles multiple user IDs correctly", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "42", name: "Test Coach", email: "coach@example.com", role: "COACH" })

    mockPrisma.appointment.findMany.mockResolvedValue([])
    mockPrisma.classSession.findMany.mockResolvedValue([])

    const request = new Request("http://localhost/api/calendar/events?from=2025-01-01&to=2025-01-31")
    await GET(request)

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { userId: 42 },
            { coachId: 42 },
          ],
        }),
      })
    )
  })
})
