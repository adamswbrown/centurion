import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/admin/healthkit/generate-code/route"

// Hoisted mock variables
const mockAuth = vi.hoisted(() => vi.fn())
const mockCreatePairingCode = vi.hoisted(() => vi.fn())
const mockRegeneratePairingCode = vi.hoisted(() => vi.fn())

// Mock auth with factory to prevent next-auth importing next/server
vi.mock("@/auth", () => ({ auth: mockAuth }))

// Mock pairing functions
vi.mock("@/lib/healthkit/pairing", () => ({
  createPairingCode: mockCreatePairingCode,
  regeneratePairingCode: mockRegeneratePairingCode,
}))

// Mock next/server with working NextResponse
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
  return { NextRequest: vi.fn(), NextResponse: MockNextResponse }
})

// Helper to create mock requests
function createPostRequest(body: unknown) {
  return { json: async () => body } as any
}

describe("POST /api/admin/healthkit/generate-code", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = createPostRequest({ clientId: 1 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("returns 403 for CLIENT role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "CLIENT" },
    })
    const req = createPostRequest({ clientId: 1 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  it("generates new pairing code for ADMIN", async () => {
    const mockResult = {
      code: "ABC123",
      expiresAt: new Date("2026-01-29T00:00:00Z"),
      user: { id: 2, email: "client@example.com" },
    }
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    mockCreatePairingCode.mockResolvedValue(mockResult)
    const req = createPostRequest({ clientId: 2 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePairingCode).toHaveBeenCalledWith(1, 2)
    expect(mockRegeneratePairingCode).not.toHaveBeenCalled()
    expect(data).toEqual({
      code: "ABC123",
      expiresAt: mockResult.expiresAt,
      client: { id: 2, email: "client@example.com" },
    })
  })

  it("generates new pairing code for COACH", async () => {
    const mockResult = {
      code: "XYZ789",
      expiresAt: new Date("2026-01-29T00:00:00Z"),
      user: { id: 3, email: "client2@example.com" },
    }
    mockAuth.mockResolvedValue({
      user: { id: "5", role: "COACH" },
    })
    mockCreatePairingCode.mockResolvedValue(mockResult)
    const req = createPostRequest({ clientId: 3 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePairingCode).toHaveBeenCalledWith(5, 3)
    expect(mockRegeneratePairingCode).not.toHaveBeenCalled()
    expect(data).toEqual({
      code: "XYZ789",
      expiresAt: mockResult.expiresAt,
      client: { id: 3, email: "client2@example.com" },
    })
  })

  it("regenerates pairing code when regenerate=true", async () => {
    const mockResult = {
      code: "NEW123",
      expiresAt: new Date("2026-01-29T00:00:00Z"),
      user: { id: 4, email: "client3@example.com" },
    }
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    mockRegeneratePairingCode.mockResolvedValue(mockResult)
    const req = createPostRequest({ clientId: 4, regenerate: true })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockRegeneratePairingCode).toHaveBeenCalledWith(1, 4)
    expect(mockCreatePairingCode).not.toHaveBeenCalled()
    expect(data).toEqual({
      code: "NEW123",
      expiresAt: mockResult.expiresAt,
      client: { id: 4, email: "client3@example.com" },
    })
  })

  it("returns 400 on validation error (missing clientId)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    const req = createPostRequest({})

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation error")
    expect(data.details).toBeDefined()
  })

  it("returns 400 on validation error (invalid clientId type)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    const req = createPostRequest({ clientId: "not-a-number" })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation error")
    expect(data.details).toBeDefined()
  })

  it("returns 400 on validation error (negative clientId)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    const req = createPostRequest({ clientId: -1 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation error")
    expect(data.details).toBeDefined()
  })

  it("returns 500 on unexpected error from createPairingCode", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    mockCreatePairingCode.mockRejectedValue(new Error("Database error"))
    const req = createPostRequest({ clientId: 1 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Database error" })
  })

  it("returns 500 on unexpected error from regeneratePairingCode", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    })
    mockRegeneratePairingCode.mockRejectedValue(new Error("Network error"))
    const req = createPostRequest({ clientId: 1, regenerate: true })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Network error" })
  })
})
