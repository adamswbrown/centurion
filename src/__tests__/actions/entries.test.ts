/**
 * Entries Server Actions Tests
 *
 * Tests for daily check-in entry server actions including
 * CRUD operations, HealthKit auto-population, streak calculation,
 * check-in config management, and authorization enforcement.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { startOfDay } from "date-fns"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  resetAuthMocks,
} from "../mocks"

// Now import the functions to test (after mocks are set up)
import {
  getEntries,
  getEntryByDate,
  upsertEntry,
  deleteEntry,
  getCheckInStats,
  getCheckInConfig,
  updateCheckInConfig,
  getHealthKitPreview,
} from "@/app/actions/entries"

describe("Entries Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()

    // Default: authenticated as client
    setupAuthMock(mockClientUser)

    // Default: no HealthKit data (use mockReturnValue pattern to allow override)
    mockPrisma.healthKitWorkout.findMany.mockResolvedValue([])
    mockPrisma.sleepRecord.findFirst.mockResolvedValue(null)
  })

  // ---------------------------------------------------------------------------
  // getEntries
  // ---------------------------------------------------------------------------
  describe("getEntries", () => {
    it("should return entries for the authenticated user when no params given", async () => {
      const entries = [
        { id: 1, userId: 3, date: new Date("2025-01-15"), weight: 180 },
        { id: 2, userId: 3, date: new Date("2025-01-14"), weight: 181 },
      ]
      mockPrisma.entry.findMany.mockResolvedValue(entries)

      const result = await getEntries()

      expect(result).toEqual(entries)
      expect(mockPrisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 3 },
          orderBy: { date: "desc" },
          take: 100,
        })
      )
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getEntries()).rejects.toThrow("Unauthorized")
    })

    it("should allow admin to view another user's entries", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.entry.findMany.mockResolvedValue([])

      await getEntries({ userId: 99 })

      expect(mockPrisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 99 },
        })
      )
    })

    it("should allow coach to view another user's entries", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.entry.findMany.mockResolvedValue([])

      await getEntries({ userId: 99 })

      expect(mockPrisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 99 },
        })
      )
    })

    it("should forbid client from viewing another user's entries", async () => {
      await expect(getEntries({ userId: 99 })).rejects.toThrow("Forbidden")
    })

    it("should apply date range filters", async () => {
      mockPrisma.entry.findMany.mockResolvedValue([])

      const from = new Date("2025-01-01")
      const to = new Date("2025-01-31")
      await getEntries({ from, to })

      const call = mockPrisma.entry.findMany.mock.calls[0][0]
      expect(call.where.date.gte).toEqual(startOfDay(from))
      expect(call.where.date.lte).toEqual(startOfDay(to))
    })

    it("should respect the limit parameter", async () => {
      mockPrisma.entry.findMany.mockResolvedValue([])

      await getEntries({ limit: 10 })

      expect(mockPrisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getEntryByDate
  // ---------------------------------------------------------------------------
  describe("getEntryByDate", () => {
    it("should return the entry for the authenticated user on a given date", async () => {
      const entry = { id: 1, userId: 3, date: new Date("2025-01-15"), weight: 180 }
      mockPrisma.entry.findUnique.mockResolvedValue(entry)

      const date = new Date("2025-01-15")
      const result = await getEntryByDate(date)

      expect(result).toEqual(entry)
      expect(mockPrisma.entry.findUnique).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: 3,
            date: startOfDay(date),
          },
        },
      })
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getEntryByDate(new Date())).rejects.toThrow("Unauthorized")
    })

    it("should allow admin to look up another user's entry by date", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.entry.findUnique.mockResolvedValue(null)

      await getEntryByDate(new Date("2025-01-15"), 99)

      expect(mockPrisma.entry.findUnique).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: 99,
            date: startOfDay(new Date("2025-01-15")),
          },
        },
      })
    })

    it("should forbid client from viewing another user's entry", async () => {
      await expect(getEntryByDate(new Date(), 99)).rejects.toThrow("Forbidden")
    })
  })

  // ---------------------------------------------------------------------------
  // upsertEntry
  // ---------------------------------------------------------------------------
  describe("upsertEntry", () => {
    const baseInput = {
      date: "2025-01-15",
      weight: 180,
      notes: "Feeling good",
    }

    it("should create a new entry for a client user", async () => {
      const created = { id: 1, userId: 3, ...baseInput, date: new Date("2025-01-15") }
      mockPrisma.entry.upsert.mockResolvedValue(created)

      const result = await upsertEntry(baseInput)

      expect(result).toEqual(created)
      expect(mockPrisma.entry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_date: {
              userId: 3,
              date: startOfDay(new Date("2025-01-15")),
            },
          },
          create: expect.objectContaining({
            userId: 3,
            date: startOfDay(new Date("2025-01-15")),
            weight: 180,
            notes: "Feeling good",
          }),
          update: expect.objectContaining({
            weight: 180,
            notes: "Feeling good",
          }),
        })
      )
    })

    it("should forbid admin from creating entries", async () => {
      setupAuthMock(mockAdminUser)

      await expect(upsertEntry(baseInput)).rejects.toThrow(
        "Forbidden: only members can create check-ins"
      )
    })

    it("should forbid coach from creating entries", async () => {
      setupAuthMock(mockCoachUser)

      await expect(upsertEntry(baseInput)).rejects.toThrow(
        "Forbidden: only members can create check-ins"
      )
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(upsertEntry(baseInput)).rejects.toThrow("Unauthorized")
    })

    it("should reject invalid data via Zod validation", async () => {
      await expect(
        upsertEntry({ date: "" })
      ).rejects.toThrow()
    })

    it("should set dataSources to manual when user provides values", async () => {
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({
        date: "2025-01-15",
        weight: 180,
        steps: 10000,
        calories: 2500,
        sleepQuality: 8,
      })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      expect(call.create.dataSources).toEqual(
        expect.objectContaining({
          weight: "manual",
          steps: "manual",
          calories: "manual",
          sleepQuality: "manual",
        })
      )
    })

    // HealthKit auto-population tests

    it("should auto-populate steps from HealthKit walking workouts", async () => {
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Walking",
          distance: 5000, // 5km in meters
          calories: 250,
          startTime: new Date("2025-01-15T08:00:00"),
        },
      ])
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      // 5km * 1300 steps/km = 6500
      expect(call.create.steps).toBe(6500)
      expect(call.create.dataSources.steps).toBe("healthkit")
    })

    it("should auto-populate steps from HealthKit running workouts", async () => {
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Running",
          distance: 10000, // 10km in meters
          calories: 600,
          startTime: new Date("2025-01-15T07:00:00"),
        },
      ])
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      // 10km * 1200 steps/km = 12000
      expect(call.create.steps).toBe(12000)
      expect(call.create.dataSources.steps).toBe("healthkit")
    })

    it("should combine steps from multiple walking and running workouts", async () => {
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Walking",
          distance: 2000, // 2km
          calories: 100,
          startTime: new Date("2025-01-15T08:00:00"),
        },
        {
          id: 2,
          userId: 3,
          workoutType: "Jogging",
          distance: 3000, // 3km
          calories: 200,
          startTime: new Date("2025-01-15T17:00:00"),
        },
      ])
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      // Walking: 2km * 1300 = 2600, Jogging: 3km * 1200 = 3600 => 6200
      expect(call.create.steps).toBe(6200)
    })

    it("should auto-populate calories from HealthKit workouts", async () => {
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Strength Training",
          distance: null,
          calories: 350.7,
          startTime: new Date("2025-01-15T10:00:00"),
        },
        {
          id: 2,
          userId: 3,
          workoutType: "Cycling",
          distance: null,
          calories: 200.3,
          startTime: new Date("2025-01-15T16:00:00"),
        },
      ])
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      // 351 + 200 = 551
      expect(call.create.calories).toBe(551)
      expect(call.create.dataSources.calories).toBe("healthkit")
    })

    it("should not auto-populate steps from non-walking/running workouts", async () => {
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Cycling",
          distance: 20000,
          calories: 500,
          startTime: new Date("2025-01-15T08:00:00"),
        },
      ])
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      // Cycling should not generate steps; no steps field should be set
      expect(call.create.steps).toBeUndefined()
    })

    it("should derive sleep quality 10 from 8+ hours of sleep", async () => {
      mockPrisma.sleepRecord.findFirst.mockResolvedValue({
        id: 1,
        userId: 3,
        totalSleep: 510, // 8.5 hours in minutes
        endTime: new Date("2025-01-15T07:00:00"),
      })
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      expect(call.create.sleepQuality).toBe(10)
      expect(call.create.dataSources.sleepQuality).toBe("healthkit")
    })

    it("should derive sleep quality 6 from 6-6.5 hours of sleep", async () => {
      mockPrisma.sleepRecord.findFirst.mockResolvedValue({
        id: 1,
        userId: 3,
        totalSleep: 360, // 6 hours in minutes
        endTime: new Date("2025-01-15T07:00:00"),
      })
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      expect(call.create.sleepQuality).toBe(6)
    })

    it("should derive sleep quality 3 from less than 5 hours of sleep", async () => {
      mockPrisma.sleepRecord.findFirst.mockResolvedValue({
        id: 1,
        userId: 3,
        totalSleep: 240, // 4 hours in minutes
        endTime: new Date("2025-01-15T07:00:00"),
      })
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({ date: "2025-01-15" })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      expect(call.create.sleepQuality).toBe(3)
    })

    it("should prefer manual input over HealthKit auto-populated data", async () => {
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Walking",
          distance: 5000,
          calories: 250,
          startTime: new Date("2025-01-15T08:00:00"),
        },
      ])
      mockPrisma.sleepRecord.findFirst.mockResolvedValue({
        id: 1,
        userId: 3,
        totalSleep: 480,
        endTime: new Date("2025-01-15T07:00:00"),
      })
      mockPrisma.entry.upsert.mockResolvedValue({})

      await upsertEntry({
        date: "2025-01-15",
        steps: 12000,
        calories: 3000,
        sleepQuality: 7,
      })

      const call = mockPrisma.entry.upsert.mock.calls[0][0]
      expect(call.create.steps).toBe(12000)
      expect(call.create.calories).toBe(3000)
      expect(call.create.sleepQuality).toBe(7)
      expect(call.create.dataSources.steps).toBe("manual")
      expect(call.create.dataSources.calories).toBe("manual")
      expect(call.create.dataSources.sleepQuality).toBe("manual")
    })
  })

  // ---------------------------------------------------------------------------
  // deleteEntry
  // ---------------------------------------------------------------------------
  describe("deleteEntry", () => {
    it("should delete an entry owned by the authenticated user", async () => {
      const entry = { id: 10, userId: 3, date: new Date("2025-01-15") }
      mockPrisma.entry.findUnique.mockResolvedValue(entry)
      mockPrisma.entry.delete.mockResolvedValue(entry)

      const result = await deleteEntry(10)

      expect(result).toEqual({ success: true })
      expect(mockPrisma.entry.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      })
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(deleteEntry(10)).rejects.toThrow("Unauthorized")
    })

    it("should throw when entry is not found", async () => {
      mockPrisma.entry.findUnique.mockResolvedValue(null)

      await expect(deleteEntry(999)).rejects.toThrow("Entry not found")
    })

    it("should throw when trying to delete another user's entry", async () => {
      const otherUsersEntry = { id: 10, userId: 99, date: new Date("2025-01-15") }
      mockPrisma.entry.findUnique.mockResolvedValue(otherUsersEntry)

      await expect(deleteEntry(10)).rejects.toThrow(
        "Forbidden: cannot delete other users' entries"
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getCheckInStats
  // ---------------------------------------------------------------------------
  describe("getCheckInStats", () => {
    it("should return zero streak when no entries exist", async () => {
      mockPrisma.entry.findMany.mockResolvedValue([])

      const stats = await getCheckInStats()

      expect(stats).toEqual({
        totalEntries: 0,
        currentStreak: 0,
        lastCheckIn: null,
      })
    })

    it("should calculate a streak of consecutive days from today", async () => {
      const today = startOfDay(new Date())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today },
        { date: yesterday },
        { date: twoDaysAgo },
      ])

      const stats = await getCheckInStats()

      expect(stats.currentStreak).toBe(3)
      expect(stats.totalEntries).toBe(3)
      expect(stats.lastCheckIn).toEqual(today)
    })

    it("should return streak of zero when the most recent entry is not today", async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      mockPrisma.entry.findMany.mockResolvedValue([
        { date: yesterday },
      ])

      const stats = await getCheckInStats()

      // Streak requires the first entry to be today
      expect(stats.currentStreak).toBe(0)
    })

    it("should break the streak when days are non-consecutive", async () => {
      const today = startOfDay(new Date())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      // Skip a day
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today },
        { date: yesterday },
        { date: threeDaysAgo },
      ])

      const stats = await getCheckInStats()

      expect(stats.currentStreak).toBe(2)
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getCheckInStats()).rejects.toThrow("Unauthorized")
    })

    it("should allow admin to view another user's stats", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.entry.findMany.mockResolvedValue([])

      await getCheckInStats(99)

      expect(mockPrisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 99 },
        })
      )
    })

    it("should forbid client from viewing another user's stats", async () => {
      await expect(getCheckInStats(99)).rejects.toThrow("Forbidden")
    })
  })

  // ---------------------------------------------------------------------------
  // getCheckInConfig
  // ---------------------------------------------------------------------------
  describe("getCheckInConfig", () => {
    it("should return config by cohortId when provided", async () => {
      const config = { id: 1, cohortId: 5, prompts: { question1: "How are you?" } }
      mockPrisma.cohortCheckInConfig.findUnique.mockResolvedValue(config)

      const result = await getCheckInConfig(5)

      expect(result).toEqual(config)
      expect(mockPrisma.cohortCheckInConfig.findUnique).toHaveBeenCalledWith({
        where: { cohortId: 5 },
      })
    })

    it("should find config via user's active cohort membership when no cohortId", async () => {
      const config = { id: 1, cohortId: 10, prompts: {} }
      mockPrisma.cohortMembership.findFirst.mockResolvedValue({
        cohort: { config },
      })

      const result = await getCheckInConfig()

      expect(result).toEqual(config)
      expect(mockPrisma.cohortMembership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 3,
            status: "ACTIVE",
          },
        })
      )
    })

    it("should return null when user has no active cohort membership", async () => {
      mockPrisma.cohortMembership.findFirst.mockResolvedValue(null)

      const result = await getCheckInConfig()

      expect(result).toBeNull()
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getCheckInConfig()).rejects.toThrow("Unauthorized")
    })
  })

  // ---------------------------------------------------------------------------
  // updateCheckInConfig
  // ---------------------------------------------------------------------------
  describe("updateCheckInConfig", () => {
    it("should allow admin to update check-in config", async () => {
      setupAuthMock(mockAdminUser)
      const prompts = { question1: "Rate your energy" }
      const expected = { id: 1, cohortId: 5, prompts }
      mockPrisma.cohortCheckInConfig.upsert.mockResolvedValue(expected)

      const result = await updateCheckInConfig(5, prompts)

      expect(result).toEqual(expected)
      expect(mockPrisma.cohortCheckInConfig.upsert).toHaveBeenCalledWith({
        where: { cohortId: 5 },
        create: { cohortId: 5, prompts },
        update: { prompts },
      })
    })

    it("should forbid non-admin users from updating config", async () => {
      await expect(
        updateCheckInConfig(5, { question1: "test" })
      ).rejects.toThrow("Forbidden: only admins can update check-in configs")
    })

    it("should forbid coach from updating config", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        updateCheckInConfig(5, { question1: "test" })
      ).rejects.toThrow("Forbidden: only admins can update check-in configs")
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(
        updateCheckInConfig(5, { question1: "test" })
      ).rejects.toThrow("Unauthorized")
    })
  })

  // ---------------------------------------------------------------------------
  // getHealthKitPreview
  // ---------------------------------------------------------------------------
  describe("getHealthKitPreview", () => {
    it("should return HealthKit preview data for a date", async () => {
      mockPrisma.healthKitWorkout.findMany.mockReset()
      mockPrisma.sleepRecord.findFirst.mockReset()
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          workoutType: "Hike",
          distance: 8000, // 8km in meters
          calories: 450,
          startTime: new Date("2025-01-15T09:00:00"),
        },
      ])
      mockPrisma.sleepRecord.findFirst.mockResolvedValue({
        id: 1,
        userId: 3,
        totalSleep: 420, // 7 hours in minutes
        endTime: new Date("2025-01-15T06:30:00"),
      })

      const result = await getHealthKitPreview("2025-01-15")

      // Hike: 8km * 1300 = 10400 steps
      expect(result.steps).toBe(10400)
      expect(result.calories).toBe(450)
      // 7 hours -> quality 8
      expect(result.sleepQuality).toBe(8)
    })

    it("should return nulls when no HealthKit data exists", async () => {
      const result = await getHealthKitPreview("2025-01-15")

      expect(result).toEqual({
        steps: null,
        calories: null,
        sleepQuality: null,
      })
    })

    it("should throw Unauthorized when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getHealthKitPreview("2025-01-15")).rejects.toThrow("Unauthorized")
    })
  })
})
