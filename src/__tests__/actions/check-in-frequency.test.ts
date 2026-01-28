import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
} from "../mocks/auth"

vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("@/lib/auth")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

let getEffectiveCheckInFrequency: typeof import("@/app/actions/check-in-frequency").getEffectiveCheckInFrequency
let updateCohortCheckInFrequency: typeof import("@/app/actions/check-in-frequency").updateCohortCheckInFrequency
let updateUserCheckInFrequency: typeof import("@/app/actions/check-in-frequency").updateUserCheckInFrequency
let getCheckInFrequencyConfig: typeof import("@/app/actions/check-in-frequency").getCheckInFrequencyConfig

beforeEach(async () => {
  vi.resetModules()
  const mod = await import("@/app/actions/check-in-frequency")
  getEffectiveCheckInFrequency = mod.getEffectiveCheckInFrequency
  updateCohortCheckInFrequency = mod.updateCohortCheckInFrequency
  updateUserCheckInFrequency = mod.updateUserCheckInFrequency
  getCheckInFrequencyConfig = mod.getCheckInFrequencyConfig
})

// ---------------------------------------------------------------------------
// getEffectiveCheckInFrequency
// ---------------------------------------------------------------------------
describe("getEffectiveCheckInFrequency", () => {
  it("returns user override when set", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: 3,
    })

    const result = await getEffectiveCheckInFrequency(10)

    expect(result).toBe(3)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } })
    )
  })

  it("returns cohort override when user has no override", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: null,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue({
      cohort: { checkInFrequencyDays: 5 },
    })

    const result = await getEffectiveCheckInFrequency(10)

    expect(result).toBe(5)
  })

  it("returns system setting when no overrides exist", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: null,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue(null)
    mockPrisma.systemSettings.findUnique.mockResolvedValue({
      key: "defaultCheckInFrequencyDays",
      value: "14",
    })

    const result = await getEffectiveCheckInFrequency(10)

    expect(result).toBe(14)
  })

  it("returns default 7 when no settings exist at all", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: null,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue(null)
    mockPrisma.systemSettings.findUnique.mockResolvedValue(null)

    const result = await getEffectiveCheckInFrequency(10)

    expect(result).toBe(7)
  })

  it("requires authentication", async () => {
    setupAuthMock(null)

    await expect(getEffectiveCheckInFrequency(10)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// updateCohortCheckInFrequency
// ---------------------------------------------------------------------------
describe("updateCohortCheckInFrequency", () => {
  it("updates cohort frequency", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.cohort.update.mockResolvedValue({
      id: 1,
      checkInFrequencyDays: 14,
    })

    await updateCohortCheckInFrequency(1, 14)

    expect(mockPrisma.cohort.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { checkInFrequencyDays: 14 },
      })
    )
  })

  it("clears override with null", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.cohort.update.mockResolvedValue({
      id: 1,
      checkInFrequencyDays: null,
    })

    await updateCohortCheckInFrequency(1, null)

    expect(mockPrisma.cohort.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { checkInFrequencyDays: null },
      })
    )
  })

  it("rejects frequency less than 1", async () => {
    setupAuthMock(mockCoachUser)

    const result = await updateCohortCheckInFrequency(1, 0)
    expect(result).toHaveProperty("error")
  })

  it("rejects frequency greater than 90", async () => {
    setupAuthMock(mockCoachUser)

    const result = await updateCohortCheckInFrequency(1, 91)
    expect(result).toHaveProperty("error")
  })

  it("requires coach role", async () => {
    setupAuthMock(mockClientUser)

    await expect(updateCohortCheckInFrequency(1, 7)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// updateUserCheckInFrequency
// ---------------------------------------------------------------------------
describe("updateUserCheckInFrequency", () => {
  it("updates user frequency", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.update.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: 3,
    })

    await updateUserCheckInFrequency(10, 3)

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { checkInFrequencyDays: 3 },
      })
    )
  })

  it("clears override with null", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.update.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: null,
    })

    await updateUserCheckInFrequency(10, null)

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { checkInFrequencyDays: null },
      })
    )
  })

  it("rejects frequency less than 1", async () => {
    setupAuthMock(mockCoachUser)

    const result = await updateUserCheckInFrequency(10, 0)
    expect(result).toHaveProperty("error")
  })

  it("rejects frequency greater than 90", async () => {
    setupAuthMock(mockCoachUser)

    const result = await updateUserCheckInFrequency(10, 91)
    expect(result).toHaveProperty("error")
  })

  it("requires coach role", async () => {
    setupAuthMock(mockClientUser)

    await expect(updateUserCheckInFrequency(10, 7)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getCheckInFrequencyConfig
// ---------------------------------------------------------------------------
describe("getCheckInFrequencyConfig", () => {
  it("returns all 3 levels and effective value", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: 2,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue({
      cohort: { checkInFrequencyDays: 5 },
    })
    mockPrisma.systemSettings.findUnique.mockResolvedValue({
      key: "defaultCheckInFrequencyDays",
      value: "14",
    })

    const result = await getCheckInFrequencyConfig(10)

    expect(result).toEqual(
      expect.objectContaining({
        userOverride: 2,
        cohortOverride: 5,
        systemDefault: 14,
        effective: 2,
      })
    )
  })

  it("effective uses user override when present", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: 3,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue({
      cohort: { checkInFrequencyDays: 10 },
    })
    mockPrisma.systemSettings.findUnique.mockResolvedValue({
      key: "defaultCheckInFrequencyDays",
      value: "7",
    })

    const result = await getCheckInFrequencyConfig(10)

    expect(result.effective).toBe(3)
  })

  it("effective uses cohort override when no user override", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: null,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue({
      cohort: { checkInFrequencyDays: 10 },
    })
    mockPrisma.systemSettings.findUnique.mockResolvedValue({
      key: "defaultCheckInFrequencyDays",
      value: "7",
    })

    const result = await getCheckInFrequencyConfig(10)

    expect(result.effective).toBe(10)
  })

  it("effective uses system default when no overrides", async () => {
    setupAuthMock(mockCoachUser)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      checkInFrequencyDays: null,
    })
    mockPrisma.cohortMembership.findFirst.mockResolvedValue(null)
    mockPrisma.systemSettings.findUnique.mockResolvedValue({
      key: "defaultCheckInFrequencyDays",
      value: "21",
    })

    const result = await getCheckInFrequencyConfig(10)

    expect(result.effective).toBe(21)
  })

  it("requires authentication", async () => {
    setupAuthMock(null)

    await expect(getCheckInFrequencyConfig(10)).rejects.toThrow()
  })
})
