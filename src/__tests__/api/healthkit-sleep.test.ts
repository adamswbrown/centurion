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
  sleepRecord: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

// Import route handlers after mocks
import { POST, OPTIONS } from "@/app/api/healthkit/sleep/route"

// Helper to create mock request
function createPostRequest(body: unknown) {
  return { json: async () => body } as any
}

describe("/api/healthkit/sleep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST", () => {
    const validSleepRecord = {
      date: "2024-01-15",
      total_sleep_minutes: 480,
      in_bed_minutes: 510,
      deep_sleep_minutes: 120,
      rem_sleep_minutes: 90,
      core_sleep_minutes: 270,
      sleep_start: "2024-01-14T23:00:00Z",
      sleep_end: "2024-01-15T07:30:00Z",
      source_device: "Apple Watch",
    }

    it("returns 404 when client not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const req = createPostRequest({
        client_id: 999,
        sleep_records: [validSleepRecord],
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

    it("creates new sleep record", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.sleepRecord.findFirst.mockResolvedValue(null)
      mockPrisma.sleepRecord.create.mockResolvedValue({ id: "sleep-1" })

      const req = createPostRequest({
        client_id: 123,
        sleep_records: [validSleepRecord],
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

      expect(mockPrisma.sleepRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 123,
          totalSleep: 480,
          inBedTime: 510,
          deepSleep: 120,
          remSleep: 90,
          coreSleep: 270,
          sourceDevice: "Apple Watch",
        }),
      })
    })

    it("updates existing sleep record", async () => {
      const existingSleepRecord = {
        id: "sleep-existing",
        userId: 123,
        startTime: new Date("2024-01-14T23:00:00Z"),
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.sleepRecord.findFirst.mockResolvedValue(existingSleepRecord)
      mockPrisma.sleepRecord.update.mockResolvedValue(existingSleepRecord)

      const req = createPostRequest({
        client_id: 123,
        sleep_records: [validSleepRecord],
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toMatchObject({
        success: true,
        processed: 1,
        total: 1,
      })

      expect(mockPrisma.sleepRecord.update).toHaveBeenCalledWith({
        where: { id: "sleep-existing" },
        data: expect.objectContaining({
          totalSleep: 480,
          inBedTime: 510,
          deepSleep: 120,
          remSleep: 90,
          coreSleep: 270,
        }),
      })
    })

    it("handles sleep records with minimal fields", async () => {
      const minimalSleepRecord = {
        date: "2024-01-15",
        total_sleep_minutes: 420,
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.sleepRecord.findFirst.mockResolvedValue(null)
      mockPrisma.sleepRecord.create.mockResolvedValue({ id: "sleep-2" })

      const req = createPostRequest({
        client_id: 123,
        sleep_records: [minimalSleepRecord],
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.processed).toBe(1)

      expect(mockPrisma.sleepRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 123,
          totalSleep: 420,
          inBedTime: 420, // Defaults to total_sleep_minutes
          deepSleep: null,
          remSleep: null,
          coreSleep: null,
          sourceDevice: null,
        }),
      })
    })

    it("calculates end time from duration if not provided", async () => {
      const recordWithoutEnd = {
        date: "2024-01-15",
        total_sleep_minutes: 480,
        sleep_start: "2024-01-14T23:00:00Z",
        // No sleep_end provided
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.sleepRecord.findFirst.mockResolvedValue(null)
      mockPrisma.sleepRecord.create.mockResolvedValue({ id: "sleep-3" })

      const req = createPostRequest({
        client_id: 123,
        sleep_records: [recordWithoutEnd],
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockPrisma.sleepRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startTime: new Date("2024-01-14T23:00:00Z"),
          endTime: expect.any(Date),
        }),
      })

      // Verify endTime is calculated correctly (start + 480 minutes)
      const createCall = mockPrisma.sleepRecord.create.mock.calls[0][0]
      const startTime = createCall.data.startTime.getTime()
      const endTime = createCall.data.endTime.getTime()
      expect(endTime - startTime).toBe(480 * 60 * 1000) // 480 minutes in milliseconds
    })

    it("returns 207 on partial success", async () => {
      const record1 = { ...validSleepRecord }
      const record2 = {
        date: "2024-01-16",
        total_sleep_minutes: 450,
        sleep_start: "2024-01-15T23:30:00Z",
        sleep_end: "2024-01-16T07:00:00Z",
      }

      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.sleepRecord.findFirst.mockResolvedValue(null)
      mockPrisma.sleepRecord.create
        .mockResolvedValueOnce({ id: "sleep-1" })
        .mockRejectedValueOnce(new Error("Database constraint violation"))

      const req = createPostRequest({
        client_id: 123,
        sleep_records: [record1, record2],
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
        date: "2024-01-16",
        message: "Database constraint violation",
      })
    })

    it("returns 400 on validation error", async () => {
      const req = createPostRequest({
        client_id: 123,
        sleep_records: [
          {
            // Missing required field: total_sleep_minutes
            date: "2024-01-15",
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
        sleep_records: [validSleepRecord],
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({ error: "Internal server error" })
    })

    it("all responses include CORS headers", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 123 })
      mockPrisma.sleepRecord.findFirst.mockResolvedValue(null)
      mockPrisma.sleepRecord.create.mockResolvedValue({ id: "sleep-1" })

      const req = createPostRequest({
        client_id: 123,
        sleep_records: [validSleepRecord],
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
