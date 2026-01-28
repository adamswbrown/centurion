import { describe, it, expect, vi, beforeEach } from "vitest"

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}))

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
    redirect: vi.fn(),
  },
}))

import { GET } from "@/app/api/health/route"

describe("Health Check API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.npm_package_version
  })

  it("returns healthy status when DB is connected", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe("healthy")
    expect(data.database).toBe("connected")
    expect(data.timestamp).toBeDefined()
    expect(typeof data.uptime).toBe("number")
    expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce()
  })

  it("returns degraded status when DB query fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("DB connection failed"))

    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe("degraded")
    expect(data.database).toBe("disconnected")
    expect(data.timestamp).toBeDefined()
    expect(typeof data.uptime).toBe("number")
  })

  it("includes timestamp, uptime, database status, and version fields", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data).toHaveProperty("status")
    expect(data).toHaveProperty("timestamp")
    expect(data).toHaveProperty("uptime")
    expect(data).toHaveProperty("database")
    expect(data).toHaveProperty("version")
  })

  it("returns version from env or default '0.1.0'", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }])

    // Test default version
    const response1 = await GET()
    const data1 = await response1.json()
    expect(data1.version).toBe("0.1.0")

    // Test env version
    process.env.npm_package_version = "1.2.3"
    const response2 = await GET()
    const data2 = await response2.json()
    expect(data2.version).toBe("1.2.3")
  })

  it("calculates uptime in seconds", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data.uptime).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(data.uptime)).toBe(true)
  })
})
