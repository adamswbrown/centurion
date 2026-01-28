import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import { setupAuthMock, mockClientUser } from "../mocks/auth"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { getMyCohorts } from "@/app/actions/client-cohorts"

describe("getMyCohorts", () => {
  beforeEach(() => {
    setupAuthMock(mockClientUser)
  })

  it("returns user's cohort memberships with cohort data", async () => {
    const mockMemberships = [
      {
        id: 1,
        userId: 3,
        cohortId: 10,
        status: "ACTIVE",
        joinedAt: new Date("2025-03-01"),
        cohort: {
          id: 10,
          name: "Spring Wellness",
          status: "ACTIVE",
        },
      },
      {
        id: 2,
        userId: 3,
        cohortId: 20,
        status: "ACTIVE",
        joinedAt: new Date("2025-01-15"),
        cohort: {
          id: 20,
          name: "Winter Fitness",
          status: "COMPLETED",
        },
      },
    ]

    mockPrisma.cohortMembership.findMany.mockResolvedValue(mockMemberships)

    const result = await getMyCohorts()

    expect(result).toEqual(mockMemberships)
    expect(mockPrisma.cohortMembership.findMany).toHaveBeenCalledWith({
      where: { userId: 3 },
      include: { cohort: true },
      orderBy: { joinedAt: "desc" },
    })
  })

  it("returns empty array when no memberships", async () => {
    mockPrisma.cohortMembership.findMany.mockResolvedValue([])

    const result = await getMyCohorts()

    expect(result).toEqual([])
    expect(mockPrisma.cohortMembership.findMany).toHaveBeenCalledWith({
      where: { userId: 3 },
      include: { cohort: true },
      orderBy: { joinedAt: "desc" },
    })
  })

  it("orders by joinedAt desc", async () => {
    mockPrisma.cohortMembership.findMany.mockResolvedValue([])

    await getMyCohorts()

    expect(mockPrisma.cohortMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { joinedAt: "desc" },
      })
    )
  })

  it("throws when not authenticated", async () => {
    setupAuthMock(null)

    await expect(getMyCohorts()).rejects.toThrow("Must be logged in")
    expect(mockPrisma.cohortMembership.findMany).not.toHaveBeenCalled()
  })
})
