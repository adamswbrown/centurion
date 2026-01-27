"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireCoach } from "@/lib/auth"

const DEFAULT_CHECK_IN_FREQUENCY_DAYS = 7

/**
 * Resolves the effective check-in frequency for a user using 3-level override:
 * User override > Cohort override > System default
 */
export async function getEffectiveCheckInFrequency(userId: number): Promise<number> {
  await requireAuth()

  // 1. Check user-level override
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { checkInFrequencyDays: true },
  })

  if (user?.checkInFrequencyDays) {
    return user.checkInFrequencyDays
  }

  // 2. Check cohort-level override (find user's active cohort)
  const membership = await prisma.cohortMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      cohort: {
        select: { checkInFrequencyDays: true },
      },
    },
  })

  if (membership?.cohort?.checkInFrequencyDays) {
    return membership.cohort.checkInFrequencyDays
  }

  // 3. Fall back to system default
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "defaultCheckInFrequencyDays" },
  })

  if (setting) {
    const value = Number(setting.value)
    if (!isNaN(value) && value > 0) {
      return value
    }
  }

  return DEFAULT_CHECK_IN_FREQUENCY_DAYS
}

/**
 * Update the cohort-level check-in frequency override.
 * Pass null to clear the override (reverts to system default).
 */
export async function updateCohortCheckInFrequency(cohortId: number, days: number | null) {
  await requireCoach()

  if (days !== null && (days < 1 || days > 90)) {
    return { error: "Frequency must be between 1 and 90 days" }
  }

  await prisma.cohort.update({
    where: { id: cohortId },
    data: { checkInFrequencyDays: days },
  })

  return { success: true }
}

/**
 * Update the user-level check-in frequency override.
 * Pass null to clear the override (reverts to cohort/system default).
 */
export async function updateUserCheckInFrequency(userId: number, days: number | null) {
  await requireCoach()

  if (days !== null && (days < 1 || days > 90)) {
    return { error: "Frequency must be between 1 and 90 days" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { checkInFrequencyDays: days },
  })

  return { success: true }
}

/**
 * Returns all 3 levels of check-in frequency configuration for a user.
 */
export async function getCheckInFrequencyConfig(userId: number) {
  await requireAuth()

  // System default
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "defaultCheckInFrequencyDays" },
  })
  const systemDefault = setting ? Number(setting.value) : DEFAULT_CHECK_IN_FREQUENCY_DAYS

  // Cohort override
  const membership = await prisma.cohortMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      cohort: {
        select: { checkInFrequencyDays: true, name: true },
      },
    },
  })
  const cohortOverride = membership?.cohort?.checkInFrequencyDays ?? null
  const cohortName = membership?.cohort?.name ?? null

  // User override
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { checkInFrequencyDays: true },
  })
  const userOverride = user?.checkInFrequencyDays ?? null

  // Effective value (user > cohort > system)
  const effective = userOverride ?? cohortOverride ?? systemDefault

  return {
    systemDefault,
    cohortOverride,
    cohortName,
    userOverride,
    effective,
  }
}
