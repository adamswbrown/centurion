"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfDay, startOfWeek, differenceInDays, isSunday, subDays } from "date-fns"

/**
 * Get all data needed for the client dashboard
 * Cohort-centric: shows cohort info, check-in status, questionnaire prompts
 */
export async function getClientDashboardData() {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  // Get user's active cohort memberships with cohort details
  const memberships = await prisma.cohortMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      cohort: {
        include: {
          config: true,
          coaches: {
            include: {
              coach: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  // Get recent entries (last 10)
  const recentEntries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
  })

  // Get check-in stats
  const allEntries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 90,
    select: { date: true, weight: true, steps: true },
  })

  // Calculate streak
  let currentStreak = 0
  let lastDate: Date | null = null
  const today = startOfDay(new Date())

  for (const entry of allEntries) {
    const entryDate = startOfDay(entry.date)

    if (!lastDate) {
      const daysDiff = Math.floor(
        (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff <= 1) {
        currentStreak = 1
        lastDate = entryDate
      } else {
        break
      }
    } else {
      const daysDiff = Math.floor(
        (lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff === 1) {
        currentStreak++
        lastDate = entryDate
      } else {
        break
      }
    }
  }

  // Calculate quick stats
  const last7DaysEntries = allEntries.filter((e) => {
    const daysDiff = differenceInDays(today, startOfDay(e.date))
    return daysDiff < 7
  })

  const latestWeight = allEntries.find((e) => e.weight !== null)?.weight || null
  const avgSteps7d =
    last7DaysEntries.filter((e) => e.steps !== null).length > 0
      ? Math.round(
          last7DaysEntries
            .filter((e) => e.steps !== null)
            .reduce((sum, e) => sum + (e.steps || 0), 0) /
            last7DaysEntries.filter((e) => e.steps !== null).length
        )
      : null

  // Get questionnaire status for active cohorts
  const questionnaireStatus: Array<{
    cohortId: number
    cohortName: string
    currentWeek: number
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
    bundleId: number | null
  }> = []

  for (const membership of memberships) {
    const cohort = membership.cohort
    if (!cohort.startDate) continue

    // Calculate current week number
    const weeksSinceStart = Math.floor(
      differenceInDays(today, startOfDay(cohort.startDate)) / 7
    )
    const currentWeek = Math.min(Math.max(weeksSinceStart + 1, 1), 6) // Cap at week 6

    // Find questionnaire bundle for this week
    const bundle = await prisma.questionnaireBundle.findFirst({
      where: {
        cohortId: cohort.id,
        weekNumber: currentWeek,
        isActive: true,
      },
    })

    if (bundle) {
      // Check if user has responded
      const response = await prisma.weeklyQuestionnaireResponse.findFirst({
        where: {
          userId,
          bundleId: bundle.id,
        },
      })

      questionnaireStatus.push({
        cohortId: cohort.id,
        cohortName: cohort.name,
        currentWeek,
        status: response
          ? response.status === "COMPLETED"
            ? "COMPLETED"
            : "IN_PROGRESS"
          : "NOT_STARTED",
        bundleId: bundle.id,
      })
    }
  }

  // Check if today's entry exists
  const todayEntry = await prisma.entry.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  })

  // Determine if questionnaire prompt should show (Sundays or not completed)
  const showQuestionnairePrompt =
    isSunday(today) &&
    questionnaireStatus.some((q) => q.status !== "COMPLETED")

  // Calculate next expected check-in based on cohort frequency
  const primaryCohort = memberships[0]?.cohort
  const checkInFrequency = primaryCohort?.checkInFrequencyDays || 1 // Default daily
  const lastCheckIn = recentEntries[0]?.date
  let nextExpectedCheckIn: Date | null = null
  let checkInOverdue = false

  if (lastCheckIn) {
    nextExpectedCheckIn = new Date(lastCheckIn)
    nextExpectedCheckIn.setDate(nextExpectedCheckIn.getDate() + checkInFrequency)
    checkInOverdue = nextExpectedCheckIn < today
  } else {
    checkInOverdue = memberships.length > 0 // Overdue if in cohort but no check-ins
  }

  return {
    user: {
      id: userId,
      name: session?.user?.name || null,
    },
    memberships: memberships.map((m) => ({
      id: m.id,
      joinedAt: m.joinedAt,
      status: m.status,
      cohort: {
        id: m.cohort.id,
        name: m.cohort.name,
        type: m.cohort.type,
        startDate: m.cohort.startDate,
        endDate: m.cohort.endDate,
        checkInFrequencyDays: m.cohort.checkInFrequencyDays,
        coaches: m.cohort.coaches.map((c) => c.coach),
      },
    })),
    hasActiveCohort: memberships.length > 0,
    recentEntries,
    stats: {
      currentStreak,
      totalEntries: allEntries.length,
      lastCheckIn,
      latestWeight,
      avgSteps7d,
      entriesLast7Days: last7DaysEntries.length,
    },
    todayEntry,
    hasTodayEntry: !!todayEntry,
    questionnaireStatus,
    showQuestionnairePrompt,
    checkInOverdue,
    nextExpectedCheckIn,
  }
}
