import { describe, it, expect, vi, beforeEach } from "vitest"

const { MockNextResponse } = vi.hoisted(() => {
  class MockNextResponse {
    _data: unknown
    status: number
    headers: Map<string, string>
    constructor(body: unknown, init?: { status?: number }) {
      this._data = body
      this.status = init?.status ?? 200
      this.headers = new Map()
    }
    async json() { return this._data }
    static json(data: unknown, init?: { status?: number }) {
      const resp = new MockNextResponse(data, init)
      resp._data = data
      return resp
    }
  }
  return { MockNextResponse }
})

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: MockNextResponse,
}))

// Mock prisma
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  healthKitWorkout: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

// Import route handlers after mocks
import { POST, OPTIONS } from "@/app/api/healthkit/workouts/route"

// Helper to create mock request
function createPostRequest(body: unknown) {
  return { json: async () => body } as any
}

describe("/api/healthkit/workouts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST", () => {
    const validWorkout = {
      workout_type: "Running",
      start_time: "2024-01-15T10:00:00Z",
      end_time: "2024-01-15T10:30:00Z",
      duration_seconds: 1800,
      calories_active: 250,
      distance_meters: 5000,
      avg_heart_rate: 145,
      max_heart_rate: 165,
    }

    it("returns 404 when client not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const req = createPostRequest({
        client_id: 999,
        workouts: [validWorkout],
      })

      const response = await POST(req)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({ error: "Client not found" })
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        select: { id: true },
      })
    })

    it("creates new workout when no duplicate exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.healthKitWorkout.findFirst.mockResolvedValue(null)
      mockPrisma.healthKitWorkout.create.mockResolvedValue({ id: "workout-1" })

      const req = createPostRequest({
        client_id: 123,
        workouts: [validWorkout],
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toMatchObject({
        success: true,
        processed: 1,
        total: 1,
      })
      expect(data.errors).toBeUndefined()

      expect(mockPrisma.healthKitWorkout.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 123,
          workoutType: "Running",
          duration: 1800,
          calories: 250,
          distance: 5000,
          heartRate: { avg: 145, max: 165 },
        }),
      })
    })

    it("updates existing workout when duplicate found", async () => {
      const existingWorkout = {
        id: "workout-existing",
        userId: 123,
        workoutType: "Running",
        startTime: new Date("2024-01-15T10:00:00Z"),
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.healthKitWorkout.findFirst.mockResolvedValue(existingWorkout)
      mockPrisma.healthKitWorkout.update.mockResolvedValue(existingWorkout)

      const req = createPostRequest({
        client_id: 123,
        workouts: [validWorkout],
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toMatchObject({
        success: true,
        processed: 1,
        total: 1,
      })

      expect(mockPrisma.healthKitWorkout.update).toHaveBeenCalledWith({
        where: { id: "workout-existing" },
        data: expect.objectContaining({
          duration: 1800,
          calories: 250,
          distance: 5000,
          heartRate: { avg: 145, max: 165 },
        }),
      })
    })

    it("handles workouts with optional fields missing", async () => {
      const minimalWorkout = {
        workout_type: "Yoga",
        start_time: "2024-01-15T08:00:00Z",
        end_time: "2024-01-15T09:00:00Z",
        duration_seconds: 3600,
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.healthKitWorkout.findFirst.mockResolvedValue(null)
      mockPrisma.healthKitWorkout.create.mockResolvedValue({ id: "workout-2" })

      const req = createPostRequest({
        client_id: 123,
        workouts: [minimalWorkout],
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.processed).toBe(1)

      expect(mockPrisma.healthKitWorkout.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 123,
          workoutType: "Yoga",
          duration: 3600,
          calories: null,
          distance: null,
        }),
      })
    })

    it("returns 207 on partial success (mixed results)", async () => {
      const workout1 = { ...validWorkout }
      const workout2 = {
        ...validWorkout,
        start_time: "2024-01-15T14:00:00Z",
        end_time: "2024-01-15T14:30:00Z",
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.healthKitWorkout.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockPrisma.healthKitWorkout.create
        .mockResolvedValueOnce({ id: "workout-1" })
        .mockRejectedValueOnce(new Error("Database constraint violation"))

      const req = createPostRequest({
        client_id: 123,
        workouts: [workout1, workout2],
      })

      const response = await POST(req)

      expect(response.status).toBe(207) // Multi-Status
      const data = await response.json()
      expect(data).toMatchObject({
        success: true,
        processed: 1,
        total: 2,
      })
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0]).toMatchObject({
        index: 1,
        message: "Database constraint violation",
      })
    })

    it("returns 400 on validation error", async () => {
      const req = createPostRequest({
        client_id: 123,
        workouts: [
          {
            // Missing required fields
            workout_type: "Running",
          },
        ],
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("Validation error")
      expect(data.details).toBeDefined()
    })

    it("returns 500 on unexpected error", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Database connection failed")
      )

      const req = createPostRequest({
        client_id: 123,
        workouts: [validWorkout],
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({ error: "Internal server error" })
    })

    it("all responses include CORS headers", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.healthKitWorkout.findFirst.mockResolvedValue(null)
      mockPrisma.healthKitWorkout.create.mockResolvedValue({ id: "workout-1" })

      const req = createPostRequest({
        client_id: 123,
        workouts: [validWorkout],
      })

      const response = await POST(req)

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS")
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type")
    })
  })

  describe("OPTIONS", () => {
    it("returns 200 with CORS headers", async () => {
      const response = await OPTIONS()

      expect(response.status).toBe(200)
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS")
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type")
    })
  })
})
