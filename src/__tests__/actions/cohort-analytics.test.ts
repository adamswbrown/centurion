import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockCoachUser,
  mockAdminUser,
  mockClientUser,
} from "../mocks/auth"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { getCohortCheckInAnalytics } from "@/app/actions/cohort-analytics"

// Helper to create a membership with included user
function makeMembership(userId: number, name: string, email: string) {
  return {
    id: userId,
    cohortId: 1,
    userId,
    status: "ACTIVE",
    user: { id: userId, name, email },
  }
}

describe("getCohortCheckInAnalytics", () => {
  beforeEach(() => {
    setupAuthMock(mockCoachUser)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns analytics for cohort members", async () => {
    const memberships = [
      makeMembership(10, "Alice", "alice@test.com"),
      makeMembership(11, "Bob", "bob@test.com"),
    ]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)
    mockPrisma.entry.findMany.mockResolvedValue([])

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      memberId: 10,
      name: "Alice",
      email: "alice@test.com",
      status: "ACTIVE",
      totalCheckIns: 0,
      currentStreak: 0,
      lastCheckIn: null,
    })
    expect(result[1]).toMatchObject({
      memberId: 11,
      name: "Bob",
      email: "bob@test.com",
    })
  })

  it("returns empty array when no active members", async () => {
    mockPrisma.cohortMembership.findMany.mockResolvedValue([])

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result).toEqual([])
    expect(mockPrisma.entry.findMany).not.toHaveBeenCalled()
  })

  it("calculates totalCheckIns correctly", async () => {
    const memberships = [makeMembership(10, "Alice", "alice@test.com")]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)

    const entries = [
      { date: new Date("2025-01-05") },
      { date: new Date("2025-01-03") },
      { date: new Date("2025-01-01") },
    ]
    mockPrisma.entry.findMany.mockResolvedValue(entries)

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result[0].totalCheckIns).toBe(3)
    expect(result[0].lastCheckIn).toEqual(new Date("2025-01-05"))
  })

  it("calculates streak for consecutive days from today", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-10T12:00:00Z"))

    const memberships = [makeMembership(10, "Alice", "alice@test.com")]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)

    // Entries for today, yesterday, and day before (3-day streak)
    const entries = [
      { date: new Date("2025-06-10T08:00:00Z") },
      { date: new Date("2025-06-09T08:00:00Z") },
      { date: new Date("2025-06-08T08:00:00Z") },
    ]
    mockPrisma.entry.findMany.mockResolvedValue(entries)

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result[0].currentStreak).toBe(3)
  })

  it("streak breaks on gap", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-10T12:00:00Z"))

    const memberships = [makeMembership(10, "Alice", "alice@test.com")]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)

    // Today + 2 days ago (gap on yesterday)
    const entries = [
      { date: new Date("2025-06-10T08:00:00Z") },
      { date: new Date("2025-06-08T08:00:00Z") },
    ]
    mockPrisma.entry.findMany.mockResolvedValue(entries)

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result[0].currentStreak).toBe(1)
  })

  it("streak is 0 if no entry today", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-10T12:00:00Z"))

    const memberships = [makeMembership(10, "Alice", "alice@test.com")]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)

    // Only yesterday and day before -- no today entry
    const entries = [
      { date: new Date("2025-06-09T08:00:00Z") },
      { date: new Date("2025-06-08T08:00:00Z") },
    ]
    mockPrisma.entry.findMany.mockResolvedValue(entries)

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result[0].currentStreak).toBe(0)
  })

  it("filters by date range (from/to)", async () => {
    const memberships = [makeMembership(10, "Alice", "alice@test.com")]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)
    mockPrisma.entry.findMany.mockResolvedValue([])

    const from = new Date("2025-01-01")
    const to = new Date("2025-01-31")

    await getCohortCheckInAnalytics({ cohortId: 1, from, to })

    expect(mockPrisma.entry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 10,
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    )
  })

  it("admin can access", async () => {
    setupAuthMock(mockAdminUser)

    const memberships = [makeMembership(10, "Alice", "alice@test.com")]
    mockPrisma.cohortMembership.findMany.mockResolvedValue(memberships)
    mockPrisma.entry.findMany.mockResolvedValue([])

    const result = await getCohortCheckInAnalytics({ cohortId: 1 })

    expect(result).toHaveLength(1)
  })

  it("client cannot access", async () => {
    setupAuthMock(mockClientUser)

    await expect(
      getCohortCheckInAnalytics({ cohortId: 1 })
    ).rejects.toThrow("Forbidden")
  })

  it("unauthenticated throws", async () => {
    setupAuthMock(null)

    await expect(
      getCohortCheckInAnalytics({ cohortId: 1 })
    ).rejects.toThrow("Forbidden")
  })
})
