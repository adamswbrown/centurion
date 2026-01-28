import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  mockAuth,
} from "../mocks/auth"

vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("@/lib/auth")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { getFitnessWrapped } from "@/app/actions/fitness-wrapped"

const makeEntry = (overrides: Record<string, any> = {}) => ({
  id: 1,
  userId: 1,
  date: new Date("2025-03-15"),
  steps: 8000,
  calories: 300,
  sleepQuality: 7,
  weight: 80,
  mood: null,
  notes: null,
  createdAt: new Date("2025-03-15"),
  updatedAt: new Date("2025-03-15"),
  ...overrides,
})

const makeWorkout = (overrides: Record<string, any> = {}) => ({
  id: 1,
  userId: 1,
  status: "COMPLETED",
  name: "Morning Run",
  createdAt: new Date("2025-03-15"),
  updatedAt: new Date("2025-03-15"),
  ...overrides,
})

const makeHealthKitWorkout = (overrides: Record<string, any> = {}) => ({
  id: 1,
  userId: 1,
  duration: 3600,
  startTime: new Date("2025-03-15"),
  endTime: new Date("2025-03-15T01:00:00"),
  type: "Running",
  calories: 400,
  createdAt: new Date("2025-03-15"),
  ...overrides,
})

function setupPrismaMocks({
  entries = [] as any[],
  workouts = [] as any[],
  healthKitWorkouts = [] as any[],
} = {}) {
  mockPrisma.entry.findMany.mockResolvedValue(entries)
  mockPrisma.workout.findMany.mockResolvedValue(workouts)
  mockPrisma.healthKitWorkout.findMany.mockResolvedValue(healthKitWorkouts)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "1" } })
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - auth", () => {
  it("throws unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null)

    await expect(getFitnessWrapped(2025)).rejects.toThrow("Unauthorized")
  })
})

// ---------------------------------------------------------------------------
// Basic
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - basic", () => {
  it("returns stats for year with entries", async () => {
    setupPrismaMocks({
      entries: [makeEntry(), makeEntry({ id: 2, date: new Date("2025-04-10") })],
      workouts: [makeWorkout()],
      healthKitWorkouts: [makeHealthKitWorkout()],
    })

    const result = await getFitnessWrapped(2025)

    expect(result).toBeDefined()
    expect(result.totalCheckIns).toBe(2)
    expect(result.totalWorkouts).toBe(1)
  })

  it("returns empty stats when no data", async () => {
    setupPrismaMocks()

    const result = await getFitnessWrapped(2025)

    expect(result.totalCheckIns).toBe(0)
    expect(result.totalWorkouts).toBe(0)
    expect(result.totalSteps).toBe(0)
    expect(result.totalCaloriesBurned).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Calculations
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - calculations", () => {
  it("totalCheckIns equals entries length", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1 }),
        makeEntry({ id: 2, date: new Date("2025-04-01") }),
        makeEntry({ id: 3, date: new Date("2025-05-01") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.totalCheckIns).toBe(3)
  })

  it("totalWorkouts equals workouts length", async () => {
    setupPrismaMocks({
      workouts: [
        makeWorkout({ id: 1 }),
        makeWorkout({ id: 2, status: "NOT_STARTED" }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.totalWorkouts).toBe(2)
  })

  it("workoutsCompleted filters COMPLETED status", async () => {
    setupPrismaMocks({
      workouts: [
        makeWorkout({ id: 1, status: "COMPLETED" }),
        makeWorkout({ id: 2, status: "NOT_STARTED" }),
        makeWorkout({ id: 3, status: "COMPLETED" }),
        makeWorkout({ id: 4, status: "IN_PROGRESS" }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.workoutsCompleted).toBe(2)
  })

  it("totalSteps sums entry steps", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, steps: 8000 }),
        makeEntry({ id: 2, steps: 12000, date: new Date("2025-04-01") }),
        makeEntry({ id: 3, steps: 5000, date: new Date("2025-05-01") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.totalSteps).toBe(25000)
  })

  it("totalCaloriesBurned sums entry calories", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, calories: 300 }),
        makeEntry({ id: 2, calories: 450, date: new Date("2025-04-01") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.totalCaloriesBurned).toBe(750)
  })
})

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - sleep", () => {
  it("averageSleepQuality averages non-null values", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, sleepQuality: 6 }),
        makeEntry({ id: 2, sleepQuality: 8, date: new Date("2025-04-01") }),
        makeEntry({ id: 3, sleepQuality: null, date: new Date("2025-05-01") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.averageSleepQuality).toBe(7)
  })

  it("averageSleepQuality is null when no sleep data", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, sleepQuality: null }),
        makeEntry({ id: 2, sleepQuality: null, date: new Date("2025-04-01") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.averageSleepQuality).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - weight", () => {
  it("calculates averageWeight from entries", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, weight: 80, date: new Date("2025-01-15") }),
        makeEntry({ id: 2, weight: 78, date: new Date("2025-06-15") }),
        makeEntry({ id: 3, weight: 76, date: new Date("2025-12-15") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.averageWeight).toBeCloseTo(78, 0)
  })

  it("calculates weightChange as last minus first", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, weight: 80, date: new Date("2025-01-15") }),
        makeEntry({ id: 2, weight: 78, date: new Date("2025-06-15") }),
        makeEntry({ id: 3, weight: 75, date: new Date("2025-12-15") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.weightChange).toBe(-5)
  })

  it("averageWeight is null when no weight data", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, weight: null }),
        makeEntry({ id: 2, weight: null, date: new Date("2025-04-01") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.averageWeight).toBeNull()
  })

  it("weightChange is null with single weight entry", async () => {
    setupPrismaMocks({
      entries: [makeEntry({ id: 1, weight: 80 })],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.weightChange).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - streak", () => {
  it("calculates longestStreak for consecutive days", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, date: new Date("2025-03-01") }),
        makeEntry({ id: 2, date: new Date("2025-03-02") }),
        makeEntry({ id: 3, date: new Date("2025-03-03") }),
        makeEntry({ id: 4, date: new Date("2025-03-05") }),
        makeEntry({ id: 5, date: new Date("2025-03-06") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.longestStreak).toBe(3)
  })

  it("streak resets on gaps", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, date: new Date("2025-01-01") }),
        makeEntry({ id: 2, date: new Date("2025-01-03") }),
        makeEntry({ id: 3, date: new Date("2025-01-05") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.longestStreak).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Most Active Month
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - mostActiveMonth", () => {
  it("returns month name with most entries", async () => {
    setupPrismaMocks({
      entries: [
        makeEntry({ id: 1, date: new Date("2025-03-01") }),
        makeEntry({ id: 2, date: new Date("2025-03-15") }),
        makeEntry({ id: 3, date: new Date("2025-03-20") }),
        makeEntry({ id: 4, date: new Date("2025-06-01") }),
        makeEntry({ id: 5, date: new Date("2025-06-15") }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.mostActiveMonth).toBe("March")
  })
})

// ---------------------------------------------------------------------------
// HealthKit
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - healthKit", () => {
  it("healthKitWorkoutMinutes sums duration divided by 60", async () => {
    setupPrismaMocks({
      healthKitWorkouts: [
        makeHealthKitWorkout({ id: 1, duration: 3600 }),
        makeHealthKitWorkout({ id: 2, duration: 1800 }),
      ],
    })

    const result = await getFitnessWrapped(2025)
    expect(result.healthKitWorkoutMinutes).toBe(90)
  })
})

// ---------------------------------------------------------------------------
// Default Year
// ---------------------------------------------------------------------------
describe("getFitnessWrapped - defaults", () => {
  it("defaults to current year when no year provided", async () => {
    setupPrismaMocks()

    await getFitnessWrapped()

    const currentYear = new Date().getFullYear()
    const callArgs = mockPrisma.entry.findMany.mock.calls[0][0]
    const dateFilter = callArgs.where.date
    expect(dateFilter.gte.getFullYear()).toBe(currentYear)
    expect(dateFilter.lte.getFullYear()).toBe(currentYear)
  })
})
