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

// Mock pairing code validation
const mockValidateAndUsePairingCode = vi.hoisted(() => vi.fn())
vi.mock("@/lib/healthkit/pairing", () => ({
  validateAndUsePairingCode: mockValidateAndUsePairingCode,
}))

// Import route handlers after mocks
import { POST, OPTIONS } from "@/app/api/healthkit/pair/route"

// Helper to create mock request
function createPostRequest(body: unknown) {
  return { json: async () => body } as any
}

describe("/api/healthkit/pair", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST", () => {
    it("successfully pairs with valid code", async () => {
      const mockUser = { id: "user-123", name: "Test User" }
      mockValidateAndUsePairingCode.mockResolvedValue({
        success: true,
        userId: "user-123",
        pairingCode: { user: mockUser },
      })

      const req = createPostRequest({ code: "ABC123" })
      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toMatchObject({
        success: true,
        message: "Successfully paired",
        client_id: "user-123",
        client: mockUser,
      })
      expect(data.paired_at).toBeDefined()
      expect(mockValidateAndUsePairingCode).toHaveBeenCalledWith("ABC123")
    })

    it("returns 400 for invalid pairing code result", async () => {
      mockValidateAndUsePairingCode.mockResolvedValue({
        success: false,
        error: "Invalid or expired pairing code",
      })

      const req = createPostRequest({ code: "INVLD1" })
      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({
        error: "Invalid or expired pairing code",
      })
    })

    it("returns 400 for invalid request body (Zod validation)", async () => {
      const req = createPostRequest({ code: "AB" }) // Too short (needs 6 chars)
      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("Validation error")
      expect(data.details).toBeDefined()
    })

    it("returns 400 for missing code field", async () => {
      const req = createPostRequest({})
      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("Validation error")
    })

    it("returns 500 on unexpected error", async () => {
      mockValidateAndUsePairingCode.mockRejectedValue(
        new Error("Database connection failed")
      )

      const req = createPostRequest({ code: "ABC123" })
      const response = await POST(req)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({ error: "Internal server error" })
    })

    it("all responses include CORS headers", async () => {
      mockValidateAndUsePairingCode.mockResolvedValue({
        success: true,
        userId: "user-123",
        pairingCode: { user: { id: "user-123" } },
      })

      const req = createPostRequest({ code: "ABC123" })
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
