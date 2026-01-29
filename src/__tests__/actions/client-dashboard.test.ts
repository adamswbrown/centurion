/**
 * Client Dashboard Server Action Tests
 *
 * Tests for the client dashboard data fetching including:
 * - Cohort memberships and details
 * - Check-in stats and streaks
 * - Questionnaire status
 * - Wrapped feature visibility
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { subDays, startOfDay, addDays } from "date-fns"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockClientUser,
  mockCoachUser,
  resetAuthMocks,
} from "../mocks"

import {
  createMockUser,
  createMockCohort,
  createMockCohortMembership,
  createMockEntry,
  resetIdCounters,
} from "../utils/test-data"

// Mock next modules
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Now import the function to test
import { getClientDashboardData } from "@/app/actions/client-dashboard"

describe("Client Dashboard Server Action", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetIdCounters()

    // Default: authenticated as client
    setupAuthMock(mockClientUser)
  })

  describe("getClientDashboardData", () => {
    it("should return data for authenticated client with no cohorts", async () => {
      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([]) // Active memberships
        .mockResolvedValueOnce([]) // Completed memberships
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.user.id).toBe(3) // mockClientUser has id "3"
      expect(result.hasActiveCohort).toBe(false)
      expect(result.memberships).toHaveLength(0)
      expect(result.stats.currentStreak).toBe(0)
      expect(result.showWrapped).toBe(false)
    })

    it("should return cohort memberships with coach details", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 14) // 2 weeks ago

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Weight Loss Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42), // 6 weeks
          checkInFrequencyDays: 1,
          config: null,
          coaches: [
            {
              coach: {
                id: 2,
                name: "Coach User",
                email: "coach@test.com",
                image: null,
              },
            },
          ],
        },
      }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership]) // Active memberships
        .mockResolvedValueOnce([]) // Completed memberships
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.hasActiveCohort).toBe(true)
      expect(result.memberships).toHaveLength(1)
      expect(result.memberships[0].cohort.name).toBe("Weight Loss Cohort")
      expect(result.memberships[0].cohort.coaches).toHaveLength(1)
      expect(result.memberships[0].cohort.coaches[0].name).toBe("Coach User")
    })

    it("should calculate check-in streak correctly", async () => {
      const today = startOfDay(new Date())

      // 5 consecutive days of check-ins ending today
      const entries = [
        { date: today, weight: 75, steps: 10000 },
        { date: subDays(today, 1), weight: 75.1, steps: 9500 },
        { date: subDays(today, 2), weight: 75.2, steps: 9000 },
        { date: subDays(today, 3), weight: 75.3, steps: 8500 },
        { date: subDays(today, 4), weight: 75.4, steps: 8000 },
        // Gap here
        { date: subDays(today, 10), weight: 76, steps: 7000 },
      ]

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue(entries)
      mockPrisma.entry.findUnique.mockResolvedValue(entries[0])

      const result = await getClientDashboardData()

      expect(result.stats.currentStreak).toBe(5)
      expect(result.hasTodayEntry).toBe(true)
    })

    it("should return zero streak if no entry today", async () => {
      const today = startOfDay(new Date())

      const entries = [
        { date: subDays(today, 2), weight: 75, steps: 10000 },
        { date: subDays(today, 3), weight: 75.1, steps: 9500 },
      ]

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue(entries)
      mockPrisma.entry.findUnique.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.stats.currentStreak).toBe(0)
      expect(result.hasTodayEntry).toBe(false)
    })

    it("should calculate quick stats correctly", async () => {
      const today = startOfDay(new Date())

      const entries = [
        { date: today, weight: 150, steps: 10000 },
        { date: subDays(today, 1), weight: 151, steps: 9000 },
        { date: subDays(today, 2), weight: 152, steps: 8000 },
        { date: subDays(today, 3), weight: null, steps: 7000 },
        { date: subDays(today, 4), weight: null, steps: 6000 },
        { date: subDays(today, 5), weight: null, steps: 5000 },
        { date: subDays(today, 6), weight: null, steps: 4000 },
      ]

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue(entries)
      mockPrisma.entry.findUnique.mockResolvedValue(entries[0])

      const result = await getClientDashboardData()

      expect(result.stats.latestWeight).toBe(150)
      expect(result.stats.avgSteps7d).toBe(7000) // (10000+9000+8000+7000+6000+5000+4000)/7
      expect(result.stats.entriesLast7Days).toBe(7)
    })

    it("should return questionnaire status for active cohorts", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 7) // Week 2

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Test Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42),
          checkInFrequencyDays: 1,
          config: null,
          coaches: [],
        },
      }

      const mockBundle = {
        id: 1,
        cohortId: 1,
        weekNumber: 2,
        isActive: true,
      }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(mockBundle)
      mockPrisma.weeklyQuestionnaireResponse.findFirst.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.questionnaireStatus).toHaveLength(1)
      expect(result.questionnaireStatus[0].status).toBe("NOT_STARTED")
      expect(result.questionnaireStatus[0].currentWeek).toBe(2)
      expect(result.questionnaireStatus[0].bundleId).toBe(1)
    })

    it("should show completed questionnaire status", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 7)

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Test Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42),
          checkInFrequencyDays: 1,
          config: null,
          coaches: [],
        },
      }

      const mockBundle = { id: 1, cohortId: 1, weekNumber: 2, isActive: true }
      const mockResponse = { userId: 3, bundleId: 1, status: "COMPLETED" }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(mockBundle)
      mockPrisma.weeklyQuestionnaireResponse.findFirst.mockResolvedValue(mockResponse)

      const result = await getClientDashboardData()

      expect(result.questionnaireStatus[0].status).toBe("COMPLETED")
    })

    it("should show showWrapped when cohort is in final week", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 35) // 5 weeks ago = week 6

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Final Week Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42),
          checkInFrequencyDays: 1,
          config: null,
          coaches: [],
        },
      }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([]) // No completed memberships
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.showWrapped).toBe(true)
    })

    it("should show showWrapped when user has completed cohort", async () => {
      const today = startOfDay(new Date())

      const completedMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "INACTIVE",
        cohort: {
          id: 1,
          name: "Completed Cohort",
          endDate: subDays(today, 7),
        },
      }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([]) // No active memberships
        .mockResolvedValueOnce([completedMembership]) // Has completed membership
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.showWrapped).toBe(true)
    })

    it("should not show showWrapped for early week cohorts", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 7) // Only 1 week in

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Early Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42),
          checkInFrequencyDays: 1,
          config: null,
          coaches: [],
        },
      }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([]) // No completed memberships
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.showWrapped).toBe(false)
    })

    it("should detect check-in overdue status", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 14)

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Test Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42),
          checkInFrequencyDays: 1, // Daily check-ins expected
          config: null,
          coaches: [],
        },
      }

      // Last check-in was 3 days ago
      const entries = [
        { date: subDays(today, 3), weight: 75, steps: 10000 },
      ]

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue(entries)
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.checkInOverdue).toBe(true)
    })

    it("should reject unauthenticated access", async () => {
      setupAuthMock(null)

      await expect(getClientDashboardData()).rejects.toThrow("Must be logged in")
    })

    it("should handle coach access (if allowed)", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)

      // Coach should still be able to access (they have a user id)
      const result = await getClientDashboardData()

      expect(result.user.id).toBe(2) // mockCoachUser has id "2"
    })

    it("should return recent entries", async () => {
      const today = startOfDay(new Date())

      const entries = Array.from({ length: 15 }, (_, i) => ({
        date: subDays(today, i),
        weight: 75 + i * 0.1,
        steps: 10000 - i * 100,
      }))

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue(entries.slice(0, 10)) // Takes 10
      mockPrisma.entry.findUnique.mockResolvedValue(entries[0])

      const result = await getClientDashboardData()

      expect(result.recentEntries).toHaveLength(10)
    })

    it("should calculate correct week number from cohort start", async () => {
      const today = startOfDay(new Date())
      const cohortStartDate = subDays(today, 21) // 3 weeks ago = week 4

      const mockMembership = {
        id: 1,
        userId: 3,
        cohortId: 1,
        status: "ACTIVE",
        joinedAt: cohortStartDate,
        createdAt: cohortStartDate,
        updatedAt: cohortStartDate,
        cohort: {
          id: 1,
          name: "Week 4 Cohort",
          type: "WEIGHT_LOSS",
          startDate: cohortStartDate,
          endDate: addDays(cohortStartDate, 42),
          checkInFrequencyDays: 1,
          config: null,
          coaches: [],
        },
      }

      const mockBundle = { id: 1, cohortId: 1, weekNumber: 4, isActive: true }

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([mockMembership])
        .mockResolvedValueOnce([])
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.findFirst.mockResolvedValue(mockBundle)
      mockPrisma.weeklyQuestionnaireResponse.findFirst.mockResolvedValue(null)

      const result = await getClientDashboardData()

      expect(result.questionnaireStatus[0].currentWeek).toBe(4)
    })
  })
})
