/**
 * Attention Score Calculator
 * Calculates priority scores for clients, coaches, and cohorts
 * based on engagement metrics and health data patterns.
 *
 * Ported from CoachFit with adaptations for Centurion's schema.
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type Priority = "red" | "amber" | "green"

export interface AttentionScore {
  entityType: "user" | "coach" | "cohort"
  entityId: number
  priority: Priority
  score: number // 0-100
  reasons: string[]
  suggestedActions: string[]
  metadata?: Record<string, unknown>
}

export interface AttentionQueueItem extends AttentionScore {
  entityName: string
  entityEmail?: string
}

interface SystemSettings {
  attentionMissedCheckinsPolicy: "option_a" | "option_b"
  defaultCheckInFrequencyDays: number
  adherenceGreenMinimum: number
  adherenceAmberMinimum: number
}

async function getSystemSettings(): Promise<SystemSettings> {
  const settings = await prisma.systemSettings.findMany({
    where: {
      key: {
        in: [
          "attentionMissedCheckinsPolicy",
          "defaultCheckInFrequencyDays",
          "adherenceGreenMinimum",
          "adherenceAmberMinimum",
        ],
      },
    },
  })

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]))

  return {
    attentionMissedCheckinsPolicy:
      (settingsMap.get("attentionMissedCheckinsPolicy") as "option_a" | "option_b") || "option_a",
    defaultCheckInFrequencyDays: (settingsMap.get("defaultCheckInFrequencyDays") as number) || 1,
    adherenceGreenMinimum: (settingsMap.get("adherenceGreenMinimum") as number) || 70,
    adherenceAmberMinimum: (settingsMap.get("adherenceAmberMinimum") as number) || 40,
  }
}

function chunkIds<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * Calculate attention score for a user (client) from pre-fetched data
 */
function calculateUserScoreFromData(
  user: {
    id: number
    name: string | null
    email: string
    memberships: Array<{ cohortId: number }>
  },
  recentEntries: Date[],
  lastEntryDate: Date | null,
  options?: {
    missedCheckinsPolicy?: "option_a" | "option_b"
    checkInFrequencyDays?: number
  }
): AttentionScore {
  let score = 0
  const reasons: string[] = []
  const suggestedActions: string[] = []
  const metadata: Record<string, unknown> = {}

  const now = new Date()
  const daysSinceLastEntry = lastEntryDate
    ? Math.floor((now.getTime() - lastEntryDate.getTime()) / (24 * 60 * 60 * 1000))
    : null

  const frequencyDays = options?.checkInFrequencyDays ?? 1
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const windowDays = Math.max(7, frequencyDays)
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  // Check for long-term inactivity
  if (!lastEntryDate || lastEntryDate < fourteenDaysAgo) {
    const daysSinceLastEntryValue = lastEntryDate ? (daysSinceLastEntry ?? 0) : 999

    if (daysSinceLastEntryValue >= 30) {
      score += 40
      reasons.push(`No entries for ${daysSinceLastEntryValue} days`)
      suggestedActions.push("Contact client to check engagement")
      metadata.daysSinceLastEntry = daysSinceLastEntryValue
    } else if (daysSinceLastEntryValue >= 14) {
      score += 25
      reasons.push(`No entries for ${daysSinceLastEntryValue} days`)
      suggestedActions.push("Send reminder to client")
      metadata.daysSinceLastEntry = daysSinceLastEntryValue
    }
  }

  // Check for recent missed check-ins based on frequency
  if (
    daysSinceLastEntry !== null &&
    daysSinceLastEntry >= Math.max(1, frequencyDays) &&
    daysSinceLastEntry < 14
  ) {
    score = Math.max(score, 30)
    reasons.push(
      `No entry in the last ${Math.max(1, frequencyDays)} day${frequencyDays === 1 ? "" : "s"}`
    )
    suggestedActions.push("Check in with client")
    metadata.daysSinceLastEntry = daysSinceLastEntry
  }

  // Calculate engagement metrics
  const entriesLast14Days = recentEntries.length
  const entriesLastWindow = recentEntries.filter((date) => date >= windowStart).length
  const expectedIn14Days = Math.max(1, Math.ceil(14 / frequencyDays))
  const expectedInWindow = Math.max(1, Math.ceil(windowDays / frequencyDays))

  if (entriesLast14Days === 0) {
    score += 30
    reasons.push("No entries in last 14 days")
    suggestedActions.push("Send engagement reminder")
    metadata.entriesLast14Days = 0
  } else if (entriesLast14Days < expectedIn14Days) {
    score += 15
    reasons.push(`Only ${entriesLast14Days} entries in last 14 days (low engagement)`)
    suggestedActions.push("Review client engagement")
    metadata.entriesLast14Days = entriesLast14Days
  }

  // Check missed check-ins policy
  if (lastEntryDate && entriesLastWindow < expectedInWindow) {
    const missedDays = expectedInWindow - entriesLastWindow
    const policy = options?.missedCheckinsPolicy ?? "option_a"
    if (policy === "option_a") {
      if (missedDays >= 2) {
        score = Math.max(score, 60)
      } else if (missedDays === 1) {
        score = Math.max(score, 30)
      }
    } else {
      score = Math.max(score, 60)
    }
    reasons.push(`Missed ${missedDays} check-in${missedDays === 1 ? "" : "s"} in last ${windowDays} days`)
    suggestedActions.push("Check in with client")
    metadata.entriesLastWindow = entriesLastWindow
    metadata.expectedInWindow = expectedInWindow
  }

  // Check cohort membership
  if (user.memberships.length === 0) {
    score += 20
    reasons.push("Not assigned to any cohort")
    suggestedActions.push("Assign client to a cohort")
    metadata.cohortCount = 0
  }

  // Determine priority based on score
  let priority: Priority = "green"
  if (score >= 60) {
    priority = "red"
  } else if (score >= 30) {
    priority = "amber"
  }

  return {
    entityType: "user",
    entityId: user.id,
    priority,
    score: Math.min(score, 100),
    reasons,
    suggestedActions,
    metadata,
  }
}

/**
 * Calculate attention score for a coach from pre-fetched data
 */
function calculateCoachScoreFromData(
  coach: {
    id: number
    name: string | null
    email: string
    cohorts: Array<{
      id: number
      memberships: Array<{ userId: number }>
    }>
  },
  clientEntryCounts: Map<number, number>
): AttentionScore {
  let score = 0
  const reasons: string[] = []
  const suggestedActions: string[] = []
  const metadata: Record<string, unknown> = {}

  const totalClients = coach.cohorts.reduce((sum, cohort) => sum + cohort.memberships.length, 0)

  metadata.clientCount = totalClients
  metadata.cohortCount = coach.cohorts.length

  const MAX_RECOMMENDED_CLIENTS = 50
  if (totalClients > MAX_RECOMMENDED_CLIENTS) {
    score += 50
    reasons.push(`Overloaded: ${totalClients} clients (recommended max: ${MAX_RECOMMENDED_CLIENTS})`)
    suggestedActions.push("Reassign some clients to other coaches")
    suggestedActions.push("Consider adding another coach")
    metadata.overloaded = true
    metadata.recommendedMax = MAX_RECOMMENDED_CLIENTS
  }

  if (coach.cohorts.length === 0) {
    score += 30
    reasons.push("No cohorts assigned")
    suggestedActions.push("Assign coach to cohorts")
    metadata.hasNoCohorts = true
  } else if (totalClients === 0) {
    score += 20
    reasons.push("No active clients in assigned cohorts")
    suggestedActions.push("Review cohort assignments")
    metadata.hasNoClients = true
  }

  const MIN_RECOMMENDED_CLIENTS = 10
  if (totalClients > 0 && totalClients < MIN_RECOMMENDED_CLIENTS && coach.cohorts.length > 0) {
    score += 10
    reasons.push(`Underutilized: Only ${totalClients} clients (could take more)`)
    suggestedActions.push("Assign more clients to optimize capacity")
    metadata.underutilized = true
    metadata.recommendedMin = MIN_RECOMMENDED_CLIENTS
  }

  // Calculate engagement rate
  if (totalClients > 0) {
    const clientIds = coach.cohorts.flatMap((c) => c.memberships.map((m) => m.userId))
    const recentEntries = clientIds.reduce((sum, clientId) => {
      return sum + (clientEntryCounts.get(clientId) || 0)
    }, 0)

    const expectedEntries = totalClients * 14
    const engagementRate = expectedEntries > 0 ? recentEntries / expectedEntries : 0

    metadata.engagementRate = engagementRate
    metadata.recentEntries = recentEntries
    metadata.expectedEntries = expectedEntries

    if (engagementRate < 0.3) {
      score += 25
      reasons.push(`Low client engagement: ${(engagementRate * 100).toFixed(0)}% entry completion`)
      suggestedActions.push("Review client engagement strategies")
      metadata.lowEngagement = true
    } else if (engagementRate < 0.5) {
      score += 15
      reasons.push(`Moderate client engagement: ${(engagementRate * 100).toFixed(0)}% entry completion`)
      suggestedActions.push("Monitor client engagement")
      metadata.moderateEngagement = true
    }
  }

  let priority: Priority = "green"
  if (score >= 60) {
    priority = "red"
  } else if (score >= 30) {
    priority = "amber"
  }

  return {
    entityType: "coach",
    entityId: coach.id,
    priority,
    score: Math.min(score, 100),
    reasons,
    suggestedActions,
    metadata,
  }
}

/**
 * Calculate attention score for a cohort from pre-fetched data
 */
function calculateCohortScoreFromData(
  cohort: {
    id: number
    name: string
    coaches: Array<{ coachId: number }>
    memberships: Array<{ userId: number }>
  },
  clientEntryCounts: Map<number, number>
): AttentionScore {
  let score = 0
  const reasons: string[] = []
  const suggestedActions: string[] = []
  const metadata: Record<string, unknown> = {}

  const clientCount = cohort.memberships.length
  metadata.clientCount = clientCount
  metadata.cohortName = cohort.name

  if (clientCount === 0) {
    score += 40
    reasons.push("No active members")
    suggestedActions.push("Invite clients to join cohort")
    suggestedActions.push("Review cohort purpose and goals")
    metadata.isEmpty = true
  }

  // Calculate engagement rate
  if (clientCount > 0) {
    const clientIds = cohort.memberships.map((m) => m.userId)
    const recentEntries = clientIds.reduce((sum, clientId) => {
      return sum + (clientEntryCounts.get(clientId) || 0)
    }, 0)

    const expectedEntries = clientCount * 14
    const engagementRate = expectedEntries > 0 ? recentEntries / expectedEntries : 0

    metadata.engagementRate = engagementRate
    metadata.recentEntries = recentEntries
    metadata.expectedEntries = expectedEntries

    if (engagementRate < 0.3) {
      score += 35
      reasons.push(`Very low engagement: ${(engagementRate * 100).toFixed(0)}% entry completion`)
      suggestedActions.push("Review cohort engagement strategies")
      suggestedActions.push("Contact coach to discuss")
      metadata.veryLowEngagement = true
    } else if (engagementRate < 0.5) {
      score += 20
      reasons.push(`Low engagement: ${(engagementRate * 100).toFixed(0)}% entry completion`)
      suggestedActions.push("Monitor engagement closely")
      metadata.lowEngagement = true
    } else if (engagementRate > 0.8) {
      score -= 10
      reasons.push(`High engagement: ${(engagementRate * 100).toFixed(0)}% entry completion`)
      metadata.highEngagement = true
    }
  }

  // Check for coach assignment
  if (cohort.coaches.length === 0) {
    score += 30
    reasons.push("No coach assigned")
    suggestedActions.push("Assign coach to cohort")
    metadata.hasNoCoach = true
  }

  let priority: Priority = "green"
  if (score >= 60) {
    priority = "red"
  } else if (score >= 30) {
    priority = "amber"
  }

  score = Math.max(score, 0)

  return {
    entityType: "cohort",
    entityId: cohort.id,
    priority,
    score: Math.min(score, 100),
    reasons,
    suggestedActions,
    metadata,
  }
}

/**
 * Store attention scores in database with caching
 */
async function storeAttentionScores(scores: AttentionQueueItem[]): Promise<void> {
  if (scores.length === 0) return

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  // Delete existing scores for these entities
  const entityKeys = scores.map((s) => ({ entityType: s.entityType, entityId: s.entityId }))
  await prisma.attentionScore.deleteMany({
    where: {
      OR: entityKeys.map((key) => ({
        entityType: key.entityType,
        entityId: key.entityId,
      })),
    },
  })

  // Create new scores
  await prisma.attentionScore.createMany({
    data: scores.map((score) => ({
      entityType: score.entityType,
      entityId: score.entityId,
      priority: score.priority,
      score: score.score,
      reasons: score.reasons,
      metadata: (score.metadata || {}) as Prisma.InputJsonValue,
      expiresAt,
    })),
    skipDuplicates: true,
  })

  // Clean up expired scores (async, don't wait)
  prisma.attentionScore
    .deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    })
    .catch((err: unknown) => {
      console.error("Error cleaning up expired scores:", err)
    })
}

/**
 * Calculate attention scores for a batch of clients
 */
async function calculateClientScoresBatch(
  clientIds: number[],
  fourteenDaysAgo: Date,
  missedCheckinsPolicy: "option_a" | "option_b"
): Promise<AttentionQueueItem[]> {
  if (clientIds.length === 0) return []

  const settings = await getSystemSettings()

  const [clients, recentEntries, latestEntries] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { in: clientIds },
        role: "CLIENT",
      },
      select: {
        id: true,
        email: true,
        name: true,
        checkInFrequencyDays: true,
        cohortMemberships: {
          select: {
            cohortId: true,
            cohort: {
              select: {
                checkInFrequencyDays: true,
              },
            },
          },
        },
      },
    }),
    prisma.entry.findMany({
      where: {
        userId: { in: clientIds },
        date: { gte: fourteenDaysAgo },
      },
      select: {
        userId: true,
        date: true,
      },
    }),
    prisma.entry.findMany({
      where: {
        userId: { in: clientIds },
      },
      select: {
        userId: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
      distinct: ["userId"],
    }),
  ])

  const recentEntriesByUser = new Map<number, Date[]>()
  for (const entry of recentEntries) {
    const dates = recentEntriesByUser.get(entry.userId) || []
    dates.push(entry.date)
    recentEntriesByUser.set(entry.userId, dates)
  }

  const latestEntryMap = new Map<number, Date>()
  for (const entry of latestEntries) {
    if (!latestEntryMap.has(entry.userId)) {
      latestEntryMap.set(entry.userId, entry.date)
    }
  }

  const scores: AttentionQueueItem[] = []
  for (const client of clients) {
    const recent = recentEntriesByUser.get(client.id) || []
    const lastEntryDate = latestEntryMap.get(client.id) || null
    const cohortFrequency = client.cohortMemberships[0]?.cohort?.checkInFrequencyDays ?? null
    const userFrequency = client.checkInFrequencyDays ?? null
    const effectiveFrequency = cohortFrequency ?? userFrequency ?? settings.defaultCheckInFrequencyDays

    const score = calculateUserScoreFromData(
      {
        id: client.id,
        name: client.name,
        email: client.email,
        memberships: client.cohortMemberships.map((m) => ({ cohortId: m.cohortId })),
      },
      recent,
      lastEntryDate,
      {
        missedCheckinsPolicy,
        checkInFrequencyDays: effectiveFrequency,
      }
    )

    if (score.score > 0) {
      scores.push({
        ...score,
        entityName: client.name || client.email,
        entityEmail: client.email,
      })
    }
  }

  return scores
}

/**
 * Get cached attention scores if available
 */
async function getCachedScores(): Promise<AttentionQueueItem[] | null> {
  const now = new Date()
  const cachedScores = await prisma.attentionScore.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: {
      score: "desc",
    },
  })

  if (cachedScores.length === 0) {
    return null
  }

  // Fetch entity names/emails for cached scores
  const userIds = cachedScores.filter((s) => s.entityType === "user").map((s) => s.entityId)
  const coachIds = cachedScores.filter((s) => s.entityType === "coach").map((s) => s.entityId)
  const cohortIds = cachedScores.filter((s) => s.entityType === "cohort").map((s) => s.entityId)

  const [users, coaches, cohorts] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [],
    coachIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: coachIds } },
          select: { id: true, name: true, email: true },
        })
      : [],
    cohortIds.length > 0
      ? prisma.cohort.findMany({
          where: { id: { in: cohortIds } },
          select: { id: true, name: true },
        })
      : [],
  ])

  const userMap = new Map(users.map((u) => [u.id, u] as const))
  const coachMap = new Map(coaches.map((c) => [c.id, c] as const))
  const cohortMap = new Map(cohorts.map((c) => [c.id, c] as const))

  return cachedScores.map((score) => {
    let entityName = ""
    let entityEmail: string | undefined

    if (score.entityType === "user") {
      const user = userMap.get(score.entityId)
      entityName = user?.name || user?.email || String(score.entityId)
      entityEmail = user?.email
    } else if (score.entityType === "coach") {
      const coach = coachMap.get(score.entityId)
      entityName = coach?.name || coach?.email || String(score.entityId)
      entityEmail = coach?.email
    } else if (score.entityType === "cohort") {
      const cohort = cohortMap.get(score.entityId)
      entityName = cohort?.name || String(score.entityId)
    }

    return {
      entityType: score.entityType as "user" | "coach" | "cohort",
      entityId: score.entityId,
      entityName,
      entityEmail,
      priority: score.priority as Priority,
      score: score.score,
      reasons: score.reasons,
      suggestedActions: [], // Not stored in cache
      metadata: score.metadata as Record<string, unknown> | undefined,
    }
  })
}

/**
 * Calculate attention queue for all entities
 */
export async function calculateAttentionQueue(options: {
  forceRefresh?: boolean
  batchSize?: number
  entityType?: "user" | "coach" | "cohort"
} = {}): Promise<{
  red: AttentionQueueItem[]
  amber: AttentionQueueItem[]
  green: AttentionQueueItem[]
}> {
  const forceRefresh = options.forceRefresh ?? false
  const batchSize = options.batchSize ?? 200

  // Try to use cached scores if available
  const cachedScores = forceRefresh ? null : await getCachedScores()
  if (!forceRefresh && cachedScores && cachedScores.length > 0) {
    const red = cachedScores.filter((item) => item.priority === "red")
    const amber = cachedScores.filter((item) => item.priority === "amber")
    const green = cachedScores.filter((item) => item.priority === "green")
    return { red, amber, green }
  }

  // Calculate fresh scores
  const settings = await getSystemSettings()
  const queue: AttentionQueueItem[] = []
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [allClientIds, coaches, cohorts, allEntries] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { role: "COACH" },
      select: {
        id: true,
        email: true,
        name: true,
        coachCohorts: {
          select: {
            cohortId: true,
            cohort: {
              select: {
                id: true,
                members: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.cohort.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        coaches: {
          select: { coachId: true },
        },
        members: {
          select: { userId: true },
        },
      },
    }),
    prisma.entry.findMany({
      where: { date: { gte: fourteenDaysAgo } },
      select: { userId: true, date: true },
    }),
  ])

  // Build entry count map
  const clientEntryCounts = new Map<number, number>()
  for (const entry of allEntries) {
    const count = clientEntryCounts.get(entry.userId) || 0
    clientEntryCounts.set(entry.userId, count + 1)
  }

  // Calculate client scores in batches
  const clientIds = allClientIds.map((c) => c.id)
  const batches = chunkIds(clientIds, batchSize)

  for (const batch of batches) {
    const batchScores = await calculateClientScoresBatch(
      batch,
      fourteenDaysAgo,
      settings.attentionMissedCheckinsPolicy
    )
    if (batchScores.length > 0) {
      queue.push(...batchScores)
      await storeAttentionScores(batchScores)
    }
  }

  // Calculate coach scores
  const coachScores: AttentionQueueItem[] = []
  for (const coach of coaches) {
    const coachCohorts = coach.coachCohorts.map((cc) => ({
      id: cc.cohort.id,
      memberships: cc.cohort.members,
    }))

    const score = calculateCoachScoreFromData(
      {
        id: coach.id,
        name: coach.name,
        email: coach.email,
        cohorts: coachCohorts,
      },
      clientEntryCounts
    )

    if (score.score > 0) {
      coachScores.push({
        ...score,
        entityName: coach.name || coach.email,
        entityEmail: coach.email,
      })
    }
  }

  // Calculate cohort scores
  const cohortScores: AttentionQueueItem[] = []
  for (const cohort of cohorts) {
    const score = calculateCohortScoreFromData(
      {
        id: cohort.id,
        name: cohort.name,
        coaches: cohort.coaches,
        memberships: cohort.members,
      },
      clientEntryCounts
    )

    if (score.score > 0) {
      cohortScores.push({
        ...score,
        entityName: cohort.name,
      })
    }
  }

  // Store and add to queue
  if (coachScores.length > 0) {
    await storeAttentionScores(coachScores)
    queue.push(...coachScores)
  }
  if (cohortScores.length > 0) {
    await storeAttentionScores(cohortScores)
    queue.push(...cohortScores)
  }

  // Sort by score and group by priority
  queue.sort((a, b) => b.score - a.score)

  const red = queue.filter((item) => item.priority === "red")
  const amber = queue.filter((item) => item.priority === "amber")
  const green = queue.filter((item) => item.priority === "green")

  return { red, amber, green }
}

/**
 * Get attention score for a single client
 */
export async function getClientAttentionScore(userId: number): Promise<AttentionQueueItem | null> {
  // Check cache first
  const cached = await prisma.attentionScore.findUnique({
    where: {
      entityType_entityId: {
        entityType: "user",
        entityId: userId,
      },
    },
  })

  if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    return {
      entityType: "user",
      entityId: userId,
      entityName: user?.name || user?.email || String(userId),
      entityEmail: user?.email,
      priority: cached.priority as Priority,
      score: cached.score,
      reasons: cached.reasons,
      suggestedActions: [],
      metadata: cached.metadata as Record<string, unknown> | undefined,
    }
  }

  // Calculate fresh score
  const settings = await getSystemSettings()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const scores = await calculateClientScoresBatch([userId], fourteenDaysAgo, settings.attentionMissedCheckinsPolicy)

  if (scores.length > 0) {
    await storeAttentionScores(scores)
    return scores[0]
  }

  return null
}

/**
 * Recalculate attention scores for specific clients
 */
export async function recalculateClientAttention(clientIds: number[]): Promise<void> {
  if (clientIds.length === 0) return

  const uniqueIds = Array.from(new Set(clientIds))
  const settings = await getSystemSettings()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const batches = chunkIds(uniqueIds, 200)

  for (const batch of batches) {
    const batchScores = await calculateClientScoresBatch(
      batch,
      fourteenDaysAgo,
      settings.attentionMissedCheckinsPolicy
    )
    if (batchScores.length > 0) {
      await storeAttentionScores(batchScores)
    }
  }
}
