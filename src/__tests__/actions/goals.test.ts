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

const mockGoalsData = {
  id: 1,
  userId: Number.parseInt(mockClientUser.id, 10),
  currentWeightKg: 80,
  targetWeightKg: 75,
  heightCm: 180,
  dailyCaloriesKcal: 2200,
  proteinGrams: 150,
  carbGrams: 250,
  fatGrams: 70,
  waterIntakeMl: 3000,
  dailyStepsTarget: 10000,
  weeklyWorkoutMinutes: 150,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("Goals Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getUserGoals", () => {
    it("returns own goals when no userId param is provided", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userGoals.findUnique.mockResolvedValue(mockGoalsData)

      const { getUserGoals } = await import("@/app/actions/goals")
      const result = await getUserGoals()

      expect(mockPrisma.userGoals.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: Number.parseInt(mockClientUser.id, 10) },
        })
      )
      expect(result).toEqual(mockGoalsData)
    })

    it("returns own goals when own userId is provided", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userGoals.findUnique.mockResolvedValue(mockGoalsData)

      const { getUserGoals } = await import("@/app/actions/goals")
      const userId = Number.parseInt(mockClientUser.id, 10)
      const result = await getUserGoals(userId)

      expect(mockPrisma.userGoals.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: Number.parseInt(mockClientUser.id, 10) },
        })
      )
      expect(result).toEqual(mockGoalsData)
    })

    it("allows coach to view other user's goals", async () => {
      setupAuthMock(mockCoachUser)
      const clientId = Number.parseInt(mockClientUser.id, 10)
      const otherUserGoals = { ...mockGoalsData, userId: clientId }
      mockPrisma.userGoals.findUnique.mockResolvedValue(otherUserGoals)

      const { getUserGoals } = await import("@/app/actions/goals")
      const result = await getUserGoals(clientId)

      expect(mockPrisma.userGoals.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: clientId },
        })
      )
      expect(result).toEqual(otherUserGoals)
    })

    it("allows admin to view other user's goals", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.userGoals.findUnique.mockResolvedValue(mockGoalsData)

      const { getUserGoals } = await import("@/app/actions/goals")
      const result = await getUserGoals(Number.parseInt(mockClientUser.id, 10))

      expect(result).toEqual(mockGoalsData)
    })

    it("prevents client from viewing other user's goals", async () => {
      setupAuthMock(mockClientUser)

      const { getUserGoals } = await import("@/app/actions/goals")

      await expect(getUserGoals(999)).rejects.toThrow()
    })

    it("returns null when no goals exist", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userGoals.findUnique.mockResolvedValue(null)

      const { getUserGoals } = await import("@/app/actions/goals")
      const result = await getUserGoals()

      expect(result).toBeNull()
    })

    it("rejects unauthenticated user", async () => {
      setupAuthMock(null)

      const { getUserGoals } = await import("@/app/actions/goals")

      await expect(getUserGoals()).rejects.toThrow()
    })
  })

  describe("upsertUserGoals", () => {
    it("creates goals with all fields", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        currentWeightKg: 80,
        targetWeightKg: 75,
        heightCm: 180,
        dailyCaloriesKcal: 2200,
        proteinGrams: 150,
        carbGrams: 250,
        fatGrams: 70,
        waterIntakeMl: 3000,
        dailyStepsTarget: 10000,
        weeklyWorkoutMinutes: 150,
      }
      const userId = Number.parseInt(mockClientUser.id, 10)
      mockPrisma.userGoals.upsert.mockResolvedValue({
        id: 1,
        userId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals(input)

      expect(mockPrisma.userGoals.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        })
      )
      expect(result).toMatchObject({ success: true })
    })

    it("creates goals with partial fields", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        currentWeightKg: 80,
        targetWeightKg: 75,
      }
      const userId = Number.parseInt(mockClientUser.id, 10)
      mockPrisma.userGoals.upsert.mockResolvedValue({
        id: 1,
        userId,
        ...input,
        heightCm: null,
        dailyCaloriesKcal: null,
        proteinGrams: null,
        carbGrams: null,
        fatGrams: null,
        waterIntakeMl: null,
        dailyStepsTarget: null,
        weeklyWorkoutMinutes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals(input)

      expect(mockPrisma.userGoals.upsert).toHaveBeenCalled()
      expect(result).toMatchObject({ success: true })
    })

    it("updates existing goals", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        currentWeightKg: 78,
        dailyCaloriesKcal: 2400,
      }
      const userId = Number.parseInt(mockClientUser.id, 10)
      mockPrisma.userGoals.upsert.mockResolvedValue({
        id: 1,
        userId,
        currentWeightKg: 78,
        targetWeightKg: 75,
        heightCm: 180,
        dailyCaloriesKcal: 2400,
        proteinGrams: 150,
        carbGrams: 250,
        fatGrams: 70,
        waterIntakeMl: 3000,
        dailyStepsTarget: 10000,
        weeklyWorkoutMinutes: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals(input)

      expect(mockPrisma.userGoals.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        })
      )
      expect(result).toMatchObject({ success: true })
    })

    it("returns error on invalid input with negative number", async () => {
      setupAuthMock(mockClientUser)

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals({
        currentWeightKg: -10,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.userGoals.upsert).not.toHaveBeenCalled()
    })

    it("returns error on non-numeric input", async () => {
      setupAuthMock(mockClientUser)

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals({
        currentWeightKg: "not a number" as unknown as number,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.userGoals.upsert).not.toHaveBeenCalled()
    })

    it("sets null for undefined optional fields on create", async () => {
      setupAuthMock(mockClientUser)
      const input = {
        currentWeightKg: 80,
      }
      const userId = Number.parseInt(mockClientUser.id, 10)
      mockPrisma.userGoals.upsert.mockResolvedValue({
        id: 1,
        userId,
        currentWeightKg: 80,
        targetWeightKg: null,
        heightCm: null,
        dailyCaloriesKcal: null,
        proteinGrams: null,
        carbGrams: null,
        fatGrams: null,
        waterIntakeMl: null,
        dailyStepsTarget: null,
        weeklyWorkoutMinutes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals(input)

      expect(result).toMatchObject({ success: true })
      expect((result as { goals: { targetWeightKg: null } }).goals.targetWeightKg).toBeNull()
    })

    it("rejects unauthenticated user", async () => {
      setupAuthMock(null)

      const { upsertUserGoals } = await import("@/app/actions/goals")

      await expect(
        upsertUserGoals({ currentWeightKg: 80 })
      ).rejects.toThrow()
    })

    it("returns error on zero value for weight fields", async () => {
      setupAuthMock(mockClientUser)

      const { upsertUserGoals } = await import("@/app/actions/goals")
      const result = await upsertUserGoals({
        currentWeightKg: 0,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.userGoals.upsert).not.toHaveBeenCalled()
    })
  })
})
