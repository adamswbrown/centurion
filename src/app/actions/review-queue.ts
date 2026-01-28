"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { z } from "zod"
import { startOfWeek, endOfWeek, subDays, format, addDays, subWeeks } from "date-fns"
import { MembershipStatus } from "@prisma/client"
import type { MemberAttentionScore } from "./coach-analytics"
import { calculateAttentionScore } from "./coach-analytics"
import { sendSystemEmail } from "@/lib/email"
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email-templates"

/**
 * Review Queue Server Actions
 * Weekly review management for coaches
 * Based on CoachFit weekly-review implementation
 * Generated with Claude Code
 */

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface QuestionnaireStatus {
  status: "completed" | "in_progress" | "not_started" | "no_questionnaire"
  lastUpdated: Date | null
  hoursSinceLastSave: number | null
}

export interface ClientWeeklySummary {
  clientId: number
  name: string | null
  email: string
  cohortId: number
  cohortName: string
  stats: {
    checkInCount: number
    checkInRate: number
    expectedCheckIns: number
    avgWeight: number | null
    weightTrend: number | null
    avgSteps: number | null
    avgCalories: number | null
    avgSleepQuality: number | null
    avgStress: number | null
  }
  lastCheckInDate: Date | null
  attentionScore: MemberAttentionScore | null
  questionnaireStatus: QuestionnaireStatus
}

export interface WeeklySummariesResponse {
  weekStart: string
  weekEnd: string
  clients: ClientWeeklySummary[]
}

export interface WeeklyCoachResponseData {
  id?: number
  loomUrl: string | null
  note: string | null
}

// ==========================================
// SCHEMAS
// ==========================================

const saveWeeklyResponseSchema = z.object({
  clientId: z.number().int().positive(),
  weekStart: z.string().min(1),
  loomUrl: z.string().url().optional().nullable(),
  note: z.string().max(5000).optional().nullable(),
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

// ==========================================
// GET WEEKLY SUMMARIES
// ==========================================

export async function getWeeklySummaries(
  weekStart?: string,
  cohortId?: number
): Promise<WeeklySummariesResponse> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  // Determine week boundaries
  const targetWeekStart = weekStart
    ? getMonday(new Date(weekStart))
    : getMonday(new Date())
  const targetWeekEnd = getSunday(targetWeekStart)

  // Get coach's cohorts
  const coachCohorts = await prisma.coachCohortMembership.findMany({
    where: {
      coachId,
      ...(cohortId ? { cohortId } : {}),
    },
    select: {
      cohort: {
        select: {
          id: true,
          name: true,
          startDate: true,
          members: {
            where: { status: MembershipStatus.ACTIVE },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          bundles: {
            select: {
              id: true,
              weekNumber: true,
              isActive: true,
            },
          },
        },
      },
    },
  })

  // Flatten clients with cohort info
  const clientsWithCohort = coachCohorts.flatMap((cc) =>
    cc.cohort.members.map((m) => ({
      clientId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      cohortId: cc.cohort.id,
      cohortName: cc.cohort.name,
      cohortStartDate: cc.cohort.startDate,
      bundles: cc.cohort.bundles,
    }))
  )

  // Dedupe clients (can be in multiple cohorts)
  const uniqueClients = Array.from(
    new Map(clientsWithCohort.map((c) => [c.clientId, c])).values()
  )

  if (uniqueClients.length === 0) {
    return {
      weekStart: format(targetWeekStart, "yyyy-MM-dd"),
      weekEnd: format(targetWeekEnd, "yyyy-MM-dd"),
      clients: [],
    }
  }

  // Fetch entries for all clients in this week
  const clientIds = uniqueClients.map((c) => c.clientId)
  const entries = await prisma.entry.findMany({
    where: {
      userId: { in: clientIds },
      date: {
        gte: targetWeekStart,
        lte: targetWeekEnd,
      },
    },
    select: {
      userId: true,
      date: true,
      weight: true,
      steps: true,
      calories: true,
      sleepQuality: true,
      perceivedStress: true,
    },
    orderBy: { date: "asc" },
  })

  // Get last check-in for each client (may be before this week)
  const lastCheckIns = await prisma.entry.groupBy({
    by: ["userId"],
    where: {
      userId: { in: clientIds },
    },
    _max: {
      date: true,
    },
  })

  const lastCheckInMap = new Map(
    lastCheckIns.map((lc) => [lc.userId, lc._max.date])
  )

  // Fetch questionnaire responses for all clients
  // Calculate week number based on cohort start date
  const cohortWeekNumbers = new Map<number, number>()
  const cohortBundleIds = new Map<number, number | null>()

  for (const cc of coachCohorts) {
    const cohortStart = new Date(cc.cohort.startDate)
    const weeksSinceStart = Math.floor(
      (targetWeekStart.getTime() - cohortStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    const currentWeek = Math.max(1, weeksSinceStart + 1)
    cohortWeekNumbers.set(cc.cohort.id, currentWeek)

    // Find the bundle for this week
    const bundle = cc.cohort.bundles.find(
      (b) => b.weekNumber === currentWeek && b.isActive
    )
    cohortBundleIds.set(cc.cohort.id, bundle?.id ?? null)
  }

  // Get all bundle IDs that have questionnaires for current week
  const bundleIds = Array.from(cohortBundleIds.values()).filter(
    (id): id is number => id !== null
  )

  // Fetch questionnaire responses for all clients
  const questionnaireResponses = bundleIds.length > 0
    ? await prisma.weeklyQuestionnaireResponse.findMany({
        where: {
          userId: { in: clientIds },
          bundleId: { in: bundleIds },
        },
        select: {
          userId: true,
          bundleId: true,
          status: true,
          updatedAt: true,
        },
      })
    : []

  const responseMap = new Map(
    questionnaireResponses.map((r) => [`${r.userId}-${r.bundleId}`, r])
  )

  // Calculate expected check-ins based on week duration
  const today = new Date()
  const daysIntoWeek = Math.min(
    7,
    Math.floor((today.getTime() - targetWeekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  )
  const expectedCheckIns = daysIntoWeek

  // Build client summaries
  const clientSummaries: ClientWeeklySummary[] = await Promise.all(
    uniqueClients.map(async (client) => {
      const clientEntries = entries.filter((e) => e.userId === client.clientId)
      const checkInCount = clientEntries.length
      const checkInRate = expectedCheckIns > 0 ? checkInCount / expectedCheckIns : 0

      // Calculate averages
      const weights = clientEntries.map((e) => e.weight).filter((w): w is number => w !== null)
      const steps = clientEntries.map((e) => e.steps).filter((s): s is number => s !== null)
      const calories = clientEntries.map((e) => e.calories).filter((c): c is number => c !== null)
      const sleepQuality = clientEntries.map((e) => e.sleepQuality).filter((s): s is number => s !== null)
      const stress = clientEntries.map((e) => e.perceivedStress).filter((s): s is number => s !== null)

      const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null
      const avgSteps = steps.length > 0 ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null
      const avgCalories = calories.length > 0 ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : null
      const avgSleepQuality = sleepQuality.length > 0 ? sleepQuality.reduce((a, b) => a + b, 0) / sleepQuality.length : null
      const avgStress = stress.length > 0 ? stress.reduce((a, b) => a + b, 0) / stress.length : null

      // Weight trend (first vs last this week)
      let weightTrend: number | null = null
      if (weights.length >= 2) {
        const firstWeight = weights[0]
        const lastWeight = weights[weights.length - 1]
        weightTrend = lastWeight - firstWeight
      }

      // Get attention score
      let attentionScore: MemberAttentionScore | null = null
      try {
        attentionScore = await calculateAttentionScore(client.clientId)
      } catch (error) {
        // Attention score calculation failed, continue without it
      }

      // Get questionnaire status
      const bundleId = cohortBundleIds.get(client.cohortId)
      let questionnaireStatus: QuestionnaireStatus = {
        status: "no_questionnaire",
        lastUpdated: null,
        hoursSinceLastSave: null,
      }

      if (bundleId) {
        const response = responseMap.get(`${client.clientId}-${bundleId}`)
        if (response) {
          const hoursSinceLastSave = Math.floor(
            (today.getTime() - response.updatedAt.getTime()) / (1000 * 60 * 60)
          )
          questionnaireStatus = {
            status: response.status === "COMPLETED" ? "completed" : "in_progress",
            lastUpdated: response.updatedAt,
            hoursSinceLastSave,
          }
        } else {
          questionnaireStatus = {
            status: "not_started",
            lastUpdated: null,
            hoursSinceLastSave: null,
          }
        }
      }

      return {
        clientId: client.clientId,
        name: client.name,
        email: client.email,
        cohortId: client.cohortId,
        cohortName: client.cohortName,
        stats: {
          checkInCount,
          checkInRate,
          expectedCheckIns,
          avgWeight,
          weightTrend,
          avgSteps,
          avgCalories,
          avgSleepQuality,
          avgStress,
        },
        lastCheckInDate: lastCheckInMap.get(client.clientId) || null,
        attentionScore,
        questionnaireStatus,
      }
    })
  )

  // Sort by attention score (highest first), then by check-in rate (lowest first)
  clientSummaries.sort((a, b) => {
    // Priority: red > amber > green
    const priorityOrder = { red: 0, amber: 1, green: 2 }
    const aPriority = a.attentionScore?.priority || "green"
    const bPriority = b.attentionScore?.priority || "green"

    if (aPriority !== bPriority) {
      return priorityOrder[aPriority] - priorityOrder[bPriority]
    }

    // Then by attention score (descending)
    const aScore = a.attentionScore?.score || 0
    const bScore = b.attentionScore?.score || 0
    if (aScore !== bScore) {
      return bScore - aScore
    }

    // Finally by check-in rate (ascending - lower rate first)
    return a.stats.checkInRate - b.stats.checkInRate
  })

  return {
    weekStart: format(targetWeekStart, "yyyy-MM-dd"),
    weekEnd: format(targetWeekEnd, "yyyy-MM-dd"),
    clients: clientSummaries,
  }
}

// ==========================================
// GET WEEKLY RESPONSE
// ==========================================

export async function getWeeklyResponse(
  clientId: number,
  weekStart: string
): Promise<WeeklyCoachResponseData> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const weekDate = new Date(weekStart)

  const response = await prisma.weeklyCoachResponse.findUnique({
    where: {
      coachId_clientId_weekStart: {
        coachId,
        clientId,
        weekStart: weekDate,
      },
    },
    select: {
      id: true,
      loomUrl: true,
      note: true,
    },
  })

  return response || { loomUrl: null, note: null }
}

// ==========================================
// SAVE WEEKLY RESPONSE
// ==========================================

export async function saveWeeklyResponse(input: {
  clientId: number
  weekStart: string
  loomUrl?: string | null
  note?: string | null
}) {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const result = saveWeeklyResponseSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { clientId, weekStart, loomUrl, note } = result.data
  const weekDate = new Date(weekStart)

  // Verify coach has access to this client
  const membership = await prisma.coachCohortMembership.findFirst({
    where: {
      coachId,
      cohort: {
        members: {
          some: {
            userId: clientId,
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    },
  })

  if (!membership) {
    throw new Error("Forbidden: You don't have access to this client")
  }

  // Upsert the response
  const response = await prisma.weeklyCoachResponse.upsert({
    where: {
      coachId_clientId_weekStart: {
        coachId,
        clientId,
        weekStart: weekDate,
      },
    },
    create: {
      coachId,
      clientId,
      weekStart: weekDate,
      loomUrl: loomUrl || null,
      note: note || null,
    },
    update: {
      loomUrl: loomUrl || null,
      note: note || null,
    },
  })

  // Send email notification to client
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { name: true, email: true, isTestUser: true },
  })

  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { name: true },
  })

  if (client?.email && (loomUrl || note)) {
    await sendSystemEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.COACH_NOTE_RECEIVED,
      to: client.email,
      variables: {
        userName: client.name || "Member",
        coachName: coach?.name || "Your Coach",
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/client/dashboard`,
      },
      isTestUser: client.isTestUser ?? false,
    })
  }

  return response
}

// ==========================================
// GET REVIEW QUEUE SUMMARY
// ==========================================

export interface ReviewQueueSummary {
  totalClients: number
  redPriority: number
  amberPriority: number
  greenPriority: number
  pendingReviews: number
  completedReviews: number
}

export async function getReviewQueueSummary(weekStart?: string): Promise<ReviewQueueSummary> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const targetWeekStart = weekStart
    ? getMonday(new Date(weekStart))
    : getMonday(new Date())

  // Get weekly summaries to calculate priority counts
  const summaries = await getWeeklySummaries(
    format(targetWeekStart, "yyyy-MM-dd")
  )

  const totalClients = summaries.clients.length
  const redPriority = summaries.clients.filter(
    (c) => c.attentionScore?.priority === "red"
  ).length
  const amberPriority = summaries.clients.filter(
    (c) => c.attentionScore?.priority === "amber"
  ).length
  const greenPriority = summaries.clients.filter(
    (c) => c.attentionScore?.priority === "green" || !c.attentionScore
  ).length

  // Count completed reviews for this week
  const clientIds = summaries.clients.map((c) => c.clientId)
  const completedReviews = await prisma.weeklyCoachResponse.count({
    where: {
      coachId,
      clientId: { in: clientIds },
      weekStart: targetWeekStart,
      OR: [
        { loomUrl: { not: null } },
        { note: { not: null } },
      ],
    },
  })

  const pendingReviews = totalClients - completedReviews

  return {
    totalClients,
    redPriority,
    amberPriority,
    greenPriority,
    pendingReviews,
    completedReviews,
  }
}

// ==========================================
// GET COACH'S COHORTS (for filtering)
// ==========================================

export async function getCoachCohorts() {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const coachCohorts = await prisma.coachCohortMembership.findMany({
    where: { coachId },
    select: {
      cohort: {
        select: {
          id: true,
          name: true,
          status: true,
          _count: {
            select: {
              members: {
                where: { status: MembershipStatus.ACTIVE },
              },
            },
          },
        },
      },
    },
  })

  return coachCohorts.map((cc) => ({
    id: cc.cohort.id,
    name: cc.cohort.name,
    status: cc.cohort.status,
    memberCount: cc.cohort._count.members,
  }))
}

// Email draft generation moved to @/lib/email-draft.ts (client-side utility)

// ==========================================
// SEND QUESTIONNAIRE REMINDER
// ==========================================

const sendQuestionnaireReminderSchema = z.object({
  clientId: z.number().int().positive(),
  cohortId: z.number().int().positive(),
})

export async function sendQuestionnaireReminder(input: {
  clientId: number
  cohortId: number
}): Promise<{ success: boolean; message: string }> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const result = sendQuestionnaireReminderSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { clientId, cohortId } = result.data

  // Verify coach has access to this cohort
  const membership = await prisma.coachCohortMembership.findFirst({
    where: {
      coachId,
      cohortId,
    },
  })

  if (!membership) {
    throw new Error("Forbidden: You don't have access to this cohort")
  }

  // Only allow sending reminders for current week
  const today = new Date()
  const currentWeekStart = getMonday(today)
  const currentWeekEnd = getSunday(currentWeekStart)

  // Get the cohort to calculate week number
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: {
      startDate: true,
      bundles: {
        where: { isActive: true },
        select: { id: true, weekNumber: true },
      },
    },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  // Calculate current week number
  const weeksSinceStart = Math.floor(
    (currentWeekStart.getTime() - cohort.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  const currentWeekNumber = Math.max(1, weeksSinceStart + 1)

  // Check if there's a questionnaire for this week
  const bundle = cohort.bundles.find((b) => b.weekNumber === currentWeekNumber)
  if (!bundle) {
    return {
      success: false,
      message: "No questionnaire available for this week",
    }
  }

  // Check if client has already completed the questionnaire
  const existingResponse = await prisma.weeklyQuestionnaireResponse.findFirst({
    where: {
      userId: clientId,
      bundleId: bundle.id,
      status: "COMPLETED",
    },
  })

  if (existingResponse) {
    return {
      success: false,
      message: "Client has already completed this week's questionnaire",
    }
  }

  // Get client and coach details for email
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { name: true, email: true, isTestUser: true },
  })

  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { name: true },
  })

  if (!client?.email) {
    return {
      success: false,
      message: "Client email not found",
    }
  }

  // Send reminder email
  await sendSystemEmail({
    templateKey: EMAIL_TEMPLATE_KEYS.WEEKLY_QUESTIONNAIRE_REMINDER,
    to: client.email,
    variables: {
      userName: client.name || "Member",
      coachName: coach?.name || "Your Coach",
      weekNumber: String(currentWeekNumber),
      questionnaireUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/client/questionnaires/${cohortId}/${currentWeekNumber}`,
    },
    isTestUser: client.isTestUser ?? false,
  })

  return {
    success: true,
    message: "Reminder sent successfully",
  }
}
