"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { requireAdmin, requireCoach } from "@/lib/auth"
import { startOfMonth, endOfMonth, subMonths, subDays, startOfWeek, endOfWeek, format as formatDate } from "date-fns"
import { PaymentStatus, CohortStatus, MembershipStatus, SessionStatus, RegistrationStatus, MembershipTierStatus, MembershipPlanType } from "@prisma/client"

/**
 * Reports Server Actions
 * Multi-domain analytics with role-based filtering
 * Generated with Claude Code
 */

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface ReportDateRange {
  from: Date
  to: Date
}

export interface MemberEngagementReport {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  newMembersThisMonth: number
  membersByStatus: {
    status: string
    count: number
  }[]
  checkInTrend: {
    date: string
    count: number
  }[]
  avgCheckInsPerMember: number
}

export interface CohortReport {
  totalCohorts: number
  activeCohorts: number
  completedCohorts: number
  cohortBreakdown: {
    id: number
    name: string
    status: string
    memberCount: number
    avgEngagement: number
    startDate: Date
    endDate: Date | null
  }[]
}

export interface RevenueReport {
  totalRevenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  monthOverMonthGrowth: number
  invoicesByStatus: {
    status: string
    count: number
    amount: number
  }[]
  monthlyRevenue: {
    month: string
    revenue: number
    invoiceCount: number
  }[]
  topClients: {
    id: number
    name: string | null
    email: string
    totalRevenue: number
    invoiceCount: number
  }[]
}

export interface ComplianceReport {
  totalQuestionnaires: number
  completedResponses: number
  pendingResponses: number
  completionRate: number
  responsesByWeek: {
    weekNumber: number
    completed: number
    pending: number
    total: number
  }[]
  cohortCompliance: {
    cohortId: number
    cohortName: string
    memberCount: number
    avgCompletionRate: number
  }[]
}

export interface DashboardOverview {
  totalMembers: number
  activeCohorts: number
  monthlyRevenue: number
  pendingQuestionnaires: number
  memberGrowth: number
  revenueGrowth: number
  attentionRequired: number
}

export interface SessionAttendanceReport {
  totalSessions: number
  completedSessions: number
  cancelledSessions: number
  upcomingSessions: number
  totalRegistrations: number
  attendanceRate: number
  noShowRate: number
  lateCancelRate: number
  averageOccupancy: number
  sessionsByStatus: { status: string; count: number }[]
  attendanceTrend: { date: string; attended: number; noShow: number; total: number }[]
  popularClassTypes: { name: string; sessionCount: number; avgAttendance: number }[]
}

export interface MembershipReport {
  totalActiveMemberships: number
  totalPausedMemberships: number
  totalCancelledMemberships: number
  membershipsByType: { type: string; count: number }[]
  planPopularity: { planName: string; activeCount: number; type: string }[]
  churnRate: number
  averageSessionsPerMember: number
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function getCoachCohortIds(coachId: number): Promise<number[]> {
  const coachCohorts = await prisma.coachCohortMembership.findMany({
    where: { coachId },
    select: { cohortId: true },
  })
  return coachCohorts.map((c) => c.cohortId)
}

async function requireCoachOrAdmin() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "COACH") {
    throw new Error("Forbidden")
  }

  return {
    userId: Number(session.user.id),
    role,
    isAdmin: role === "ADMIN",
  }
}

// ==========================================
// DASHBOARD OVERVIEW
// ==========================================

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { userId, isAdmin } = await requireCoachOrAdmin()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const sevenDaysAgo = subDays(now, 7)

  // Get cohort filter for coaches
  let cohortFilter: { cohortId?: { in: number[] } } = {}
  let cohortIds: number[] = []

  if (!isAdmin) {
    cohortIds = await getCoachCohortIds(userId)
    cohortFilter = { cohortId: { in: cohortIds } }
  }

  // Parallel queries for performance
  const [
    totalMembersResult,
    newMembersThisMonth,
    newMembersLastMonth,
    activeCohorts,
    monthlyRevenueResult,
    lastMonthRevenueResult,
    pendingQuestionnaires,
    attentionRequired,
  ] = await Promise.all([
    // Total members (in coach's cohorts or all)
    isAdmin
      ? prisma.cohortMembership.count({ where: { status: MembershipStatus.ACTIVE } })
      : prisma.cohortMembership.count({
          where: { status: MembershipStatus.ACTIVE, ...cohortFilter },
        }),

    // New members this month
    isAdmin
      ? prisma.cohortMembership.count({
          where: { joinedAt: { gte: thisMonthStart } },
        })
      : prisma.cohortMembership.count({
          where: { joinedAt: { gte: thisMonthStart }, ...cohortFilter },
        }),

    // New members last month
    isAdmin
      ? prisma.cohortMembership.count({
          where: { joinedAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        })
      : prisma.cohortMembership.count({
          where: { joinedAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...cohortFilter },
        }),

    // Active cohorts
    isAdmin
      ? prisma.cohort.count({ where: { status: CohortStatus.ACTIVE } })
      : prisma.cohort.count({
          where: {
            status: CohortStatus.ACTIVE,
            id: { in: cohortIds },
          },
        }),

    // Revenue this month (admin only)
    isAdmin
      ? prisma.invoice.aggregate({
          where: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: { gte: thisMonthStart },
          },
          _sum: { totalAmount: true },
        })
      : Promise.resolve({ _sum: { totalAmount: null } }),

    // Revenue last month (admin only)
    isAdmin
      ? prisma.invoice.aggregate({
          where: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          _sum: { totalAmount: true },
        })
      : Promise.resolve({ _sum: { totalAmount: null } }),

    // Pending questionnaires
    isAdmin
      ? prisma.weeklyQuestionnaireResponse.count({
          where: { status: "IN_PROGRESS" },
        })
      : prisma.weeklyQuestionnaireResponse.count({
          where: {
            status: "IN_PROGRESS",
            bundle: cohortFilter,
          },
        }),

    // Members needing attention (no check-in in 7 days)
    isAdmin
      ? prisma.cohortMembership.count({
          where: {
            status: MembershipStatus.ACTIVE,
            user: {
              entries: {
                none: { date: { gte: sevenDaysAgo } },
              },
            },
          },
        })
      : prisma.cohortMembership.count({
          where: {
            status: MembershipStatus.ACTIVE,
            ...cohortFilter,
            user: {
              entries: {
                none: { date: { gte: sevenDaysAgo } },
              },
            },
          },
        }),
  ])

  const monthlyRevenue = Number(monthlyRevenueResult._sum.totalAmount || 0)
  const lastMonthRevenue = Number(lastMonthRevenueResult._sum.totalAmount || 0)

  const memberGrowth = newMembersLastMonth > 0
    ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100
    : newMembersThisMonth > 0 ? 100 : 0

  const revenueGrowth = lastMonthRevenue > 0
    ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : monthlyRevenue > 0 ? 100 : 0

  return {
    totalMembers: totalMembersResult,
    activeCohorts,
    monthlyRevenue,
    pendingQuestionnaires,
    memberGrowth,
    revenueGrowth,
    attentionRequired,
  }
}

// ==========================================
// MEMBER ENGAGEMENT REPORT
// ==========================================

export async function getMemberEngagementReport(
  dateRange?: ReportDateRange
): Promise<MemberEngagementReport> {
  const { userId, isAdmin } = await requireCoachOrAdmin()

  const now = new Date()
  const from = dateRange?.from || subDays(now, 30)
  const to = dateRange?.to || now
  const sevenDaysAgo = subDays(now, 7)

  // Get cohort filter for coaches
  let cohortFilter: { cohortId?: { in: number[] } } = {}
  let memberUserIds: number[] = []

  if (!isAdmin) {
    const cohortIds = await getCoachCohortIds(userId)
    cohortFilter = { cohortId: { in: cohortIds } }

    const memberships = await prisma.cohortMembership.findMany({
      where: cohortFilter,
      select: { userId: true },
    })
    memberUserIds = memberships.map((m) => m.userId)
  }

  // Get all memberships (for status counts)
  const memberships = await prisma.cohortMembership.findMany({
    where: isAdmin ? {} : cohortFilter,
    select: {
      status: true,
      joinedAt: true,
      userId: true,
    },
  })

  // Dedupe members
  const uniqueMembers = new Set(memberships.map((m) => m.userId))
  const totalMembers = uniqueMembers.size

  // Active members (checked in within 7 days)
  const activeMembersCount = await prisma.entry.groupBy({
    by: ["userId"],
    where: {
      date: { gte: sevenDaysAgo },
      ...(isAdmin ? {} : { userId: { in: memberUserIds } }),
    },
  })

  const activeMembers = activeMembersCount.length
  const inactiveMembers = totalMembers - activeMembers

  // New members this month
  const thisMonthStart = startOfMonth(now)
  const newMembersThisMonth = memberships.filter(
    (m) => m.joinedAt >= thisMonthStart
  ).length

  // Members by status
  const statusCounts: Record<string, number> = {}
  memberships.forEach((m) => {
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1
  })
  const membersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }))

  // Check-in trend (daily counts for date range)
  const entries = await prisma.entry.groupBy({
    by: ["date"],
    where: {
      date: { gte: from, lte: to },
      ...(isAdmin ? {} : { userId: { in: memberUserIds } }),
    },
    _count: { id: true },
    orderBy: { date: "asc" },
  })

  const checkInTrend = entries.map((e) => ({
    date: formatDate(e.date, "yyyy-MM-dd"),
    count: e._count.id,
  }))

  // Average check-ins per member
  const totalCheckIns = checkInTrend.reduce((sum, e) => sum + e.count, 0)
  const avgCheckInsPerMember = totalMembers > 0
    ? totalCheckIns / totalMembers
    : 0

  return {
    totalMembers,
    activeMembers,
    inactiveMembers,
    newMembersThisMonth,
    membersByStatus,
    checkInTrend,
    avgCheckInsPerMember,
  }
}

// ==========================================
// COHORT REPORT
// ==========================================

export async function getCohortReport(): Promise<CohortReport> {
  const { userId, isAdmin } = await requireCoachOrAdmin()

  // Get cohort filter for coaches
  let cohortIds: number[] = []

  if (!isAdmin) {
    cohortIds = await getCoachCohortIds(userId)
  }

  const cohorts = await prisma.cohort.findMany({
    where: isAdmin ? {} : { id: { in: cohortIds } },
    include: {
      members: {
        where: { status: MembershipStatus.ACTIVE },
        include: {
          user: {
            include: {
              entries: {
                where: { date: { gte: subDays(new Date(), 7) } },
              },
            },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
  })

  const totalCohorts = cohorts.length
  const activeCohorts = cohorts.filter((c) => c.status === CohortStatus.ACTIVE).length
  const completedCohorts = cohorts.filter((c) => c.status === CohortStatus.COMPLETED).length

  const cohortBreakdown = cohorts.map((cohort) => {
    const memberCount = cohort.members.length
    const activeMembers = cohort.members.filter(
      (m) => m.user.entries.length > 0
    ).length
    const avgEngagement = memberCount > 0
      ? (activeMembers / memberCount) * 100
      : 0

    return {
      id: cohort.id,
      name: cohort.name,
      status: cohort.status,
      memberCount,
      avgEngagement,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
    }
  })

  return {
    totalCohorts,
    activeCohorts,
    completedCohorts,
    cohortBreakdown,
  }
}

// ==========================================
// REVENUE REPORT (Admin Only)
// ==========================================

export async function getRevenueReport(year?: number): Promise<RevenueReport> {
  await requireAdmin()

  const now = new Date()
  const targetYear = year || now.getFullYear()
  const yearStart = new Date(`${targetYear}-01-01`)
  const yearEnd = new Date(`${targetYear}-12-31`)
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // All invoices for the year
  const invoices = await prisma.invoice.findMany({
    where: {
      month: { gte: yearStart, lte: yearEnd },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { month: "asc" },
  })

  // Calculate total revenue (paid only)
  const paidInvoices = invoices.filter((i) => i.paymentStatus === PaymentStatus.PAID)
  const totalRevenue = paidInvoices.reduce(
    (sum, i) => sum + Number(i.totalAmount),
    0
  )

  // Revenue this month
  const thisMonthInvoices = paidInvoices.filter(
    (i) => i.paidAt && i.paidAt >= thisMonthStart
  )
  const revenueThisMonth = thisMonthInvoices.reduce(
    (sum, i) => sum + Number(i.totalAmount),
    0
  )

  // Revenue last month
  const lastMonthInvoices = paidInvoices.filter(
    (i) => i.paidAt && i.paidAt >= lastMonthStart && i.paidAt <= lastMonthEnd
  )
  const revenueLastMonth = lastMonthInvoices.reduce(
    (sum, i) => sum + Number(i.totalAmount),
    0
  )

  // Month over month growth
  const monthOverMonthGrowth = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : revenueThisMonth > 0 ? 100 : 0

  // Invoices by status
  const statusGroups: Record<string, { count: number; amount: number }> = {}
  invoices.forEach((i) => {
    const status = i.paymentStatus
    if (!statusGroups[status]) {
      statusGroups[status] = { count: 0, amount: 0 }
    }
    statusGroups[status].count++
    statusGroups[status].amount += Number(i.totalAmount)
  })
  const invoicesByStatus = Object.entries(statusGroups).map(([status, data]) => ({
    status,
    count: data.count,
    amount: data.amount,
  }))

  // Monthly revenue breakdown
  const monthlyGroups: Record<string, { revenue: number; invoiceCount: number }> = {}
  for (let m = 0; m < 12; m++) {
    const monthKey = formatDate(new Date(targetYear, m, 1), "yyyy-MM")
    monthlyGroups[monthKey] = { revenue: 0, invoiceCount: 0 }
  }

  paidInvoices.forEach((i) => {
    const monthKey = formatDate(i.month, "yyyy-MM")
    if (monthlyGroups[monthKey]) {
      monthlyGroups[monthKey].revenue += Number(i.totalAmount)
      monthlyGroups[monthKey].invoiceCount++
    }
  })

  const monthlyRevenue = Object.entries(monthlyGroups).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    invoiceCount: data.invoiceCount,
  }))

  // Top clients by revenue
  const clientRevenue: Record<number, { name: string | null; email: string; totalRevenue: number; invoiceCount: number }> = {}
  paidInvoices.forEach((i) => {
    if (!clientRevenue[i.userId]) {
      clientRevenue[i.userId] = {
        name: i.user.name,
        email: i.user.email,
        totalRevenue: 0,
        invoiceCount: 0,
      }
    }
    clientRevenue[i.userId].totalRevenue += Number(i.totalAmount)
    clientRevenue[i.userId].invoiceCount++
  })

  const topClients = Object.entries(clientRevenue)
    .map(([id, data]) => ({
      id: Number(id),
      ...data,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)

  return {
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    monthOverMonthGrowth,
    invoicesByStatus,
    monthlyRevenue,
    topClients,
  }
}

// ==========================================
// COMPLIANCE REPORT
// ==========================================

export async function getComplianceReport(): Promise<ComplianceReport> {
  const { userId, isAdmin } = await requireCoachOrAdmin()

  // Get cohort filter for coaches
  let cohortFilter: { cohortId?: { in: number[] } } = {}

  if (!isAdmin) {
    const cohortIds = await getCoachCohortIds(userId)
    cohortFilter = { cohortId: { in: cohortIds } }
  }

  // Get all questionnaire bundles
  const bundles = await prisma.questionnaireBundle.findMany({
    where: {
      isActive: true,
      ...(isAdmin ? {} : cohortFilter),
    },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
          members: {
            where: { status: MembershipStatus.ACTIVE },
          },
        },
      },
      responses: true,
    },
    orderBy: { weekNumber: "asc" },
  })

  const totalQuestionnaires = bundles.length

  // Response counts
  let completedResponses = 0
  let pendingResponses = 0

  bundles.forEach((bundle) => {
    bundle.responses.forEach((r) => {
      if (r.status === "COMPLETED") {
        completedResponses++
      } else {
        pendingResponses++
      }
    })

    // Add expected but not started responses
    const expectedResponses = bundle.cohort.members.length
    const actualResponses = bundle.responses.length
    pendingResponses += Math.max(0, expectedResponses - actualResponses)
  })

  const totalResponses = completedResponses + pendingResponses
  const completionRate = totalResponses > 0
    ? (completedResponses / totalResponses) * 100
    : 0

  // Responses by week
  const weekGroups: Record<number, { completed: number; pending: number; total: number }> = {}
  bundles.forEach((bundle) => {
    if (!weekGroups[bundle.weekNumber]) {
      weekGroups[bundle.weekNumber] = { completed: 0, pending: 0, total: 0 }
    }

    const expectedResponses = bundle.cohort.members.length
    const completedCount = bundle.responses.filter((r) => r.status === "COMPLETED").length
    const pendingCount = expectedResponses - completedCount

    weekGroups[bundle.weekNumber].completed += completedCount
    weekGroups[bundle.weekNumber].pending += pendingCount
    weekGroups[bundle.weekNumber].total += expectedResponses
  })

  const responsesByWeek = Object.entries(weekGroups)
    .map(([weekNumber, data]) => ({
      weekNumber: Number(weekNumber),
      ...data,
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber)

  // Cohort compliance
  const cohortStats: Record<number, { name: string; memberCount: number; completed: number; total: number }> = {}
  bundles.forEach((bundle) => {
    const cohortId = bundle.cohort.id
    if (!cohortStats[cohortId]) {
      cohortStats[cohortId] = {
        name: bundle.cohort.name,
        memberCount: bundle.cohort.members.length,
        completed: 0,
        total: 0,
      }
    }

    const expectedResponses = bundle.cohort.members.length
    const completedCount = bundle.responses.filter((r) => r.status === "COMPLETED").length

    cohortStats[cohortId].completed += completedCount
    cohortStats[cohortId].total += expectedResponses
  })

  const cohortCompliance = Object.entries(cohortStats).map(([cohortId, data]) => ({
    cohortId: Number(cohortId),
    cohortName: data.name,
    memberCount: data.memberCount,
    avgCompletionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
  }))

  return {
    totalQuestionnaires,
    completedResponses,
    pendingResponses,
    completionRate,
    responsesByWeek,
    cohortCompliance,
  }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

export interface ExportOptions {
  format: "csv" | "json"
  reportType: "members" | "cohorts" | "revenue" | "compliance"
}

export async function exportReportData(options: ExportOptions) {
  const { format, reportType } = options

  let data: unknown

  switch (reportType) {
    case "members":
      data = await getMemberEngagementReport()
      break
    case "cohorts":
      data = await getCohortReport()
      break
    case "revenue":
      data = await getRevenueReport()
      break
    case "compliance":
      data = await getComplianceReport()
      break
    default:
      throw new Error("Invalid report type")
  }

  if (format === "json") {
    return {
      content: JSON.stringify(data, null, 2),
      contentType: "application/json",
      filename: `${reportType}-report-${formatDate(new Date(), "yyyy-MM-dd")}.json`,
    }
  }

  // Convert to CSV
  const csvContent = convertToCSV(data, reportType)
  return {
    content: csvContent,
    contentType: "text/csv",
    filename: `${reportType}-report-${formatDate(new Date(), "yyyy-MM-dd")}.csv`,
  }
}

function convertToCSV(data: unknown, reportType: string): string {
  const lines: string[] = []

  switch (reportType) {
    case "members": {
      const report = data as MemberEngagementReport
      lines.push("Member Engagement Report")
      lines.push("")
      lines.push("Metric,Value")
      lines.push(`Total Members,${report.totalMembers}`)
      lines.push(`Active Members,${report.activeMembers}`)
      lines.push(`Inactive Members,${report.inactiveMembers}`)
      lines.push(`New This Month,${report.newMembersThisMonth}`)
      lines.push(`Avg Check-ins Per Member,${report.avgCheckInsPerMember.toFixed(2)}`)
      lines.push("")
      lines.push("Check-in Trend")
      lines.push("Date,Count")
      report.checkInTrend.forEach((t) => {
        lines.push(`${t.date},${t.count}`)
      })
      break
    }
    case "cohorts": {
      const report = data as CohortReport
      lines.push("Cohort Report")
      lines.push("")
      lines.push("ID,Name,Status,Members,Engagement %,Start Date,End Date")
      report.cohortBreakdown.forEach((c) => {
        lines.push(`${c.id},"${c.name}",${c.status},${c.memberCount},${c.avgEngagement.toFixed(1)},${formatDate(c.startDate, "yyyy-MM-dd")},${c.endDate ? formatDate(c.endDate, "yyyy-MM-dd") : ""}`)
      })
      break
    }
    case "revenue": {
      const report = data as RevenueReport
      lines.push("Revenue Report")
      lines.push("")
      lines.push("Metric,Value")
      lines.push(`Total Revenue,$${(report.totalRevenue / 100).toFixed(2)}`)
      lines.push(`This Month,$${(report.revenueThisMonth / 100).toFixed(2)}`)
      lines.push(`Last Month,$${(report.revenueLastMonth / 100).toFixed(2)}`)
      lines.push(`Growth,${report.monthOverMonthGrowth.toFixed(1)}%`)
      lines.push("")
      lines.push("Monthly Revenue")
      lines.push("Month,Revenue,Invoices")
      report.monthlyRevenue.forEach((m) => {
        lines.push(`${m.month},$${(m.revenue / 100).toFixed(2)},${m.invoiceCount}`)
      })
      lines.push("")
      lines.push("Top Clients")
      lines.push("ID,Name,Email,Total Revenue,Invoices")
      report.topClients.forEach((c) => {
        lines.push(`${c.id},"${c.name || ""}","${c.email}",$${(c.totalRevenue / 100).toFixed(2)},${c.invoiceCount}`)
      })
      break
    }
    case "compliance": {
      const report = data as ComplianceReport
      lines.push("Compliance Report")
      lines.push("")
      lines.push("Metric,Value")
      lines.push(`Total Questionnaires,${report.totalQuestionnaires}`)
      lines.push(`Completed Responses,${report.completedResponses}`)
      lines.push(`Pending Responses,${report.pendingResponses}`)
      lines.push(`Completion Rate,${report.completionRate.toFixed(1)}%`)
      lines.push("")
      lines.push("Cohort Compliance")
      lines.push("Cohort ID,Name,Members,Completion Rate")
      report.cohortCompliance.forEach((c) => {
        lines.push(`${c.cohortId},"${c.cohortName}",${c.memberCount},${c.avgCompletionRate.toFixed(1)}%`)
      })
      break
    }
  }

  return lines.join("\n")
}

// ==========================================
// SESSION ATTENDANCE REPORT
// ==========================================

export async function getSessionAttendanceReport(): Promise<SessionAttendanceReport> {
  const { userId, isAdmin } = await requireCoachOrAdmin()

  const now = new Date()
  const twelveWeeksAgo = subDays(now, 84) // 12 weeks

  // Build coach filter
  const coachFilter = isAdmin ? {} : { coachId: userId }

  // Parallel queries for performance
  const [
    allSessions,
    allRegistrations,
    classTypes,
  ] = await Promise.all([
    // All sessions
    prisma.classSession.findMany({
      where: coachFilter,
      select: {
        id: true,
        status: true,
        startTime: true,
        maxOccupancy: true,
        classType: {
          select: { name: true },
        },
      },
    }),

    // All registrations
    prisma.sessionRegistration.findMany({
      where: {
        session: coachFilter,
      },
      select: {
        status: true,
        sessionId: true,
      },
    }),

    // Class types with session counts
    prisma.classType.findMany({
      where: {
        sessions: {
          some: coachFilter,
        },
      },
      select: {
        id: true,
        name: true,
        sessions: {
          where: {
            ...coachFilter,
            status: SessionStatus.COMPLETED,
          },
          select: {
            id: true,
            registrations: {
              where: {
                status: RegistrationStatus.ATTENDED,
              },
            },
          },
        },
      },
    }),
  ])

  // Count sessions by status
  const totalSessions = allSessions.length
  const completedSessions = allSessions.filter(s => s.status === SessionStatus.COMPLETED).length
  const cancelledSessions = allSessions.filter(s => s.status === SessionStatus.CANCELLED).length
  const upcomingSessions = allSessions.filter(s => s.status === SessionStatus.SCHEDULED && s.startTime > now).length

  // Session status breakdown
  const statusCounts: Record<string, number> = {}
  allSessions.forEach(s => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
  })
  const sessionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }))

  // Count registrations by status
  const totalRegistrations = allRegistrations.length
  const attendedCount = allRegistrations.filter(r => r.status === RegistrationStatus.ATTENDED).length
  const noShowCount = allRegistrations.filter(r => r.status === RegistrationStatus.NO_SHOW).length
  const lateCancelCount = allRegistrations.filter(r => r.status === RegistrationStatus.LATE_CANCELLED).length

  const attendanceRate = totalRegistrations > 0 ? (attendedCount / totalRegistrations) * 100 : 0
  const noShowRate = totalRegistrations > 0 ? (noShowCount / totalRegistrations) * 100 : 0
  const lateCancelRate = totalRegistrations > 0 ? (lateCancelCount / totalRegistrations) * 100 : 0

  // Calculate average occupancy
  const sessionsWithCapacity = allSessions.filter(s => s.maxOccupancy > 0)
  let totalOccupancyPercentage = 0

  sessionsWithCapacity.forEach(session => {
    const sessionRegs = allRegistrations.filter(r => r.sessionId === session.id)
    const registeredOrAttended = sessionRegs.filter(
      r => r.status === RegistrationStatus.REGISTERED || r.status === RegistrationStatus.ATTENDED
    ).length
    const occupancyPercent = (registeredOrAttended / session.maxOccupancy) * 100
    totalOccupancyPercentage += occupancyPercent
  })

  const averageOccupancy = sessionsWithCapacity.length > 0
    ? totalOccupancyPercentage / sessionsWithCapacity.length
    : 0

  // Attendance trend (last 12 weeks, grouped by week)
  const weeklyData: Record<string, { attended: number; noShow: number; total: number }> = {}

  // Get sessions from last 12 weeks with registrations
  const recentSessions = await prisma.classSession.findMany({
    where: {
      ...coachFilter,
      startTime: { gte: twelveWeeksAgo, lte: now },
      status: SessionStatus.COMPLETED,
    },
    include: {
      registrations: {
        select: { status: true },
      },
    },
    orderBy: { startTime: "asc" },
  })

  recentSessions.forEach(session => {
    const weekStart = startOfWeek(session.startTime)
    const weekKey = formatDate(weekStart, "yyyy-MM-dd")

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { attended: 0, noShow: 0, total: 0 }
    }

    const attended = session.registrations.filter(r => r.status === RegistrationStatus.ATTENDED).length
    const noShow = session.registrations.filter(r => r.status === RegistrationStatus.NO_SHOW).length
    const total = session.registrations.length

    weeklyData[weekKey].attended += attended
    weeklyData[weekKey].noShow += noShow
    weeklyData[weekKey].total += total
  })

  const attendanceTrend = Object.entries(weeklyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Popular class types
  const popularClassTypes = classTypes.map(ct => {
    const sessionCount = ct.sessions.length
    const totalAttendance = ct.sessions.reduce(
      (sum, s) => sum + s.registrations.length,
      0
    )
    const avgAttendance = sessionCount > 0 ? totalAttendance / sessionCount : 0

    return {
      name: ct.name,
      sessionCount,
      avgAttendance,
    }
  }).sort((a, b) => b.sessionCount - a.sessionCount)

  return {
    totalSessions,
    completedSessions,
    cancelledSessions,
    upcomingSessions,
    totalRegistrations,
    attendanceRate,
    noShowRate,
    lateCancelRate,
    averageOccupancy,
    sessionsByStatus,
    attendanceTrend,
    popularClassTypes,
  }
}

// ==========================================
// MEMBERSHIP REPORT (Admin Only)
// ==========================================

export async function getMembershipReport(): Promise<MembershipReport> {
  await requireAdmin()

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)

  // Parallel queries for performance
  const [
    allMemberships,
    activeMemberships,
    pausedMemberships,
    cancelledMemberships,
    planStats,
    recentRegistrations,
  ] = await Promise.all([
    // All memberships
    prisma.userMembership.findMany({
      select: {
        status: true,
        plan: {
          select: {
            type: true,
          },
        },
      },
    }),

    // Active memberships count
    prisma.userMembership.count({
      where: { status: MembershipTierStatus.ACTIVE },
    }),

    // Paused memberships count
    prisma.userMembership.count({
      where: { status: MembershipTierStatus.PAUSED },
    }),

    // Cancelled memberships count
    prisma.userMembership.count({
      where: { status: MembershipTierStatus.CANCELLED },
    }),

    // Plan popularity
    prisma.membershipPlan.findMany({
      where: { isActive: true },
      select: {
        name: true,
        type: true,
        userMemberships: {
          where: { status: MembershipTierStatus.ACTIVE },
        },
      },
    }),

    // Recent registrations (last 30 days)
    prisma.sessionRegistration.count({
      where: {
        registeredAt: { gte: thirtyDaysAgo },
        status: {
          in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED],
        },
      },
    }),
  ])

  // Memberships by type
  const typeCounts: Record<string, number> = {}
  allMemberships.forEach(m => {
    const type = m.plan.type
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })
  const membershipsByType = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count,
  }))

  // Plan popularity
  const planPopularity = planStats
    .map(plan => ({
      planName: plan.name,
      activeCount: plan.userMemberships.length,
      type: plan.type,
    }))
    .sort((a, b) => b.activeCount - a.activeCount)

  // Churn rate (cancelled in last 30 days / total active at start of period)
  const cancelledInLast30Days = await prisma.userMembership.count({
    where: {
      status: MembershipTierStatus.CANCELLED,
      updatedAt: { gte: thirtyDaysAgo },
    },
  })

  const activeAtStartOfPeriod = activeMemberships + cancelledInLast30Days
  const churnRate = activeAtStartOfPeriod > 0
    ? (cancelledInLast30Days / activeAtStartOfPeriod) * 100
    : 0

  // Average sessions per member (last 30 days)
  const averageSessionsPerMember = activeMemberships > 0
    ? recentRegistrations / activeMemberships
    : 0

  return {
    totalActiveMemberships: activeMemberships,
    totalPausedMemberships: pausedMemberships,
    totalCancelledMemberships: cancelledMemberships,
    membershipsByType,
    planPopularity,
    churnRate,
    averageSessionsPerMember,
  }
}
