/**
 * Tests for POST /api/healthkit/steps
 * Validates step data ingestion from iOS HealthKit
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/healthkit/steps/route"
import { PaymentStatus } from "@prisma/client"

// Mock prisma
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  entry: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}))

// Mock next/server with proper NextResponse implementation
vi.mock("next/server", () => {
  class MockHeaders {
    private map = new Map<string, string>()
    set(key: string, value: string) {
      this.map.set(key, value)
    }
    get(key: string) {
      return this.map.get(key) ?? null
    }
  }

  class MockNextResponse {
    _data: unknown
    status: number
    headers: MockHeaders

    constructor(body: unknown, init?: { status?: number }) {
      this._data = body
      this.status = init?.status ?? 200
      this.headers = new MockHeaders()
    }

    async json() {
      return this._data
    }

    static json(data: unknown, init?: { status?: number }) {
      const resp = new MockNextResponse(data, init)
      resp._data = data
      return resp
    }
  }

  return {
    NextRequest: vi.fn(),
    NextResponse: MockNextResponse,
  }
})

// Helper to create mock POST request
function createPostRequest(body: unknown) {
  return {
    json: async () => body,
  } as any
}

describe("POST /api/healthkit/steps", () => {
  const validClientId = 123
  const testDate = "2025-01-15"
  const testSteps = 8500

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Client validation", () => {
    it("returns 404 when client not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: "Client not found" })
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: validClientId },
        select: { id: true },
      })
    })

    it("proceeds when client exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: validClientId })
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.entry.upsert.mockResolvedValue({})

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.user.findUnique).toHaveBeenCalled()
    })
  })

  describe("Entry creation and updates", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: validClientId })
    })

    it("creates new entry with healthkit steps when no existing entry", async () => {
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.entry.upsert.mockResolvedValue({})

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        processed: 1,
        total: 1,
      })

      const expectedDate = new Date(testDate)
      expectedDate.setHours(0, 0, 0, 0)

      expect(mockPrisma.entry.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: validClientId,
            date: expectedDate,
          },
        },
        update: {
          steps: testSteps,
          dataSources: {
            steps: "healthkit",
          },
        },
        create: {
          userId: validClientId,
          date: expectedDate,
          steps: testSteps,
          dataSources: {
            steps: "healthkit",
          },
        },
      })
    })

    it("updates existing entry without manual data", async () => {
      mockPrisma.entry.findUnique.mockResolvedValue({
        steps: 5000,
        dataSources: { steps: "healthkit" },
      })
      mockPrisma.entry.upsert.mockResolvedValue({})

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        processed: 1,
        total: 1,
      })

      const expectedDate = new Date(testDate)
      expectedDate.setHours(0, 0, 0, 0)

      expect(mockPrisma.entry.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: validClientId,
            date: expectedDate,
          },
        },
        update: {
          steps: testSteps,
          dataSources: {
            steps: "healthkit",
          },
        },
        create: {
          userId: validClientId,
          date: expectedDate,
          steps: testSteps,
          dataSources: {
            steps: "healthkit",
          },
        },
      })
    })

    it("preserves manual steps data when present", async () => {
      mockPrisma.entry.findUnique.mockResolvedValue({
        steps: 7000,
        dataSources: { steps: "manual" },
      })
      mockPrisma.entry.upsert.mockResolvedValue({})

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        processed: 1,
        total: 1,
      })

      const expectedDate = new Date(testDate)
      expectedDate.setHours(0, 0, 0, 0)

      expect(mockPrisma.entry.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: validClientId,
            date: expectedDate,
          },
        },
        update: {
          dataSources: {
            steps: "manual",
            healthkit_steps: "healthkit",
          },
        },
        create: {
          userId: validClientId,
          date: expectedDate,
          steps: testSteps,
          dataSources: {
            steps: "healthkit",
          },
        },
      })

      // Verify manual steps value was NOT overwritten
      const updateCall = mockPrisma.entry.upsert.mock.calls[0][0]
      expect(updateCall.update).not.toHaveProperty("steps")
    })
  })

  describe("Batch processing", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: validClientId })
    })

    it("processes multiple step records successfully", async () => {
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.entry.upsert.mockResolvedValue({})

      const request = createPostRequest({
        client_id: validClientId,
        steps: [
          { date: "2025-01-15", total_steps: 8500 },
          { date: "2025-01-16", total_steps: 9200 },
          { date: "2025-01-17", total_steps: 7800 },
        ],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        processed: 3,
        total: 3,
      })
      expect(mockPrisma.entry.upsert).toHaveBeenCalledTimes(3)
    })

    it("returns 207 on partial success", async () => {
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.entry.upsert
        .mockResolvedValueOnce({}) // First succeeds
        .mockRejectedValueOnce(new Error("Database error")) // Second fails
        .mockResolvedValueOnce({}) // Third succeeds

      const request = createPostRequest({
        client_id: validClientId,
        steps: [
          { date: "2025-01-15", total_steps: 8500 },
          { date: "2025-01-16", total_steps: 9200 },
          { date: "2025-01-17", total_steps: 7800 },
        ],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data).toMatchObject({
        success: true,
        processed: 2,
        total: 3,
      })
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0]).toEqual({
        date: "2025-01-16",
        message: "Database error",
      })
    })
  })

  describe("Validation", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: validClientId })
    })

    it("returns 400 on validation error", async () => {
      const request = createPostRequest({
        client_id: "not-a-number",
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty("error", "Validation error")
      expect(data).toHaveProperty("details")
    })

    it("validates date format (YYYY-MM-DD required)", async () => {
      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: "01/15/2025", total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Validation error")
    })

    it("validates total_steps is non-negative", async () => {
      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: -100 }],
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("validates total_steps max value", async () => {
      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: 300000 }],
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe("CORS headers", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: validClientId })
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.entry.upsert.mockResolvedValue({})
    })

    it("includes CORS headers on success", async () => {
      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS")
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type")
    })

    it("includes CORS headers on error", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    })
  })

  describe("Error handling", () => {
    it("returns 500 on unexpected error", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database connection failed"))

      const request = createPostRequest({
        client_id: validClientId,
        steps: [{ date: testDate, total_steps: testSteps }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Internal server error" })
    })
  })
})
