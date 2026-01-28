/**
 * Reports Server Actions Tests
 *
 * Tests for report-related server actions including
 * dashboard overview, member engagement, cohort analytics,
 * revenue, compliance, session attendance, and membership reports.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

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
  getDashboardOverview,
  getMemberEngagementReport,
  getCohortReport,
  getRevenueReport,
  getComplianceReport,
  getSessionAttendanceReport,
  getMembershipReport,
} from "@/app/actions/reports"

describe("Reports Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()

    // Default: authenticated as admin
    setupAuthMock(mockAdminUser)
  })

  // ==========================================
  // getDashboardOverview
  // ==========================================

  describe("getDashboardOverview", () => {
    it("should return overview stats for admin", async () => {
      setupAuthMock(mockAdminUser)

      // Mock the 8 parallel queries in Promise.all
      mockPrisma.cohortMembership.count
        .mockResolvedValueOnce(25) // totalMembers (ACTIVE)
        .mockResolvedValueOnce(5)  // newMembersThisMonth
        .mockResolvedValueOnce(3)  // newMembersLastMonth
        .mockResolvedValueOnce(2)  // attentionRequired

      mockPrisma.cohort.count.mockResolvedValueOnce(4) // activeCohorts

      mockPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: { toString: () => "5000" } } }) // monthlyRevenue
        .mockResolvedValueOnce({ _sum: { totalAmount: { toString: () => "4000" } } }) // lastMonthRevenue

      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValueOnce(3) // pendingQuestionnaires

      const result = await getDashboardOverview()

      expect(result).toEqual({
        totalMembers: 25,
        activeCohorts: 4,
        monthlyRevenue: 5000,
        pendingQuestionnaires: 3,
        memberGrowth: expect.any(Number),
        revenueGrowth: expect.any(Number),
        attentionRequired: 2,
      })

      // memberGrowth = ((5 - 3) / 3) * 100 = 66.67
      expect(result.memberGrowth).toBeCloseTo(66.67, 1)
      // revenueGrowth = ((5000 - 4000) / 4000) * 100 = 25
      expect(result.revenueGrowth).toBeCloseTo(25, 1)
    })

    it("should filter by coach cohorts for coach user", async () => {
      setupAuthMock(mockCoachUser)

      // Coach needs coachCohortMembership lookup
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { cohortId: 1 },
        { cohortId: 2 },
      ])

      mockPrisma.cohortMembership.count
        .mockResolvedValueOnce(10) // totalMembers (filtered)
        .mockResolvedValueOnce(2)  // newMembersThisMonth (filtered)
        .mockResolvedValueOnce(1)  // newMembersLastMonth (filtered)
        .mockResolvedValueOnce(1)  // attentionRequired (filtered)

      mockPrisma.cohort.count.mockResolvedValueOnce(2) // activeCohorts (filtered)

      // Coach does not get revenue queries - resolves to null
      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValueOnce(1)

      const result = await getDashboardOverview()

      expect(result.totalMembers).toBe(10)
      expect(result.activeCohorts).toBe(2)
      expect(result.monthlyRevenue).toBe(0) // Coach gets 0 revenue
      expect(result.pendingQuestionnaires).toBe(1)
      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalled()
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getDashboardOverview()).rejects.toThrow("Forbidden")
    })

    it("should handle zero last month values gracefully", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.cohortMembership.count
        .mockResolvedValueOnce(10) // totalMembers
        .mockResolvedValueOnce(5)  // newMembersThisMonth
        .mockResolvedValueOnce(0)  // newMembersLastMonth (zero)
        .mockResolvedValueOnce(0)  // attentionRequired

      mockPrisma.cohort.count.mockResolvedValueOnce(2)

      mockPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: { toString: () => "1000" } } })
        .mockResolvedValueOnce({ _sum: { totalAmount: null } }) // no revenue last month

      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValueOnce(0)

      const result = await getDashboardOverview()

      // When lastMonth is 0 and thisMonth > 0 => 100% growth
      expect(result.memberGrowth).toBe(100)
      expect(result.revenueGrowth).toBe(100)
    })

    it("should handle null aggregate results", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.cohortMembership.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      mockPrisma.cohort.count.mockResolvedValueOnce(0)

      mockPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: null } })
        .mockResolvedValueOnce({ _sum: { totalAmount: null } })

      mockPrisma.weeklyQuestionnaireResponse.count.mockResolvedValueOnce(0)

      const result = await getDashboardOverview()

      expect(result.monthlyRevenue).toBe(0)
      expect(result.revenueGrowth).toBe(0)
      expect(result.memberGrowth).toBe(0)
    })
  })

  // ==========================================
  // getMemberEngagementReport
  // ==========================================

  describe("getMemberEngagementReport", () => {
    it("should return engagement report for admin", async () => {
      setupAuthMock(mockAdminUser)

      // All memberships
      mockPrisma.cohortMembership.findMany.mockResolvedValueOnce([
        { status: "ACTIVE", joinedAt: new Date(), userId: 1 },
        { status: "ACTIVE", joinedAt: new Date(), userId: 2 },
        { status: "INACTIVE", joinedAt: new Date("2024-01-01"), userId: 3 },
      ])

      // Active members (checked in within 7 days) - groupBy returns grouped user rows
      mockPrisma.entry.groupBy
        .mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }]) // active members
        .mockResolvedValueOnce([ // check-in trend
          { date: new Date("2025-01-20"), _count: { id: 3 } },
          { date: new Date("2025-01-21"), _count: { id: 5 } },
        ])

      const result = await getMemberEngagementReport()

      expect(result.totalMembers).toBe(3)
      expect(result.activeMembers).toBe(2)
      expect(result.inactiveMembers).toBe(1)
      expect(result.membersByStatus).toEqual(
        expect.arrayContaining([
          { status: "ACTIVE", count: 2 },
          { status: "INACTIVE", count: 1 },
        ])
      )
      expect(result.checkInTrend).toHaveLength(2)
      expect(result.avgCheckInsPerMember).toBeCloseTo(8 / 3, 2) // (3+5) / 3 members
    })

    it("should filter by coach cohorts for coach user", async () => {
      setupAuthMock(mockCoachUser)

      // Coach needs coachCohortMembership lookup
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { cohortId: 1 },
      ])

      // Filtered memberships for coach's cohorts (userId lookup)
      mockPrisma.cohortMembership.findMany
        .mockResolvedValueOnce([{ userId: 10 }]) // memberUserIds
        .mockResolvedValueOnce([ // all memberships for status counts
          { status: "ACTIVE", joinedAt: new Date(), userId: 10 },
        ])

      mockPrisma.entry.groupBy
        .mockResolvedValueOnce([{ userId: 10 }]) // active members
        .mockResolvedValueOnce([]) // check-in trend

      const result = await getMemberEngagementReport()

      expect(result.totalMembers).toBe(1)
      expect(result.activeMembers).toBe(1)
      expect(result.inactiveMembers).toBe(0)
      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalled()
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMemberEngagementReport()).rejects.toThrow("Forbidden")
    })

    it("should handle zero members gracefully", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.cohortMembership.findMany.mockResolvedValueOnce([])
      mockPrisma.entry.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await getMemberEngagementReport()

      expect(result.totalMembers).toBe(0)
      expect(result.activeMembers).toBe(0)
      expect(result.avgCheckInsPerMember).toBe(0)
    })
  })

  // ==========================================
  // getCohortReport
  // ==========================================

  describe("getCohortReport", () => {
    it("should return cohort breakdown for admin", async () => {
      setupAuthMock(mockAdminUser)

      const mockCohorts = [
        {
          id: 1,
          name: "Weight Loss Q1",
          status: "ACTIVE",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-03-31"),
          members: [
            { user: { entries: [{ id: 1 }] } }, // active
            { user: { entries: [] } },            // inactive
          ],
        },
        {
          id: 2,
          name: "Fitness Q4",
          status: "COMPLETED",
          startDate: new Date("2024-10-01"),
          endDate: new Date("2024-12-31"),
          members: [
            { user: { entries: [{ id: 2 }] } },
          ],
        },
      ]

      mockPrisma.cohort.findMany.mockResolvedValue(mockCohorts)

      const result = await getCohortReport()

      expect(result.totalCohorts).toBe(2)
      expect(result.activeCohorts).toBe(1)
      expect(result.completedCohorts).toBe(1)
      expect(result.cohortBreakdown).toHaveLength(2)
      expect(result.cohortBreakdown[0]).toEqual({
        id: 1,
        name: "Weight Loss Q1",
        status: "ACTIVE",
        memberCount: 2,
        avgEngagement: 50, // 1 active out of 2
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-03-31"),
      })
    })

    it("should filter by coach cohorts for coach user", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { cohortId: 1 },
      ])

      mockPrisma.cohort.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Coach Cohort",
          status: "ACTIVE",
          startDate: new Date("2025-01-01"),
          endDate: null,
          members: [],
        },
      ])

      const result = await getCohortReport()

      expect(result.totalCohorts).toBe(1)
      expect(result.cohortBreakdown[0].name).toBe("Coach Cohort")
      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalled()
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getCohortReport()).rejects.toThrow("Forbidden")
    })

    it("should handle empty cohorts", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.cohort.findMany.mockResolvedValue([])

      const result = await getCohortReport()

      expect(result.totalCohorts).toBe(0)
      expect(result.activeCohorts).toBe(0)
      expect(result.completedCohorts).toBe(0)
      expect(result.cohortBreakdown).toEqual([])
    })

    it("should calculate engagement as 0 for cohorts with no members", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.cohort.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Empty Cohort",
          status: "ACTIVE",
          startDate: new Date("2025-01-01"),
          endDate: null,
          members: [],
        },
      ])

      const result = await getCohortReport()

      expect(result.cohortBreakdown[0].avgEngagement).toBe(0)
      expect(result.cohortBreakdown[0].memberCount).toBe(0)
    })
  })

  // ==========================================
  // getRevenueReport (Admin Only)
  // ==========================================

  describe("getRevenueReport", () => {
    const now = new Date()
    const currentYear = now.getFullYear()

    it("should return revenue data for admin", async () => {
      setupAuthMock(mockAdminUser)

      const mockInvoices = [
        {
          id: 1,
          userId: 10,
          totalAmount: { toString: () => "5000" },
          paymentStatus: "PAID",
          paidAt: new Date(),
          month: new Date(currentYear, now.getMonth(), 1),
          user: { id: 10, name: "Alice Smith", email: "alice@test.com" },
        },
        {
          id: 2,
          userId: 11,
          totalAmount: { toString: () => "3000" },
          paymentStatus: "PAID",
          paidAt: new Date(),
          month: new Date(currentYear, now.getMonth(), 1),
          user: { id: 11, name: "Bob Jones", email: "bob@test.com" },
        },
        {
          id: 3,
          userId: 12,
          totalAmount: { toString: () => "2000" },
          paymentStatus: "UNPAID",
          paidAt: null,
          month: new Date(currentYear, now.getMonth(), 1),
          user: { id: 12, name: "Carol Lee", email: "carol@test.com" },
        },
      ]

      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)

      const result = await getRevenueReport(currentYear)

      // Total revenue is only PAID invoices: 5000 + 3000 = 8000
      expect(result.totalRevenue).toBe(8000)
      expect(result.invoicesByStatus).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "PAID", count: 2 }),
          expect.objectContaining({ status: "UNPAID", count: 1 }),
        ])
      )
      expect(result.monthlyRevenue).toHaveLength(12) // always 12 months
      expect(result.topClients).toHaveLength(2) // only paid clients
      expect(result.topClients[0].name).toBe("Alice Smith")
      expect(result.topClients[0].totalRevenue).toBe(5000)
    })

    it("should reject non-admin access (coach)", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getRevenueReport()).rejects.toThrow("Forbidden")
    })

    it("should reject non-admin access (client)", async () => {
      setupAuthMock(mockClientUser)

      await expect(getRevenueReport()).rejects.toThrow()
    })

    it("should handle empty invoices", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.invoice.findMany.mockResolvedValue([])

      const result = await getRevenueReport(currentYear)

      expect(result.totalRevenue).toBe(0)
      expect(result.revenueThisMonth).toBe(0)
      expect(result.revenueLastMonth).toBe(0)
      expect(result.monthOverMonthGrowth).toBe(0)
      expect(result.invoicesByStatus).toEqual([])
      expect(result.topClients).toEqual([])
      expect(result.monthlyRevenue).toHaveLength(12)
    })

    it("should calculate month-over-month growth correctly", async () => {
      setupAuthMock(mockAdminUser)

      const thisMonth = new Date(currentYear, now.getMonth(), 15)
      const lastMonth = new Date(currentYear, now.getMonth() - 1, 15)

      const mockInvoices = [
        {
          id: 1,
          userId: 10,
          totalAmount: { toString: () => "6000" },
          paymentStatus: "PAID",
          paidAt: thisMonth,
          month: new Date(currentYear, now.getMonth(), 1),
          user: { id: 10, name: "Alice", email: "alice@test.com" },
        },
        {
          id: 2,
          userId: 10,
          totalAmount: { toString: () => "4000" },
          paymentStatus: "PAID",
          paidAt: lastMonth,
          month: new Date(currentYear, now.getMonth() - 1, 1),
          user: { id: 10, name: "Alice", email: "alice@test.com" },
        },
      ]

      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)

      const result = await getRevenueReport(currentYear)

      // Growth = ((6000 - 4000) / 4000) * 100 = 50%
      expect(result.monthOverMonthGrowth).toBeCloseTo(50, 0)
    })
  })

  // ==========================================
  // getComplianceReport
  // ==========================================

  describe("getComplianceReport", () => {
    it("should return compliance stats for admin", async () => {
      setupAuthMock(mockAdminUser)

      const mockBundles = [
        {
          id: 1,
          weekNumber: 1,
          isActive: true,
          cohortId: 1,
          cohort: {
            id: 1,
            name: "Cohort A",
            members: [{ id: 1 }, { id: 2 }, { id: 3 }],
          },
          responses: [
            { id: 1, status: "COMPLETED" },
            { id: 2, status: "COMPLETED" },
            { id: 3, status: "IN_PROGRESS" },
          ],
        },
        {
          id: 2,
          weekNumber: 2,
          isActive: true,
          cohortId: 1,
          cohort: {
            id: 1,
            name: "Cohort A",
            members: [{ id: 1 }, { id: 2 }, { id: 3 }],
          },
          responses: [
            { id: 4, status: "COMPLETED" },
          ],
        },
      ]

      mockPrisma.questionnaireBundle.findMany.mockResolvedValue(mockBundles)

      const result = await getComplianceReport()

      expect(result.totalQuestionnaires).toBe(2)
      // Bundle 1: 2 completed, 1 in-progress, 0 not-started (3 members, 3 responses)
      // Bundle 2: 1 completed, 0 in-progress, 2 not-started (3 members, 1 response)
      expect(result.completedResponses).toBe(3) // 2 + 1
      expect(result.pendingResponses).toBe(3) // (1 in-progress) + (0 from bundle1 expected-actual) + (2 from bundle2 expected-actual)
      expect(result.completionRate).toBeGreaterThan(0)
      expect(result.responsesByWeek).toHaveLength(2)
      expect(result.cohortCompliance).toHaveLength(1) // both bundles are for cohort 1
      expect(result.cohortCompliance[0].cohortName).toBe("Cohort A")
    })

    it("should filter by coach cohorts for coach user", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { cohortId: 1 },
      ])

      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([
        {
          id: 1,
          weekNumber: 1,
          isActive: true,
          cohortId: 1,
          cohort: {
            id: 1,
            name: "Coach Cohort",
            members: [{ id: 1 }],
          },
          responses: [
            { id: 1, status: "COMPLETED" },
          ],
        },
      ])

      const result = await getComplianceReport()

      expect(result.totalQuestionnaires).toBe(1)
      expect(result.completedResponses).toBe(1)
      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalled()
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getComplianceReport()).rejects.toThrow("Forbidden")
    })

    it("should handle empty bundles", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      const result = await getComplianceReport()

      expect(result.totalQuestionnaires).toBe(0)
      expect(result.completedResponses).toBe(0)
      expect(result.pendingResponses).toBe(0)
      expect(result.completionRate).toBe(0)
      expect(result.responsesByWeek).toEqual([])
      expect(result.cohortCompliance).toEqual([])
    })
  })

  // ==========================================
  // getSessionAttendanceReport
  // ==========================================

  describe("getSessionAttendanceReport", () => {
    it("should return attendance stats for admin", async () => {
      setupAuthMock(mockAdminUser)

      const now = new Date()

      const mockSessions = [
        { id: 1, status: "COMPLETED", startTime: new Date("2025-01-10"), maxOccupancy: 10, classType: { name: "HIIT" } },
        { id: 2, status: "COMPLETED", startTime: new Date("2025-01-12"), maxOccupancy: 8, classType: { name: "Yoga" } },
        { id: 3, status: "CANCELLED", startTime: new Date("2025-01-14"), maxOccupancy: 10, classType: { name: "HIIT" } },
        { id: 4, status: "SCHEDULED", startTime: new Date(now.getTime() + 86400000), maxOccupancy: 10, classType: { name: "HIIT" } },
      ]

      const mockRegistrations = [
        { status: "ATTENDED", sessionId: 1 },
        { status: "ATTENDED", sessionId: 1 },
        { status: "NO_SHOW", sessionId: 1 },
        { status: "ATTENDED", sessionId: 2 },
        { status: "LATE_CANCELLED", sessionId: 2 },
        { status: "REGISTERED", sessionId: 4 },
      ]

      const mockClassTypes = [
        {
          id: 1,
          name: "HIIT",
          sessions: [
            { id: 1, registrations: [{ status: "ATTENDED" }, { status: "ATTENDED" }] },
          ],
        },
        {
          id: 2,
          name: "Yoga",
          sessions: [
            { id: 2, registrations: [{ status: "ATTENDED" }] },
          ],
        },
      ]

      // First parallel queries
      mockPrisma.classSession.findMany
        .mockResolvedValueOnce(mockSessions) // allSessions
        .mockResolvedValueOnce([]) // recentSessions for trend (12 weeks)

      mockPrisma.sessionRegistration.findMany.mockResolvedValue(mockRegistrations)
      mockPrisma.classType.findMany.mockResolvedValue(mockClassTypes)

      const result = await getSessionAttendanceReport()

      expect(result.totalSessions).toBe(4)
      expect(result.completedSessions).toBe(2)
      expect(result.cancelledSessions).toBe(1)
      expect(result.upcomingSessions).toBe(1)
      expect(result.totalRegistrations).toBe(6)
      // Attendance rate: 3 attended / 6 total = 50%
      expect(result.attendanceRate).toBeCloseTo(50, 0)
      // No-show rate: 1 / 6 = 16.67%
      expect(result.noShowRate).toBeCloseTo(16.67, 0)
      expect(result.popularClassTypes).toHaveLength(2)
    })

    it("should filter by coach sessions for coach user", async () => {
      setupAuthMock(mockCoachUser)

      mockPrisma.classSession.findMany
        .mockResolvedValueOnce([
          { id: 1, status: "COMPLETED", startTime: new Date("2025-01-10"), maxOccupancy: 5, classType: { name: "Pilates" } },
        ])
        .mockResolvedValueOnce([]) // recentSessions

      mockPrisma.sessionRegistration.findMany.mockResolvedValue([
        { status: "ATTENDED", sessionId: 1 },
      ])

      mockPrisma.classType.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Pilates",
          sessions: [
            { id: 1, registrations: [{ status: "ATTENDED" }] },
          ],
        },
      ])

      const result = await getSessionAttendanceReport()

      expect(result.totalSessions).toBe(1)
      expect(result.completedSessions).toBe(1)
      expect(result.totalRegistrations).toBe(1)
      expect(result.attendanceRate).toBe(100)
    })

    it("should reject client access", async () => {
      setupAuthMock(mockClientUser)

      await expect(getSessionAttendanceReport()).rejects.toThrow("Forbidden")
    })

    it("should handle zero registrations", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.classSession.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrisma.sessionRegistration.findMany.mockResolvedValue([])
      mockPrisma.classType.findMany.mockResolvedValue([])

      const result = await getSessionAttendanceReport()

      expect(result.totalSessions).toBe(0)
      expect(result.totalRegistrations).toBe(0)
      expect(result.attendanceRate).toBe(0)
      expect(result.noShowRate).toBe(0)
      expect(result.averageOccupancy).toBe(0)
    })

    it("should calculate average occupancy correctly", async () => {
      setupAuthMock(mockAdminUser)

      // Two sessions: one with 5/10 = 50% occupancy, one with 8/10 = 80%
      const mockSessions = [
        { id: 1, status: "COMPLETED", startTime: new Date("2025-01-10"), maxOccupancy: 10, classType: { name: "HIIT" } },
        { id: 2, status: "COMPLETED", startTime: new Date("2025-01-12"), maxOccupancy: 10, classType: { name: "HIIT" } },
      ]

      const mockRegistrations = [
        // Session 1: 3 REGISTERED + 2 ATTENDED = 5 occupancy
        { status: "REGISTERED", sessionId: 1 },
        { status: "REGISTERED", sessionId: 1 },
        { status: "REGISTERED", sessionId: 1 },
        { status: "ATTENDED", sessionId: 1 },
        { status: "ATTENDED", sessionId: 1 },
        // Session 2: 4 REGISTERED + 4 ATTENDED = 8 occupancy
        { status: "REGISTERED", sessionId: 2 },
        { status: "REGISTERED", sessionId: 2 },
        { status: "REGISTERED", sessionId: 2 },
        { status: "REGISTERED", sessionId: 2 },
        { status: "ATTENDED", sessionId: 2 },
        { status: "ATTENDED", sessionId: 2 },
        { status: "ATTENDED", sessionId: 2 },
        { status: "ATTENDED", sessionId: 2 },
      ]

      mockPrisma.classSession.findMany
        .mockResolvedValueOnce(mockSessions)
        .mockResolvedValueOnce([])

      mockPrisma.sessionRegistration.findMany.mockResolvedValue(mockRegistrations)
      mockPrisma.classType.findMany.mockResolvedValue([])

      const result = await getSessionAttendanceReport()

      // Average occupancy: (50% + 80%) / 2 = 65%
      expect(result.averageOccupancy).toBeCloseTo(65, 0)
    })
  })

  // ==========================================
  // getMembershipReport (Admin Only)
  // ==========================================

  describe("getMembershipReport", () => {
    it("should return membership data for admin", async () => {
      setupAuthMock(mockAdminUser)

      // allMemberships
      mockPrisma.userMembership.findMany.mockResolvedValue([
        { status: "ACTIVE", plan: { type: "UNLIMITED" } },
        { status: "ACTIVE", plan: { type: "UNLIMITED" } },
        { status: "ACTIVE", plan: { type: "CLASS_PACK" } },
        { status: "PAUSED", plan: { type: "UNLIMITED" } },
        { status: "CANCELLED", plan: { type: "CLASS_PACK" } },
      ])

      // Count queries
      mockPrisma.userMembership.count
        .mockResolvedValueOnce(3)  // active
        .mockResolvedValueOnce(1)  // paused
        .mockResolvedValueOnce(1)  // cancelled
        .mockResolvedValueOnce(0)  // cancelledInLast30Days (for churn)

      // Plan stats
      mockPrisma.membershipPlan.findMany.mockResolvedValue([
        { name: "Unlimited Monthly", type: "UNLIMITED", userMemberships: [{}, {}] },
        { name: "10-Class Pack", type: "CLASS_PACK", userMemberships: [{}] },
      ])

      // Recent registrations
      mockPrisma.sessionRegistration.count.mockResolvedValue(15)

      const result = await getMembershipReport()

      expect(result.totalActiveMemberships).toBe(3)
      expect(result.totalPausedMemberships).toBe(1)
      expect(result.totalCancelledMemberships).toBe(1)
      expect(result.membershipsByType).toEqual(
        expect.arrayContaining([
          { type: "UNLIMITED", count: 3 },
          { type: "CLASS_PACK", count: 2 },
        ])
      )
      expect(result.planPopularity).toHaveLength(2)
      expect(result.planPopularity[0].planName).toBe("Unlimited Monthly")
      expect(result.planPopularity[0].activeCount).toBe(2)
      // averageSessionsPerMember = 15 / 3 = 5
      expect(result.averageSessionsPerMember).toBe(5)
    })

    it("should reject non-admin access (coach)", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getMembershipReport()).rejects.toThrow("Forbidden")
    })

    it("should reject non-admin access (client)", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMembershipReport()).rejects.toThrow()
    })

    it("should calculate churn rate correctly", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.userMembership.findMany.mockResolvedValue([
        { status: "ACTIVE", plan: { type: "UNLIMITED" } },
      ])

      mockPrisma.userMembership.count
        .mockResolvedValueOnce(8)   // active
        .mockResolvedValueOnce(0)   // paused
        .mockResolvedValueOnce(2)   // cancelled
        .mockResolvedValueOnce(2)   // cancelledInLast30Days

      mockPrisma.membershipPlan.findMany.mockResolvedValue([])
      mockPrisma.sessionRegistration.count.mockResolvedValue(0)

      const result = await getMembershipReport()

      // churnRate = cancelledInLast30Days / (active + cancelledInLast30Days) * 100
      // = 2 / (8 + 2) * 100 = 20%
      expect(result.churnRate).toBeCloseTo(20, 0)
    })

    it("should handle zero active memberships", async () => {
      setupAuthMock(mockAdminUser)

      mockPrisma.userMembership.findMany.mockResolvedValue([])

      mockPrisma.userMembership.count
        .mockResolvedValueOnce(0) // active
        .mockResolvedValueOnce(0) // paused
        .mockResolvedValueOnce(0) // cancelled
        .mockResolvedValueOnce(0) // cancelledInLast30Days

      mockPrisma.membershipPlan.findMany.mockResolvedValue([])
      mockPrisma.sessionRegistration.count.mockResolvedValue(0)

      const result = await getMembershipReport()

      expect(result.totalActiveMemberships).toBe(0)
      expect(result.churnRate).toBe(0)
      expect(result.averageSessionsPerMember).toBe(0)
      expect(result.membershipsByType).toEqual([])
      expect(result.planPopularity).toEqual([])
    })
  })

  // ==========================================
  // Authentication edge cases
  // ==========================================

  describe("authentication", () => {
    it("should reject unauthenticated access to getDashboardOverview", async () => {
      setupAuthMock(null)

      await expect(getDashboardOverview()).rejects.toThrow("Unauthorized")
    })

    it("should reject unauthenticated access to getMemberEngagementReport", async () => {
      setupAuthMock(null)

      await expect(getMemberEngagementReport()).rejects.toThrow("Unauthorized")
    })

    it("should reject unauthenticated access to getCohortReport", async () => {
      setupAuthMock(null)

      await expect(getCohortReport()).rejects.toThrow("Unauthorized")
    })
  })
})
