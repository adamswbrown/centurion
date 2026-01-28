"use server"

import { requireCoach } from "@/lib/auth"
import {
  calculateAttentionQueue,
  getClientAttentionScore,
  recalculateClientAttention,
  type AttentionQueueItem,
} from "@/lib/attention"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export interface AttentionQueueResult {
  red: AttentionQueueItem[]
  amber: AttentionQueueItem[]
  green: AttentionQueueItem[]
  totalClients: number
  lastCalculated: Date | null
}

/**
 * Get the full attention queue for all clients
 */
export async function getAttentionQueue(options?: {
  forceRefresh?: boolean
}): Promise<AttentionQueueResult> {
  await requireCoach()

  const queue = await calculateAttentionQueue({
    forceRefresh: options?.forceRefresh ?? false,
  })

  // Get the most recent calculation time
  const lastScore = await prisma.attentionScore.findFirst({
    orderBy: { calculatedAt: "desc" },
    select: { calculatedAt: true },
  })

  return {
    ...queue,
    totalClients: queue.red.length + queue.amber.length + queue.green.length,
    lastCalculated: lastScore?.calculatedAt ?? null,
  }
}

/**
 * Get attention score for a specific client
 */
export async function getClientAttention(userId: number): Promise<AttentionQueueItem | null> {
  await requireCoach()

  return getClientAttentionScore(userId)
}

/**
 * Recalculate attention scores for specific clients
 * Useful after batch operations or data updates
 */
export async function refreshClientAttention(clientIds: number[]): Promise<void> {
  await requireCoach()

  await recalculateClientAttention(clientIds)

  revalidatePath("/coach/review-queue")
}

/**
 * Get attention scores filtered by cohort
 */
export async function getAttentionQueueByCohort(cohortId: number): Promise<AttentionQueueResult> {
  await requireCoach()

  // First get all members of this cohort
  const memberships = await prisma.cohortMembership.findMany({
    where: {
      cohortId,
      status: "ACTIVE",
    },
    select: { userId: true },
  })

  const memberIds = memberships.map((m) => m.userId)

  // Calculate attention scores for these members
  const queue = await calculateAttentionQueue({ forceRefresh: false })

  // Filter to only include cohort members
  const filterByMembers = (items: AttentionQueueItem[]) =>
    items.filter((item) => item.entityType === "user" && memberIds.includes(item.entityId))

  const lastScore = await prisma.attentionScore.findFirst({
    orderBy: { calculatedAt: "desc" },
    select: { calculatedAt: true },
  })

  const red = filterByMembers(queue.red)
  const amber = filterByMembers(queue.amber)
  const green = filterByMembers(queue.green)

  return {
    red,
    amber,
    green,
    totalClients: red.length + amber.length + green.length,
    lastCalculated: lastScore?.calculatedAt ?? null,
  }
}

/**
 * Get system-wide adherence settings
 */
export async function getAdherenceSettings(): Promise<{
  greenMinimum: number
  amberMinimum: number
  missedCheckinsPolicy: "option_a" | "option_b"
  defaultCheckInFrequencyDays: number
}> {
  await requireCoach()

  const settings = await prisma.systemSettings.findMany({
    where: {
      key: {
        in: [
          "adherenceGreenMinimum",
          "adherenceAmberMinimum",
          "attentionMissedCheckinsPolicy",
          "defaultCheckInFrequencyDays",
        ],
      },
    },
  })

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]))

  return {
    greenMinimum: (settingsMap.get("adherenceGreenMinimum") as number) || 70,
    amberMinimum: (settingsMap.get("adherenceAmberMinimum") as number) || 40,
    missedCheckinsPolicy:
      (settingsMap.get("attentionMissedCheckinsPolicy") as "option_a" | "option_b") || "option_a",
    defaultCheckInFrequencyDays: (settingsMap.get("defaultCheckInFrequencyDays") as number) || 1,
  }
}

/**
 * Update adherence settings (admin only)
 */
export async function updateAdherenceSettings(settings: {
  greenMinimum?: number
  amberMinimum?: number
  missedCheckinsPolicy?: "option_a" | "option_b"
  defaultCheckInFrequencyDays?: number
}): Promise<void> {
  const user = await requireCoach()

  // Only admins can update these settings
  if (user.role !== "ADMIN") {
    throw new Error("Only admins can update adherence settings")
  }

  const updates: Array<{ key: string; value: unknown }> = []

  if (settings.greenMinimum !== undefined) {
    updates.push({ key: "adherenceGreenMinimum", value: settings.greenMinimum })
  }
  if (settings.amberMinimum !== undefined) {
    updates.push({ key: "adherenceAmberMinimum", value: settings.amberMinimum })
  }
  if (settings.missedCheckinsPolicy !== undefined) {
    updates.push({ key: "attentionMissedCheckinsPolicy", value: settings.missedCheckinsPolicy })
  }
  if (settings.defaultCheckInFrequencyDays !== undefined) {
    updates.push({ key: "defaultCheckInFrequencyDays", value: settings.defaultCheckInFrequencyDays })
  }

  for (const update of updates) {
    await prisma.systemSettings.upsert({
      where: { key: update.key },
      create: { key: update.key, value: update.value as never },
      update: { value: update.value as never },
    })
  }

  // Invalidate cached attention scores
  await prisma.attentionScore.updateMany({
    data: {
      expiresAt: new Date(), // Force expiration
    },
  })

  revalidatePath("/coach/review-queue")
  revalidatePath("/admin/settings")
}
