"use server"

import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"
import { startOfDay, subDays } from "date-fns"

/**
 * Attention Score Algorithm (Based on CoachFit)
 * - Check-ins (40%): Missed check-ins and frequency
 * - Questionnaires (30%): Completion rate
 * - Sentiment (30%): Perceived stress levels
 *
 * Score 0-100 (higher = needs more attention)
 * Priority: red (>= 60), amber (>= 30), green (< 30)
 *
 * Generated with Claude Code
 */

export type AttentionPriority = "red" | "amber" | "green"

export interface MemberAttentionScore {
  memberId: number
  memberName: string | null
  memberEmail: string
  score: number // 0-100
  priority: AttentionPriority
  reasons: string[]
  suggestedActions: string[]
  lastCheckIn: Date | null
  totalCheckIns: number
  currentStreak: number
}

export interface CoachInsights {
  totalMembers: number
  activeMembersCount: number
  inactiveMembersCount: number
  avgCheckInsPerWeek: number
  avgQuestionnaireCompletion: number
  attentionScores: MemberAttentionScore[]
}

export interface MemberCheckInData {
  memberId: number
  memberName: string | null
  memberEmail: string
  checkIns: Array<{
    date: Date
    weight: number | null
    steps: number | null
    calories: number | null
    sleepQuality: number | null
    perceivedStress: number | null
    notes: string | null
  }>
  totalCheckIns: number
  currentStreak: number
  lastCheckIn: Date | null
}

/**
 * Calculate attention score for a member
 * Adapts CoachFit algorithm to Centurion schema
 */
async function calculateMemberAttentionScore(
  memberId: number,
  memberName: string | null,
  memberEmail: string
): Promise<MemberAttentionScore> {
  const now = new Date()
  const fourteenDaysAgo = subDays(now, 14)
  const sevenDaysAgo = subDays(now, 7)

  // Fetch recent entries for check-in analysis
  const recentEntries = await prisma.entry.findMany({
    where: {
      userId: memberId,
      date: { gte: fourteenDaysAgo },
    },
    orderBy: { date: "desc" },
    select: {
      date: true,
      perceivedStress: true,
    },
  })

  // Fetch last entry
  const lastEntry = await prisma.entry.findFirst({
    where: { userId: memberId },
    orderBy: { date: "desc" },
    select: { date: true },
  })

  // Fetch questionnaire completion rate (last 4 weeks)
  const memberCohorts = await prisma.cohortMembership.findMany({
    where: { userId: memberId, status: "ACTIVE" },
    select: { cohortId: true },
  })

  const cohortIds = memberCohorts.map((m) => m.cohortId)

  let questionnaireCompletionRate = 1.0 // Default to full completion if no questionnaires
  if (cohortIds.length > 0) {
    const activeBundles = await prisma.questionnaireBundle.findMany({
      where: {
        cohortId: { in: cohortIds },
        isActive: true,
        weekNumber: { gte: 1, lte: 4 },
      },
      select: { id: true },
    })

    if (activeBundles.length > 0) {
      const bundleIds = activeBundles.map((b) => b.id)
      const completedResponses = await prisma.weeklyQuestionnaireResponse.count({
        where: {
          userId: memberId,
          bundleId: { in: bundleIds },
          status: "COMPLETED",
        },
      })
      questionnaireCompletionRate = completedResponses / activeBundles.length
    }
  }

  // Calculate attention score components
  let score = 0
  const reasons: string[] = []
  const suggestedActions: string[] = []

  // 1. Check-in frequency component (40 points max)
  const expectedCheckIns = 14 // Daily check-ins expected
  const actualCheckIns = recentEntries.length
  const checkInGap = lastEntry
    ? Math.floor((now.getTime() - lastEntry.date.getTime()) / (24 * 60 * 60 * 1000))
    : 999

  if (checkInGap >= 7) {
    score += 40
    reasons.push(`No check-in for ${checkInGap} days`)
    suggestedActions.push("Contact member immediately")
  } else if (checkInGap >= 3) {
    score += 25
    reasons.push(`No check-in for ${checkInGap} days`)
    suggestedActions.push("Send reminder to member")
  } else if (actualCheckIns < expectedCheckIns * 0.5) {
    score += 20
    reasons.push(`Only ${actualCheckIns} check-ins in last 14 days (low engagement)`)
    suggestedActions.push("Review engagement with member")
  }

  // 2. Questionnaire completion component (30 points max)
  if (questionnaireCompletionRate < 0.3) {
    score += 30
    reasons.push(`Low questionnaire completion: ${(questionnaireCompletionRate * 100).toFixed(0)}%`)
    suggestedActions.push("Follow up on questionnaire completion")
  } else if (questionnaireCompletionRate < 0.7) {
    score += 15
    reasons.push(`Moderate questionnaire completion: ${(questionnaireCompletionRate * 100).toFixed(0)}%`)
  }

  // 3. Sentiment analysis component (30 points max)
  const stressScores = recentEntries
    .map((e) => e.perceivedStress)
    .filter((s): s is number => s !== null)

  if (stressScores.length > 0) {
    const avgStress = stressScores.reduce((sum, s) => sum + s, 0) / stressScores.length
    const recentStress = stressScores.slice(0, 3) // Last 3 entries with stress data
    const avgRecentStress = recentStress.length > 0
      ? recentStress.reduce((sum, s) => sum + s, 0) / recentStress.length
      : 0

    if (avgRecentStress >= 8) {
      score += 30
      reasons.push("Very high stress levels reported recently")
      suggestedActions.push("Schedule wellness check-in")
    } else if (avgRecentStress >= 6) {
      score += 20
      reasons.push("Elevated stress levels")
      suggestedActions.push("Monitor stress levels")
    }

    // Increasing stress trend
    if (stressScores.length >= 5) {
      const oldAvg = stressScores.slice(3).reduce((sum, s) => sum + s, 0) / stressScores.slice(3).length
      if (avgRecentStress > oldAvg + 2) {
        score += 10
        reasons.push("Stress levels increasing")
      }
    }
  }

  // Calculate streak
  let currentStreak = 0
  let lastDate: Date | null = null
  for (const entry of recentEntries) {
    const entryDate = startOfDay(entry.date)
    if (!lastDate) {
      const daysDiff = Math.floor((startOfDay(now).getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 0) {
        currentStreak = 1
        lastDate = entryDate
      } else {
        break
      }
    } else {
      const daysDiff = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        currentStreak++
        lastDate = entryDate
      } else {
        break
      }
    }
  }

  // Determine priority
  let priority: AttentionPriority = "green"
  if (score >= 60) {
    priority = "red"
  } else if (score >= 30) {
    priority = "amber"
  }

  return {
    memberId,
    memberName,
    memberEmail,
    score: Math.min(score, 100),
    priority,
    reasons,
    suggestedActions,
    lastCheckIn: lastEntry?.date || null,
    totalCheckIns: actualCheckIns,
    currentStreak,
  }
}

/**
 * Get coach insights for all members in coach's cohorts
 */
export async function getCoachInsights(): Promise<CoachInsights> {
  const user = await requireCoach()
  const isAdmin = user.role === "ADMIN"

  let cohortIds: number[]

  if (isAdmin) {
    // Admin sees all active cohorts
    const allCohorts = await prisma.cohort.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    })
    cohortIds = allCohorts.map((c) => c.id)
  } else {
    // Coach sees only their assigned cohorts
    const coachCohorts = await prisma.coachCohortMembership.findMany({
      where: { coachId: Number(user.id) },
      select: { cohortId: true },
    })
    cohortIds = coachCohorts.map((c) => c.cohortId)
  }

  if (cohortIds.length === 0) {
    return {
      totalMembers: 0,
      activeMembersCount: 0,
      inactiveMembersCount: 0,
      avgCheckInsPerWeek: 0,
      avgQuestionnaireCompletion: 0,
      attentionScores: [],
    }
  }

  // Get all members in these cohorts
  const cohortMemberships = await prisma.cohortMembership.findMany({
    where: {
      cohortId: { in: cohortIds },
      status: "ACTIVE",
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
  })

  const totalMembers = cohortMemberships.length

  // Calculate attention scores for each member
  const attentionScores: MemberAttentionScore[] = []
  for (const membership of cohortMemberships) {
    const score = await calculateMemberAttentionScore(
      membership.user.id,
      membership.user.name,
      membership.user.email
    )
    attentionScores.push(score)
  }

  // Sort by score (highest first)
  attentionScores.sort((a, b) => b.score - a.score)

  // Calculate aggregate stats
  const sevenDaysAgo = subDays(new Date(), 7)
  const recentCheckIns = await prisma.entry.count({
    where: {
      userId: { in: cohortMemberships.map((m) => m.userId) },
      date: { gte: sevenDaysAgo },
    },
  })

  const activeMembersCount = attentionScores.filter((s) => s.lastCheckIn && s.lastCheckIn >= sevenDaysAgo).length
  const inactiveMembersCount = totalMembers - activeMembersCount
  const avgCheckInsPerWeek = totalMembers > 0 ? recentCheckIns / totalMembers : 0

  // Calculate avg questionnaire completion (simplified)
  const avgQuestionnaireCompletion = 0.75 // Placeholder - would need more complex calculation

  return {
    totalMembers,
    activeMembersCount,
    inactiveMembersCount,
    avgCheckInsPerWeek,
    avgQuestionnaireCompletion,
    attentionScores,
  }
}

/**
 * Get check-in data for a specific member
 */
export async function getMemberCheckInData(memberId: number): Promise<MemberCheckInData | null> {
  await requireCoach()

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  if (!member) {
    return null
  }

  const thirtyDaysAgo = subDays(new Date(), 30)
  const entries = await prisma.entry.findMany({
    where: {
      userId: memberId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "desc" },
    select: {
      date: true,
      weight: true,
      steps: true,
      calories: true,
      sleepQuality: true,
      perceivedStress: true,
      notes: true,
    },
  })

  // Calculate streak
  let currentStreak = 0
  let lastDate: Date | null = null
  const now = new Date()
  for (const entry of entries) {
    const entryDate = startOfDay(entry.date)
    if (!lastDate) {
      const daysDiff = Math.floor((startOfDay(now).getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 0) {
        currentStreak = 1
        lastDate = entryDate
      } else {
        break
      }
    } else {
      const daysDiff = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        currentStreak++
        lastDate = entryDate
      } else {
        break
      }
    }
  }

  return {
    memberId: member.id,
    memberName: member.name,
    memberEmail: member.email,
    checkIns: entries,
    totalCheckIns: entries.length,
    currentStreak,
    lastCheckIn: entries[0]?.date || null,
  }
}

/**
 * Get all members in coach's cohorts with basic info
 */
export async function getCoachCohortMembers() {
  const user = await requireCoach()
  const isAdmin = user.role === "ADMIN"

  let members: Array<{
    id: number
    name: string | null
    email: string
    image: string | null
    cohortId: number
    cohortName: string
  }>

  if (isAdmin) {
    // Admin sees all active cohorts and their members
    const allCohorts = await prisma.cohort.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        members: {
          where: { status: "ACTIVE" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    members = allCohorts.flatMap((cohort) =>
      cohort.members.map((m) => ({
        ...m.user,
        cohortId: cohort.id,
        cohortName: cohort.name,
      }))
    )
  } else {
    // Coach sees only their assigned cohorts
    const coachCohorts = await prisma.coachCohortMembership.findMany({
      where: { coachId: Number(user.id) },
      select: {
        cohort: {
          select: {
            id: true,
            name: true,
            members: {
              where: { status: "ACTIVE" },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    members = coachCohorts.flatMap((cc) =>
      cc.cohort.members.map((m) => ({
        ...m.user,
        cohortId: cc.cohort.id,
        cohortName: cc.cohort.name,
      }))
    )
  }

  // Deduplicate members (a member can be in multiple cohorts)
  const uniqueMembers = Array.from(
    new Map(members.map((m) => [m.id, m])).values()
  )

  return uniqueMembers
}

/**
 * Calculate attention score for a specific member
 */
export async function calculateAttentionScore(memberId: number): Promise<MemberAttentionScore | null> {
  await requireCoach()

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  if (!member) {
    return null
  }

  return await calculateMemberAttentionScore(member.id, member.name, member.email)
}
