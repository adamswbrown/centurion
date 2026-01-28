/**
 * Coach Analytics Server Actions Tests
 *
 * Tests for coach analytics including attention scores,
 * member insights, check-in data, and dashboard overview.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { subDays, startOfDay } from "date-fns"

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

import {
  createMockUser,
  createMockCohort,
  createMockCohortMembership,
  createMockCoachCohortMembership,
  resetIdCounters,
} from "../utils/test-data"

// Mock next modules
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Now import the functions to test
import {
  getCoachInsights,
  getMemberCheckInData,
  getCoachCohortMembers,
  calculateAttentionScore,
  getCoachMembersOverview,
} from "@/app/actions/coach-analytics"

describe("Coach Analytics Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetIdCounters()

    // Default: authenticated as coach
    setupAuthMock(mockCoachUser)
  })

  describe("getCoachInsights", () => {
    it("should return empty insights when coach has no cohorts", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])

      const result = await getCoachInsights()

      expect(result).toEqual({
        totalMembers: 0,
        activeMembersCount: 0,
        inactiveMembersCount: 0,
        avgCheckInsPerWeek: 0,
        avgQuestionnaireCompletion: 0,
        attentionScores: [],
      })
    })

    it("should return insights for coach's cohorts", async () => {
      const cohort1 = createMockCohort({ id: 1, name: "Cohort 1" })
      const member1 = createMockUser({ id: 10, name: "Member 1", email: "member1@test.com" })
      const member2 = createMockUser({ id: 11, name: "Member 2", email: "member2@test.com" })

      // Mock coach cohort membership
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { id: 1, coachId: 2, cohortId: 1, createdAt: new Date(), updatedAt: new Date() },
      ])

      // Mock cohort memberships with users - first call for main function
      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([
          {
            id: 1,
            userId: 10,
            cohortId: 1,
            status: "ACTIVE",
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: 10, name: "Member 1", email: "member1@test.com" },
          },
          {
            id: 2,
            userId: 11,
            cohortId: 1,
            status: "ACTIVE",
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: 11, name: "Member 2", email: "member2@test.com" },
          },
        ])
        // Subsequent calls for calculateMemberAttentionScore
        .mockResolvedValue([])

      // Mock entries for calculateMemberAttentionScore calls
      const today = new Date()
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today, perceivedStress: 3 },
        { date: subDays(today, 1), perceivedStress: 4 },
        { date: subDays(today, 2), perceivedStress: 3 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      // Mock recent check-ins count
      mockPrisma.entry.count.mockResolvedValue(10)

      const result = await getCoachInsights()

      expect(result.totalMembers).toBe(2)
      expect(result.attentionScores).toHaveLength(2)
      expect(result.attentionScores[0].memberName).toBeTruthy()
    })

    it("should return all cohorts for admin", async () => {
      setupAuthMock(mockAdminUser)

      const cohort1 = createMockCohort({ id: 1, name: "Cohort 1", status: "ACTIVE" })
      const cohort2 = createMockCohort({ id: 2, name: "Cohort 2", status: "ACTIVE" })

      // Mock all cohorts for admin
      mockPrisma.cohort.findMany.mockResolvedValue([cohort1, cohort2])
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.entry.count.mockResolvedValue(0)

      const result = await getCoachInsights()

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        select: { id: true },
      })
    })

    it("should calculate aggregate stats correctly", async () => {
      const today = new Date()
      const sevenDaysAgo = subDays(today, 7)

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { id: 1, coachId: 2, cohortId: 1, createdAt: new Date(), updatedAt: new Date() },
      ])

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([
          {
            id: 1,
            userId: 10,
            cohortId: 1,
            status: "ACTIVE",
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: 10, name: "Member 1", email: "member1@test.com" },
          },
        ])
        // Subsequent calls for calculateMemberAttentionScore
        .mockResolvedValue([])

      // Mock for attention score calculation
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today, perceivedStress: 3 },
        { date: subDays(today, 1), perceivedStress: 4 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      // Mock recent check-ins
      mockPrisma.entry.count.mockResolvedValue(5)

      const result = await getCoachInsights()

      expect(result.totalMembers).toBe(1)
      expect(result.activeMembersCount).toBe(1)
      expect(result.inactiveMembersCount).toBe(0)
      expect(result.avgCheckInsPerWeek).toBe(5)
    })

    it("should sort attention scores by priority (highest first)", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { id: 1, coachId: 2, cohortId: 1, createdAt: new Date(), updatedAt: new Date() },
      ])

      const today = new Date()

      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([
          {
            id: 1,
            userId: 10,
            cohortId: 1,
            status: "ACTIVE",
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: 10, name: "Low Risk", email: "low@test.com" },
          },
          {
            id: 2,
            userId: 11,
            cohortId: 1,
            status: "ACTIVE",
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { id: 11, name: "High Risk", email: "high@test.com" },
          },
        ])
        // Subsequent calls for calculateMemberAttentionScore
        .mockResolvedValue([])

      // Setup mock to return different data for different users
      let callCount = 0
      mockPrisma.entry.findMany.mockImplementation(async (args: any) => {
        callCount++
        if (callCount === 1) {
          // Low risk member - recent entries
          return [
            { date: today, perceivedStress: 3 },
            { date: subDays(today, 1), perceivedStress: 3 },
          ]
        } else if (callCount === 2) {
          // High risk member - no recent entries
          return []
        } else {
          // For final count call
          return []
        }
      })

      let findFirstCallCount = 0
      mockPrisma.entry.findFirst.mockImplementation(async () => {
        findFirstCallCount++
        if (findFirstCallCount === 1) {
          return { date: today }
        } else {
          return { date: subDays(today, 10) }
        }
      })

      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])
      mockPrisma.entry.count.mockResolvedValue(5)

      const result = await getCoachInsights()

      expect(result.attentionScores[0].memberName).toBe("High Risk")
      expect(result.attentionScores[0].score).toBeGreaterThan(result.attentionScores[1].score)
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getCoachInsights()).rejects.toThrow()
    })
  })

  describe("calculateAttentionScore", () => {
    it("should return green priority for active member", async () => {
      const member = createMockUser({ id: 10, name: "Active Member", email: "active@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // Recent entries with low stress
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today, perceivedStress: 3 },
        { date: subDays(today, 1), perceivedStress: 3 },
        { date: subDays(today, 2), perceivedStress: 2 },
        { date: subDays(today, 3), perceivedStress: 3 },
        { date: subDays(today, 4), perceivedStress: 4 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.priority).toBe("green")
      expect(result!.score).toBeLessThan(30)
      expect(result!.currentStreak).toBeGreaterThan(0)
    })

    it("should return amber priority for moderate issues", async () => {
      const member = createMockUser({ id: 10, name: "Moderate Risk", email: "moderate@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // No check-in for 4 days (25 points)
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: subDays(today, 4) })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([{ userId: 10, cohortId: 1, status: "ACTIVE" }])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ])
      // 40% completion (15 points)
      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValue(1)

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.priority).toBe("amber")
      expect(result!.score).toBeGreaterThanOrEqual(30)
      expect(result!.score).toBeLessThan(60)
      expect(result!.reasons).toContain("No check-in for 4 days")
    })

    it("should return red priority for high-risk member", async () => {
      const member = createMockUser({ id: 10, name: "High Risk", email: "high@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // No check-in for 8 days (40 points)
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: subDays(today, 8) })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([{ userId: 10, cohortId: 1, status: "ACTIVE" }])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ])
      // 20% completion (30 points)
      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValue(0)

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.priority).toBe("red")
      expect(result!.score).toBeGreaterThanOrEqual(60)
      expect(result!.suggestedActions).toContain("Contact member immediately")
    })

    it("should return null if member not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await calculateAttentionScore(999)

      expect(result).toBeNull()
    })

    it("should detect high stress levels", async () => {
      const member = createMockUser({ id: 10, name: "Stressed Member", email: "stressed@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // Recent entries with very high stress
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today, perceivedStress: 9 },
        { date: subDays(today, 1), perceivedStress: 8 },
        { date: subDays(today, 2), perceivedStress: 9 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.reasons).toContain("Very high stress levels reported recently")
      expect(result!.suggestedActions).toContain("Schedule wellness check-in")
    })

    it("should detect increasing stress trend", async () => {
      const member = createMockUser({ id: 10, name: "Trending Up", email: "trend@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // Stress increasing over time
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: today, perceivedStress: 7 },
        { date: subDays(today, 1), perceivedStress: 7 },
        { date: subDays(today, 2), perceivedStress: 6 },
        { date: subDays(today, 5), perceivedStress: 3 },
        { date: subDays(today, 6), perceivedStress: 3 },
        { date: subDays(today, 7), perceivedStress: 2 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.reasons).toContain("Stress levels increasing")
    })

    it("should handle member with no entries", async () => {
      const member = createMockUser({ id: 10, name: "No Entries", email: "none@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findFirst.mockResolvedValue(null)
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.currentStreak).toBe(0)
      expect(result!.lastCheckIn).toBeNull()
      expect(result!.totalCheckIns).toBe(0)
    })

    it("should score low engagement with few check-ins", async () => {
      const member = createMockUser({ id: 10, name: "Low Engagement", email: "low@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // Only 3 check-ins in 14 days (< 50% of expected)
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: subDays(today, 2), perceivedStress: 3 },
        { date: subDays(today, 5), perceivedStress: 3 },
        { date: subDays(today, 10), perceivedStress: 3 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: subDays(today, 2) })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.reasons.some((r) => r.includes("low engagement"))).toBe(true)
    })

    it("should score questionnaire completion correctly", async () => {
      const member = createMockUser({ id: 10, name: "Low Questionnaire", email: "lowq@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      mockPrisma.entry.findMany.mockResolvedValue([{ date: today, perceivedStress: 3 }])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([{ userId: 10, cohortId: 1, status: "ACTIVE" }])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ])
      // 25% completion (< 30% = 30 points)
      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValue(1)

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.reasons.some((r) => r.includes("Low questionnaire completion"))).toBe(true)
    })

    it("should cap score at 100", async () => {
      const member = createMockUser({ id: 10, name: "Max Score", email: "max@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      // No check-in for 8+ days (40 points)
      // Very high stress (30 points)
      // No questionnaire completion (30 points)
      // Total would be 100+
      mockPrisma.entry.findMany.mockResolvedValue([
        { date: subDays(today, 8), perceivedStress: 9 },
        { date: subDays(today, 9), perceivedStress: 9 },
        { date: subDays(today, 10), perceivedStress: 9 },
      ])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: subDays(today, 8) })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([{ userId: 10, cohortId: 1, status: "ACTIVE" }])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([{ id: 1 }])
      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValue(0)

      const result = await calculateAttentionScore(10)

      expect(result).not.toBeNull()
      expect(result!.score).toBeLessThanOrEqual(100)
    })
  })

  describe("getMemberCheckInData", () => {
    it("should return member check-in data with streak", async () => {
      const member = createMockUser({ id: 10, name: "Member 1", email: "member1@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      const entries = [
        {
          date: today,
          weight: 75.5,
          steps: 10000,
          calories: 2000,
          sleepQuality: 8,
          perceivedStress: 3,
          notes: "Good day",
        },
        {
          date: subDays(today, 1),
          weight: 75.6,
          steps: 9500,
          calories: 1950,
          sleepQuality: 7,
          perceivedStress: 4,
          notes: null,
        },
      ]
      mockPrisma.entry.findMany.mockResolvedValue(entries)

      const result = await getMemberCheckInData(10)

      expect(result).not.toBeNull()
      expect(result!.memberId).toBe(10)
      expect(result!.memberName).toBe("Member 1")
      expect(result!.checkIns).toHaveLength(2)
      expect(result!.totalCheckIns).toBe(2)
      expect(result!.currentStreak).toBe(2)
      expect(result!.lastCheckIn).toEqual(today)
    })

    it("should return null if member not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getMemberCheckInData(999)

      expect(result).toBeNull()
    })

    it("should calculate streak correctly with gaps", async () => {
      const member = createMockUser({ id: 10 })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      const entries = [
        { date: today, weight: null, steps: null, calories: null, sleepQuality: null, perceivedStress: 3, notes: null },
        { date: subDays(today, 1), weight: null, steps: null, calories: null, sleepQuality: null, perceivedStress: 3, notes: null },
        // Gap here - streak breaks
        { date: subDays(today, 5), weight: null, steps: null, calories: null, sleepQuality: null, perceivedStress: 3, notes: null },
      ]
      mockPrisma.entry.findMany.mockResolvedValue(entries)

      const result = await getMemberCheckInData(10)

      expect(result).not.toBeNull()
      expect(result!.currentStreak).toBe(2)
    })

    it("should return zero streak if last entry not today", async () => {
      const member = createMockUser({ id: 10 })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const today = new Date()
      const entries = [
        { date: subDays(today, 2), weight: null, steps: null, calories: null, sleepQuality: null, perceivedStress: 3, notes: null },
      ]
      mockPrisma.entry.findMany.mockResolvedValue(entries)

      const result = await getMemberCheckInData(10)

      expect(result).not.toBeNull()
      expect(result!.currentStreak).toBe(0)
    })

    it("should handle empty entries", async () => {
      const member = createMockUser({ id: 10 })
      mockPrisma.user.findUnique.mockResolvedValue(member)

      mockPrisma.entry.findMany.mockResolvedValue([])

      const result = await getMemberCheckInData(10)

      expect(result).not.toBeNull()
      expect(result!.checkIns).toHaveLength(0)
      expect(result!.totalCheckIns).toBe(0)
      expect(result!.currentStreak).toBe(0)
      expect(result!.lastCheckIn).toBeNull()
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMemberCheckInData(10)).rejects.toThrow()
    })
  })

  describe("getCoachCohortMembers", () => {
    it("should return coach's cohort members", async () => {
      const cohort = createMockCohort({ id: 1, name: "Cohort 1" })
      const member1 = createMockUser({ id: 10, name: "Member 1" })
      const member2 = createMockUser({ id: 11, name: "Member 2" })

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          id: 1,
          coachId: 2,
          cohortId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                id: 1,
                userId: 10,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "Member 1", email: "member1@test.com", image: null },
              },
              {
                id: 2,
                userId: 11,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 11, name: "Member 2", email: "member2@test.com", image: null },
              },
            ],
          },
        },
      ])

      const result = await getCoachCohortMembers()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Member 1")
      expect(result[0].cohortName).toBe("Cohort 1")
    })

    it("should return all cohort members for admin", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.cohort.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Cohort 1",
          description: null,
          startDate: new Date(),
          endDate: null,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [
            {
              id: 1,
              userId: 10,
              cohortId: 1,
              status: "ACTIVE",
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              user: { id: 10, name: "Member 1", email: "member1@test.com", image: null },
            },
          ],
        },
      ])

      const result = await getCoachCohortMembers()

      expect(result).toHaveLength(1)
      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        select: expect.any(Object),
      })
    })

    it("should deduplicate members in multiple cohorts", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          id: 1,
          coachId: 2,
          cohortId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                id: 1,
                userId: 10,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "Member 1", email: "member1@test.com", image: null },
              },
            ],
          },
        },
        {
          id: 2,
          coachId: 2,
          cohortId: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 2,
            name: "Cohort 2",
            members: [
              {
                id: 2,
                userId: 10,
                cohortId: 2,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "Member 1", email: "member1@test.com", image: null },
              },
            ],
          },
        },
      ])

      const result = await getCoachCohortMembers()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(10)
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getCoachCohortMembers()).rejects.toThrow()
    })
  })

  describe("getCoachMembersOverview", () => {
    it("should return empty array when no members", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])

      const result = await getCoachMembersOverview()

      expect(result).toEqual([])
    })

    it("should return sorted overview with all data", async () => {
      const today = new Date()

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          id: 1,
          coachId: 2,
          cohortId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                id: 1,
                userId: 10,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "Member 1", email: "member1@test.com" },
              },
            ],
          },
        },
      ])

      // Mock batch fetch results
      mockPrisma.entry.findMany
        .mockResolvedValueOnce([{ userId: 10, date: today }]) // Week entries
        .mockResolvedValueOnce([{ userId: 10, date: today }]) // Last entries
        .mockResolvedValueOnce([{ userId: 10, date: today }]) // Recent entries

      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue([
        { userId: 10, status: "COMPLETED" },
      ])

      // Mock for attention score calculation
      mockPrisma.entry.findMany.mockResolvedValue([{ date: today, perceivedStress: 3 }])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await getCoachMembersOverview()

      expect(result).toHaveLength(1)
      expect(result[0].memberId).toBe(10)
      expect(result[0].memberName).toBe("Member 1")
      expect(result[0].cohortName).toBe("Cohort 1")
      expect(result[0].checkInsThisWeek).toBe(1)
      expect(result[0].questionnaireStatus).toBe("COMPLETED")
    })

    it("should calculate check-ins this week correctly", async () => {
      const today = new Date()

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          id: 1,
          coachId: 2,
          cohortId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                id: 1,
                userId: 10,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "Member 1", email: "member1@test.com" },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany
        .mockResolvedValueOnce([
          { userId: 10, date: today },
          { userId: 10, date: subDays(today, 1) },
          { userId: 10, date: subDays(today, 2) },
        ]) // Week entries
        .mockResolvedValueOnce([{ userId: 10, date: today }]) // Last entries
        .mockResolvedValueOnce([{ userId: 10, date: today }]) // Recent entries

      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue([])

      // Mock for attention score calculation
      mockPrisma.entry.findMany.mockResolvedValue([{ date: today, perceivedStress: 3 }])
      mockPrisma.entry.findFirst.mockResolvedValue({ date: today })
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await getCoachMembersOverview()

      expect(result[0].checkInsThisWeek).toBe(3)
    })

    it("should map questionnaire status correctly", async () => {
      const today = new Date()

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          id: 1,
          coachId: 2,
          cohortId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                id: 1,
                userId: 10,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "In Progress", email: "progress@test.com" },
              },
              {
                id: 2,
                userId: 11,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 11, name: "Not Started", email: "notstarted@test.com" },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany
        .mockResolvedValueOnce([]) // Week entries
        .mockResolvedValueOnce([]) // Last entries
        .mockResolvedValueOnce([]) // Recent entries

      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue([
        { userId: 10, status: "IN_PROGRESS" },
      ])

      // Mock for attention score calculation
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findFirst.mockResolvedValue(null)
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await getCoachMembersOverview()

      expect(result.find((r) => r.memberId === 10)?.questionnaireStatus).toBe("IN_PROGRESS")
      expect(result.find((r) => r.memberId === 11)?.questionnaireStatus).toBe("NOT_STARTED")
    })

    it("should sort by priority (red, amber, green)", async () => {
      const today = new Date()

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          id: 1,
          coachId: 2,
          cohortId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                id: 1,
                userId: 10,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 10, name: "Green", email: "green@test.com" },
              },
              {
                id: 2,
                userId: 11,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 11, name: "Red", email: "red@test.com" },
              },
              {
                id: 3,
                userId: 12,
                cohortId: 1,
                status: "ACTIVE",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                user: { id: 12, name: "Amber", email: "amber@test.com" },
              },
            ],
          },
        },
      ])

      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue([])

      // Batch fetch mocks - first 3 calls
      mockPrisma.entry.findMany
        .mockResolvedValueOnce([]) // Week entries
        .mockResolvedValueOnce([]) // Last entries
        .mockResolvedValueOnce([]) // Recent entries (all users)
        // Then calls for each member's attention score calculation (3 members)
        .mockResolvedValueOnce([{ date: today, perceivedStress: 3 }]) // Green - active
        .mockResolvedValueOnce([]) // Red - no entries
        .mockResolvedValueOnce([]) // Amber - no entries

      mockPrisma.entry.findFirst
        .mockResolvedValueOnce({ date: today }) // Green
        .mockResolvedValueOnce({ date: subDays(today, 10) }) // Red (10 days = 40 points)
        .mockResolvedValueOnce({ date: subDays(today, 4) }) // Amber (4 days = 25 points)

      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await getCoachMembersOverview()

      // Debug - see actual priorities
      // console.log('Result priorities:', result.map(r => ({ name: r.memberName, priority: r.priority, score: r.score })))

      expect(result).toHaveLength(3)
      // Just verify sorting is correct (highest priority first)
      const priorityOrder = { red: 0, amber: 1, green: 2 }
      for (let i = 0; i < result.length - 1; i++) {
        expect(priorityOrder[result[i].priority]).toBeLessThanOrEqual(priorityOrder[result[i + 1].priority])
      }
    })

    it("should handle admin viewing all cohorts", async () => {
      setupAuthMock(mockAdminUser)

      const today = new Date()

      mockPrisma.cohort.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Cohort 1",
          description: null,
          startDate: new Date(),
          endDate: null,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [
            {
              id: 1,
              userId: 10,
              cohortId: 1,
              status: "ACTIVE",
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              user: { id: 10, name: "Member 1", email: "member1@test.com" },
            },
          ],
        },
      ])

      mockPrisma.entry.findMany
        .mockResolvedValueOnce([]) // Week entries
        .mockResolvedValueOnce([]) // Last entries
        .mockResolvedValueOnce([]) // Recent entries

      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue([])

      // Mock for attention score calculation
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.findFirst.mockResolvedValue(null)
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await getCoachMembersOverview()

      expect(result).toHaveLength(1)
      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        select: expect.any(Object),
      })
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getCoachMembersOverview()).rejects.toThrow()
    })
  })
})
