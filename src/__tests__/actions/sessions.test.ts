/**
 * Sessions Server Actions Tests
 *
 * Tests for class session CRUD server actions including
 * creation, updating, cancellation, queries, and recurring session generation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockPrisma, resetPrismaMocks } from "../mocks/prisma"

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
  requireAdmin: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
  requireCoach: vi.fn().mockResolvedValue({ id: "1", role: "COACH" }),
  requireRole: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Import functions under test after mocks
import {
  getSessions,
  getSessionById,
  getCohortSessions,
  createSession,
  updateSession,
  cancelSession,
  generateRecurringSessions,
} from "@/app/actions/sessions"
import { requireCoach } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    classTypeId: 1,
    cohortId: null,
    coachId: 1,
    title: "Morning HIIT",
    startTime: new Date("2024-06-01T09:00:00Z"),
    endTime: new Date("2024-06-01T10:00:00Z"),
    maxOccupancy: 12,
    location: "Studio A",
    notes: null,
    status: "SCHEDULED",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }
}

function mockSessionWithRelations(overrides: Record<string, unknown> = {}) {
  return {
    ...mockSession(overrides),
    classType: { id: 1, name: "HIIT", color: "#FF0000" },
    coach: { id: 1, name: "Coach One", email: "coach@test.com" },
    _count: { registrations: 5 },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sessions Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // getSessions
  // -------------------------------------------------------------------------

  describe("getSessions", () => {
    it("should return all sessions with relations", async () => {
      const sessions = [
        mockSessionWithRelations({ id: 1 }),
        mockSessionWithRelations({ id: 2, title: "Yoga Flow" }),
      ]
      mockPrisma.classSession.findMany.mockResolvedValue(sessions)

      const result = await getSessions()

      expect(result).toHaveLength(2)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          classType: true,
          coach: { select: { id: true, name: true, email: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: { startTime: "desc" },
      })
    })

    it("should filter by coachId", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({ coachId: 5 })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ coachId: 5 }),
        })
      )
    })

    it("should filter by cohortId", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({ cohortId: 3 })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cohortId: 3 }),
        })
      )
    })

    it("should filter by classTypeId", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({ classTypeId: 2 })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ classTypeId: 2 }),
        })
      )
    })

    it("should filter by status", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({ status: "SCHEDULED" })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "SCHEDULED" }),
        })
      )
    })

    it("should filter by date range", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({
        startDate: "2024-06-01",
        endDate: "2024-06-30",
      })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: new Date("2024-06-01"),
              lte: new Date("2024-06-30"),
            },
          }),
        })
      )
    })

    it("should filter by startDate only", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({ startDate: "2024-06-01" })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: { gte: new Date("2024-06-01") },
          }),
        })
      )
    })

    it("should combine multiple filters", async () => {
      mockPrisma.classSession.findMany.mockResolvedValue([])

      await getSessions({ coachId: 1, classTypeId: 2, status: "SCHEDULED" })

      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            coachId: 1,
            classTypeId: 2,
            status: "SCHEDULED",
          }),
        })
      )
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireCoach).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(getSessions()).rejects.toThrow("Unauthorized")
    })
  })

  // -------------------------------------------------------------------------
  // getSessionById
  // -------------------------------------------------------------------------

  describe("getSessionById", () => {
    it("should return a session with full relations", async () => {
      const session = {
        ...mockSession({ id: 5 }),
        classType: { id: 1, name: "HIIT" },
        coach: { id: 1, name: "Coach", email: "coach@test.com" },
        cohort: null,
        registrations: [
          { id: 1, user: { id: 10, name: "Member", email: "member@test.com" } },
        ],
      }
      mockPrisma.classSession.findUniqueOrThrow.mockResolvedValue(session)

      const result = await getSessionById(5)

      expect(result).toEqual(session)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 5 },
        include: {
          classType: true,
          coach: { select: { id: true, name: true, email: true } },
          cohort: true,
          registrations: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      })
    })

    it("should throw when session not found", async () => {
      mockPrisma.classSession.findUniqueOrThrow.mockRejectedValue(
        new Error("No ClassSession found")
      )

      await expect(getSessionById(999)).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // getCohortSessions
  // -------------------------------------------------------------------------

  describe("getCohortSessions", () => {
    it("should return sessions for a specific cohort", async () => {
      const sessions = [
        mockSessionWithRelations({ id: 1, cohortId: 7 }),
        mockSessionWithRelations({ id: 2, cohortId: 7 }),
      ]
      mockPrisma.classSession.findMany.mockResolvedValue(sessions)

      const result = await getCohortSessions(7)

      expect(result).toHaveLength(2)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.findMany).toHaveBeenCalledWith({
        where: { cohortId: 7 },
        include: {
          classType: true,
          coach: { select: { id: true, name: true, email: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: { startTime: "desc" },
      })
    })
  })

  // -------------------------------------------------------------------------
  // createSession
  // -------------------------------------------------------------------------

  describe("createSession", () => {
    it("should create a session with valid input", async () => {
      const created = mockSession({ id: 10, title: "New Session" })
      mockPrisma.classSession.create.mockResolvedValue(created)

      const result = await createSession({
        classTypeId: 1,
        title: "New Session",
        startTime: "2024-06-15T09:00:00Z",
        endTime: "2024-06-15T10:00:00Z",
        maxOccupancy: 15,
        location: "Studio B",
        notes: "Bring mats",
      })

      expect(result).toEqual(created)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.create).toHaveBeenCalledWith({
        data: {
          classTypeId: 1,
          cohortId: undefined,
          coachId: 1, // parsed from user.id "1"
          title: "New Session",
          startTime: new Date("2024-06-15T09:00:00Z"),
          endTime: new Date("2024-06-15T10:00:00Z"),
          maxOccupancy: 15,
          location: "Studio B",
          notes: "Bring mats",
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should create a session with cohortId", async () => {
      const created = mockSession({ id: 11, cohortId: 3 })
      mockPrisma.classSession.create.mockResolvedValue(created)

      await createSession({
        cohortId: 3,
        title: "Cohort Session",
        startTime: "2024-06-15T09:00:00Z",
        endTime: "2024-06-15T10:00:00Z",
        maxOccupancy: 10,
      })

      expect(mockPrisma.classSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cohortId: 3,
        }),
      })
    })

    it("should create a session without optional fields", async () => {
      const created = mockSession({ id: 12 })
      mockPrisma.classSession.create.mockResolvedValue(created)

      await createSession({
        title: "Minimal Session",
        startTime: "2024-06-15T09:00:00Z",
        endTime: "2024-06-15T10:00:00Z",
        maxOccupancy: 8,
      })

      expect(mockPrisma.classSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Minimal Session",
          classTypeId: undefined,
          cohortId: undefined,
          location: undefined,
          notes: undefined,
        }),
      })
    })

    it("should reject when title is empty", async () => {
      await expect(
        createSession({
          title: "",
          startTime: "2024-06-15T09:00:00Z",
          endTime: "2024-06-15T10:00:00Z",
          maxOccupancy: 10,
        })
      ).rejects.toThrow()
    })

    it("should reject when startTime is empty", async () => {
      await expect(
        createSession({
          title: "Test",
          startTime: "",
          endTime: "2024-06-15T10:00:00Z",
          maxOccupancy: 10,
        })
      ).rejects.toThrow()
    })

    it("should reject when maxOccupancy is less than 1", async () => {
      await expect(
        createSession({
          title: "Test",
          startTime: "2024-06-15T09:00:00Z",
          endTime: "2024-06-15T10:00:00Z",
          maxOccupancy: 0,
        })
      ).rejects.toThrow()
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireCoach).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(
        createSession({
          title: "Test",
          startTime: "2024-06-15T09:00:00Z",
          endTime: "2024-06-15T10:00:00Z",
          maxOccupancy: 10,
        })
      ).rejects.toThrow("Unauthorized")
    })
  })

  // -------------------------------------------------------------------------
  // updateSession
  // -------------------------------------------------------------------------

  describe("updateSession", () => {
    it("should update a session with valid input", async () => {
      const updated = mockSession({ id: 1, title: "Updated Title" })
      mockPrisma.classSession.update.mockResolvedValue(updated)

      const result = await updateSession({
        id: 1,
        title: "Updated Title",
        maxOccupancy: 20,
      })

      expect(result).toEqual(updated)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          title: "Updated Title",
          maxOccupancy: 20,
        }),
      })
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should only send defined fields in the update data", async () => {
      const updated = mockSession({ id: 1 })
      mockPrisma.classSession.update.mockResolvedValue(updated)

      await updateSession({
        id: 1,
        title: "Only Title",
      })

      const callArgs = mockPrisma.classSession.update.mock.calls[0][0]
      expect(callArgs.data).toEqual({ title: "Only Title" })
    })

    it("should convert startTime and endTime to Date objects", async () => {
      const updated = mockSession({ id: 1 })
      mockPrisma.classSession.update.mockResolvedValue(updated)

      await updateSession({
        id: 1,
        startTime: "2024-07-01T14:00:00Z",
        endTime: "2024-07-01T15:00:00Z",
      })

      const callArgs = mockPrisma.classSession.update.mock.calls[0][0]
      expect(callArgs.data.startTime).toEqual(new Date("2024-07-01T14:00:00Z"))
      expect(callArgs.data.endTime).toEqual(new Date("2024-07-01T15:00:00Z"))
    })

    it("should allow setting classTypeId and cohortId to null", async () => {
      const updated = mockSession({ id: 1 })
      mockPrisma.classSession.update.mockResolvedValue(updated)

      await updateSession({
        id: 1,
        classTypeId: null,
        cohortId: null,
      })

      const callArgs = mockPrisma.classSession.update.mock.calls[0][0]
      expect(callArgs.data.classTypeId).toBeNull()
      expect(callArgs.data.cohortId).toBeNull()
    })

    it("should reject when id is not a positive integer", async () => {
      await expect(
        updateSession({ id: 0, title: "Test" })
      ).rejects.toThrow()

      await expect(
        updateSession({ id: -1, title: "Test" })
      ).rejects.toThrow()
    })

    it("should reject when maxOccupancy is less than 1", async () => {
      await expect(
        updateSession({ id: 1, maxOccupancy: 0 })
      ).rejects.toThrow()
    })

    it("should propagate Prisma errors when session not found", async () => {
      mockPrisma.classSession.update.mockRejectedValue(
        new Error("Record to update not found")
      )

      await expect(
        updateSession({ id: 999, title: "No such session" })
      ).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // cancelSession
  // -------------------------------------------------------------------------

  describe("cancelSession", () => {
    it("should cancel a session by setting status to CANCELLED", async () => {
      const cancelled = mockSession({ id: 3, status: "CANCELLED" })
      mockPrisma.classSession.update.mockResolvedValue(cancelled)

      const result = await cancelSession(3)

      expect(result).toEqual(cancelled)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { status: "CANCELLED" },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireCoach).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(cancelSession(1)).rejects.toThrow("Unauthorized")
    })

    it("should propagate Prisma errors when session not found", async () => {
      mockPrisma.classSession.update.mockRejectedValue(
        new Error("Record to update not found")
      )

      await expect(cancelSession(999)).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // generateRecurringSessions
  // -------------------------------------------------------------------------

  describe("generateRecurringSessions", () => {
    it("should generate recurring sessions for the specified number of weeks", async () => {
      const batchResult = { count: 4 }
      mockPrisma.classSession.createMany.mockResolvedValue(batchResult)

      const result = await generateRecurringSessions({
        classTypeId: 1,
        title: "Weekly HIIT",
        startTime: "09:00",
        endTime: "10:00",
        maxOccupancy: 15,
        location: "Studio A",
        dayOfWeek: 1, // Monday
        weeks: 4,
        startDate: "2024-06-03", // A Monday
      })

      expect(result).toEqual(batchResult)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classSession.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            classTypeId: 1,
            coachId: 1,
            title: "Weekly HIIT",
            maxOccupancy: 15,
            location: "Studio A",
          }),
        ]),
      })

      // Verify the correct number of sessions were generated
      const createManyCall = mockPrisma.classSession.createMany.mock.calls[0][0]
      expect(createManyCall.data).toHaveLength(4)
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should generate sessions with correct times for each week", async () => {
      mockPrisma.classSession.createMany.mockResolvedValue({ count: 2 })

      await generateRecurringSessions({
        title: "Twice",
        startTime: "14:30",
        endTime: "15:45",
        maxOccupancy: 10,
        dayOfWeek: 3, // Wednesday
        weeks: 2,
        startDate: "2024-06-05", // A Wednesday
      })

      const createManyCall = mockPrisma.classSession.createMany.mock.calls[0][0]
      const sessions = createManyCall.data

      expect(sessions).toHaveLength(2)

      // Both sessions should have the correct hour/minute
      for (const session of sessions) {
        expect(session.startTime.getHours()).toBe(14)
        expect(session.startTime.getMinutes()).toBe(30)
        expect(session.endTime.getHours()).toBe(15)
        expect(session.endTime.getMinutes()).toBe(45)
      }
    })

    it("should include cohortId when provided", async () => {
      mockPrisma.classSession.createMany.mockResolvedValue({ count: 1 })

      await generateRecurringSessions({
        cohortId: 5,
        title: "Cohort Recurring",
        startTime: "09:00",
        endTime: "10:00",
        maxOccupancy: 10,
        dayOfWeek: 1,
        weeks: 1,
        startDate: "2024-06-03",
      })

      const createManyCall = mockPrisma.classSession.createMany.mock.calls[0][0]
      expect(createManyCall.data[0].cohortId).toBe(5)
    })

    it("should use the authenticated coach's id", async () => {
      vi.mocked(requireCoach).mockResolvedValueOnce({
        id: "42",
        role: "COACH",
      } as never)
      mockPrisma.classSession.createMany.mockResolvedValue({ count: 1 })

      await generateRecurringSessions({
        title: "Coach Session",
        startTime: "09:00",
        endTime: "10:00",
        maxOccupancy: 10,
        dayOfWeek: 1,
        weeks: 1,
        startDate: "2024-06-03",
      })

      const createManyCall = mockPrisma.classSession.createMany.mock.calls[0][0]
      expect(createManyCall.data[0].coachId).toBe(42)
    })

    it("should reject when title is empty", async () => {
      await expect(
        generateRecurringSessions({
          title: "",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 10,
          dayOfWeek: 1,
          weeks: 1,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow()
    })

    it("should reject when weeks is less than 1", async () => {
      await expect(
        generateRecurringSessions({
          title: "Test",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 10,
          dayOfWeek: 1,
          weeks: 0,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow()
    })

    it("should reject when weeks exceeds 52", async () => {
      await expect(
        generateRecurringSessions({
          title: "Test",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 10,
          dayOfWeek: 1,
          weeks: 53,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow()
    })

    it("should reject when dayOfWeek is out of range", async () => {
      await expect(
        generateRecurringSessions({
          title: "Test",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 10,
          dayOfWeek: 7,
          weeks: 1,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow()

      await expect(
        generateRecurringSessions({
          title: "Test",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 10,
          dayOfWeek: -1,
          weeks: 1,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow()
    })

    it("should reject when maxOccupancy is less than 1", async () => {
      await expect(
        generateRecurringSessions({
          title: "Test",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 0,
          dayOfWeek: 1,
          weeks: 1,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow()
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireCoach).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(
        generateRecurringSessions({
          title: "Test",
          startTime: "09:00",
          endTime: "10:00",
          maxOccupancy: 10,
          dayOfWeek: 1,
          weeks: 1,
          startDate: "2024-06-03",
        })
      ).rejects.toThrow("Unauthorized")
    })
  })
})
