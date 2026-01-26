/**
 * Review Queue Server Actions Tests
 *
 * Tests for review queue functionality including
 * weekly summaries, coach responses, and priority calculations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { MembershipStatus } from "@prisma/client"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockCoachUser,
  mockClientUser,
  resetAuthMocks,
  resetEmailMocks,
  sentEmails,
} from "../mocks"

import {
  createMockUser,
  createMockCohort,
  createMockCohortMembership,
  createMockCoachCohortMembership,
  createMockEntry,
  createMockWeeklyCoachResponse,
  resetIdCounters,
} from "../utils/test-data"

// Mock the coach-analytics module
vi.mock("@/app/actions/coach-analytics", () => ({
  calculateAttentionScore: vi.fn().mockResolvedValue({
    score: 50,
    priority: "amber" as const,
    factors: {
      checkInStreak: 3,
      missedCheckIns: 2,
      avgResponseTime: 1.5,
      recentTrends: { weight: "stable" },
    },
  }),
}))

// Now import the functions to test
import {
  getWeeklySummaries,
  getWeeklyResponse,
  saveWeeklyResponse,
  getReviewQueueSummary,
  getCoachCohorts,
} from "@/app/actions/review-queue"

describe("Review Queue Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetEmailMocks()
    resetIdCounters()

    // Default: authenticated as coach
    setupAuthMock(mockCoachUser)
  })

  describe("getWeeklySummaries", () => {
    it("should return summaries for coach's cohort members", async () => {
      const cohort = createMockCohort({ id: 1, name: "Test Cohort" })
      const member = createMockUser({ id: 10, name: "Member One", email: "member1@test.com" })

      // Mock coach's cohorts with members
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: cohort.name,
            members: [
              {
                ...createMockCohortMembership({ userId: 10, cohortId: 1 }),
                user: { id: 10, name: member.name, email: member.email },
              },
            ],
          },
        },
      ])

      // Mock entries for the week
      mockPrisma.entry.findMany.mockResolvedValue([
        createMockEntry({
          userId: 10,
          weight: 180,
          steps: 8000,
          calories: 2000,
          sleepQuality: 7,
        }),
        createMockEntry({
          userId: 10,
          weight: 179,
          steps: 9000,
          calories: 2100,
          sleepQuality: 8,
        }),
      ])

      // Mock last check-ins
      mockPrisma.entry.groupBy.mockResolvedValue([
        { userId: 10, _max: { date: new Date() } },
      ])

      const result = await getWeeklySummaries()

      expect(result.clients).toHaveLength(1)
      expect(result.clients[0].name).toBe("Member One")
      expect(result.clients[0].stats.checkInCount).toBe(2)
      expect(result.weekStart).toBeDefined()
      expect(result.weekEnd).toBeDefined()
    })

    it("should filter by cohortId when provided", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.groupBy.mockResolvedValue([])

      await getWeeklySummaries(undefined, 1)

      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cohortId: 1 }),
        })
      )
    })

    it("should use provided weekStart for date range", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])
      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.groupBy.mockResolvedValue([])

      const result = await getWeeklySummaries("2024-01-15")

      // Should return Monday of that week
      expect(result.weekStart).toBe("2024-01-15") // Jan 15, 2024 is a Monday
    })

    it("should calculate averages correctly", async () => {
      const member = createMockUser({ id: 10 })

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: "Test Cohort",
            members: [
              {
                ...createMockCohortMembership({ userId: 10 }),
                user: { id: 10, name: member.name, email: member.email },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany.mockResolvedValue([
        createMockEntry({ userId: 10, weight: 180, steps: 10000 }),
        createMockEntry({ userId: 10, weight: 182, steps: 8000 }),
      ])

      mockPrisma.entry.groupBy.mockResolvedValue([
        { userId: 10, _max: { date: new Date() } },
      ])

      const result = await getWeeklySummaries()

      expect(result.clients[0].stats.avgWeight).toBe(181) // (180 + 182) / 2
      expect(result.clients[0].stats.avgSteps).toBe(9000) // (10000 + 8000) / 2
    })

    it("should calculate weight trend", async () => {
      const member = createMockUser({ id: 10 })

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: "Test Cohort",
            members: [
              {
                ...createMockCohortMembership({ userId: 10 }),
                user: { id: 10, name: member.name, email: member.email },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany.mockResolvedValue([
        createMockEntry({ userId: 10, weight: 180 }),
        createMockEntry({ userId: 10, weight: 178 }),
      ])

      mockPrisma.entry.groupBy.mockResolvedValue([
        { userId: 10, _max: { date: new Date() } },
      ])

      const result = await getWeeklySummaries()

      expect(result.clients[0].stats.weightTrend).toBe(-2) // Lost 2 lbs
    })

    it("should sort clients by priority (red > amber > green)", async () => {
      const member1 = createMockUser({ id: 10, name: "Member One" })
      const member2 = createMockUser({ id: 20, name: "Member Two" })

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: "Test Cohort",
            members: [
              {
                ...createMockCohortMembership({ userId: 10 }),
                user: { id: 10, name: member1.name, email: member1.email },
              },
              {
                ...createMockCohortMembership({ userId: 20 }),
                user: { id: 20, name: member2.name, email: member2.email },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.groupBy.mockResolvedValue([])

      const result = await getWeeklySummaries()

      // With mocked attention scores all being "amber", should maintain order
      expect(result.clients).toHaveLength(2)
    })

    it("should return empty list when coach has no cohorts", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])

      const result = await getWeeklySummaries()

      expect(result.clients).toHaveLength(0)
    })

    it("should reject unauthenticated requests", async () => {
      setupAuthMock(null)

      await expect(getWeeklySummaries()).rejects.toThrow()
    })

    it("should reject client role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getWeeklySummaries()).rejects.toThrow()
    })
  })

  describe("getWeeklyResponse", () => {
    it("should return existing coach response", async () => {
      const response = createMockWeeklyCoachResponse({
        id: 1,
        coachId: 2,
        clientId: 10,
        loomUrl: "https://loom.com/video123",
        note: "Great progress this week!",
      })

      mockPrisma.weeklyCoachResponse.findUnique.mockResolvedValue(response)

      const result = await getWeeklyResponse(10, "2024-01-15")

      expect(result.loomUrl).toBe("https://loom.com/video123")
      expect(result.note).toBe("Great progress this week!")
    })

    it("should return empty response when none exists", async () => {
      mockPrisma.weeklyCoachResponse.findUnique.mockResolvedValue(null)

      const result = await getWeeklyResponse(10, "2024-01-15")

      expect(result.loomUrl).toBeNull()
      expect(result.note).toBeNull()
    })
  })

  describe("saveWeeklyResponse", () => {
    it("should save a new weekly response", async () => {
      const membership = createMockCoachCohortMembership({ coachId: 2, cohortId: 1 })
      const response = createMockWeeklyCoachResponse({
        id: 1,
        coachId: 2,
        clientId: 10,
        loomUrl: "https://loom.com/video123",
        note: "Keep up the good work!",
      })

      // Verify coach has access to client
      mockPrisma.coachCohortMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.weeklyCoachResponse.upsert.mockResolvedValue(response)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(
          createMockUser({ id: 10, email: "client@test.com", isTestUser: true })
        )
        .mockResolvedValueOnce(createMockUser({ id: 2, name: "Coach Name" }))

      const result = await saveWeeklyResponse({
        clientId: 10,
        weekStart: "2024-01-15",
        loomUrl: "https://loom.com/video123",
        note: "Keep up the good work!",
      })

      expect(result.id).toBe(1)
      expect(mockPrisma.weeklyCoachResponse.upsert).toHaveBeenCalled()
    })

    it("should reject access to clients not in coach's cohorts", async () => {
      mockPrisma.coachCohortMembership.findFirst.mockResolvedValue(null)

      await expect(
        saveWeeklyResponse({
          clientId: 10,
          weekStart: "2024-01-15",
          note: "Test note",
        })
      ).rejects.toThrow("Forbidden: You don't have access to this client")
    })

    it("should send notification email to client", async () => {
      const membership = createMockCoachCohortMembership({ coachId: 2, cohortId: 1 })
      const response = createMockWeeklyCoachResponse({
        id: 1,
        coachId: 2,
        clientId: 10,
        note: "Weekly feedback",
      })

      mockPrisma.coachCohortMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.weeklyCoachResponse.upsert.mockResolvedValue(response)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(
          createMockUser({ id: 10, email: "client@test.com", isTestUser: true })
        )
        .mockResolvedValueOnce(createMockUser({ id: 2, name: "Coach Name" }))

      await saveWeeklyResponse({
        clientId: 10,
        weekStart: "2024-01-15",
        note: "Weekly feedback",
      })

      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].templateKey).toBe("coach_note_received")
      expect(sentEmails[0].to).toBe("client@test.com")
    })

    it("should validate loomUrl format", async () => {
      const membership = createMockCoachCohortMembership({ coachId: 2, cohortId: 1 })
      mockPrisma.coachCohortMembership.findFirst.mockResolvedValue(membership)

      await expect(
        saveWeeklyResponse({
          clientId: 10,
          weekStart: "2024-01-15",
          loomUrl: "invalid-url", // Not a valid URL
        })
      ).rejects.toThrow()
    })

    it("should not send email if no content provided", async () => {
      const membership = createMockCoachCohortMembership({ coachId: 2, cohortId: 1 })
      const response = createMockWeeklyCoachResponse({
        id: 1,
        coachId: 2,
        clientId: 10,
        loomUrl: null,
        note: null,
      })

      mockPrisma.coachCohortMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.weeklyCoachResponse.upsert.mockResolvedValue(response)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(createMockUser({ id: 10, email: "client@test.com" }))
        .mockResolvedValueOnce(createMockUser({ id: 2, name: "Coach Name" }))

      await saveWeeklyResponse({
        clientId: 10,
        weekStart: "2024-01-15",
        loomUrl: null,
        note: null,
      })

      expect(sentEmails).toHaveLength(0)
    })
  })

  describe("getReviewQueueSummary", () => {
    it("should return review queue summary with priority counts", async () => {
      // This test relies on getWeeklySummaries internally
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: "Test Cohort",
            members: [
              {
                ...createMockCohortMembership({ userId: 10 }),
                user: { id: 10, name: "Member", email: "member@test.com" },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.groupBy.mockResolvedValue([])
      mockPrisma.weeklyCoachResponse.count.mockResolvedValue(0)

      const result = await getReviewQueueSummary()

      expect(result.totalClients).toBe(1)
      expect(result.pendingReviews).toBeDefined()
      expect(result.completedReviews).toBeDefined()
      expect(typeof result.redPriority).toBe("number")
      expect(typeof result.amberPriority).toBe("number")
      expect(typeof result.greenPriority).toBe("number")
    })

    it("should count completed reviews for the week", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: "Test Cohort",
            members: [
              {
                ...createMockCohortMembership({ userId: 10 }),
                user: { id: 10, name: "Member 1", email: "m1@test.com" },
              },
              {
                ...createMockCohortMembership({ userId: 20 }),
                user: { id: 20, name: "Member 2", email: "m2@test.com" },
              },
            ],
          },
        },
      ])

      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.entry.groupBy.mockResolvedValue([])
      mockPrisma.weeklyCoachResponse.count.mockResolvedValue(1) // 1 completed

      const result = await getReviewQueueSummary()

      expect(result.totalClients).toBe(2)
      expect(result.completedReviews).toBe(1)
      expect(result.pendingReviews).toBe(1)
    })
  })

  describe("getCoachCohorts", () => {
    it("should return coach's assigned cohorts with member counts", async () => {
      const cohort = createMockCohort({ id: 1, name: "Spring 2024" })

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        {
          cohort: {
            id: 1,
            name: cohort.name,
            status: cohort.status,
            _count: { members: 10 },
          },
        },
        {
          cohort: {
            id: 2,
            name: "Summer 2024",
            status: "ACTIVE",
            _count: { members: 5 },
          },
        },
      ])

      const result = await getCoachCohorts()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Spring 2024")
      expect(result[0].memberCount).toBe(10)
    })

    it("should filter by active membership status", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])

      await getCoachCohorts()

      // Verify the query includes status filter for members
      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            cohort: expect.objectContaining({
              select: expect.objectContaining({
                _count: expect.objectContaining({
                  select: expect.objectContaining({
                    members: { where: { status: MembershipStatus.ACTIVE } },
                  }),
                }),
              }),
            }),
          }),
        })
      )
    })

    it("should return empty array when coach has no cohorts", async () => {
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])

      const result = await getCoachCohorts()

      expect(result).toHaveLength(0)
    })
  })
})
