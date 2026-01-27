"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfDay, endOfDay } from "date-fns"

const upsertEntrySchema = z.object({
  date: z.string().min(1),
  weight: z.number().optional().nullable(),
  bodyFatPercentage: z.number().min(1).max(70).optional().nullable(),
  heightInches: z.number().min(20).max(108).optional().nullable(),
  steps: z.number().int().optional().nullable(),
  calories: z.number().int().optional().nullable(),
  sleepQuality: z.number().int().min(1).max(10).optional().nullable(),
  perceivedStress: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().optional().nullable(),
  customResponses: z.record(z.any()).optional().nullable(),
  dataSources: z.record(z.string()).optional().nullable(),
})

export type UpsertEntryInput = z.infer<typeof upsertEntrySchema>

export async function getEntries(params?: {
  userId?: number
  from?: Date
  to?: Date
  limit?: number
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const userId = params?.userId || Number(session.user.id)

  // Check permission: users can only see their own entries unless admin/coach
  if (userId !== Number(session.user.id) && session.user.role === "CLIENT") {
    throw new Error("Forbidden: cannot view other users' entries")
  }

  const where: any = { userId }

  if (params?.from || params?.to) {
    where.date = {}
    if (params.from) where.date.gte = startOfDay(params.from)
    if (params.to) where.date.lte = startOfDay(params.to)
  }

  return prisma.entry.findMany({
    where,
    orderBy: { date: "desc" },
    take: params?.limit || 100,
  })
}

export async function getEntryByDate(date: Date, userId?: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const targetUserId = userId || Number(session.user.id)

  // Check permission
  if (targetUserId !== Number(session.user.id) && session.user.role === "CLIENT") {
    throw new Error("Forbidden")
  }

  return prisma.entry.findUnique({
    where: {
      userId_date: {
        userId: targetUserId,
        date: startOfDay(date),
      },
    },
  })
}

export async function upsertEntry(input: UpsertEntryInput) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only clients can create entries for themselves
  if (session.user.role !== "CLIENT") {
    throw new Error("Forbidden: only members can create check-ins")
  }

  const result = upsertEntrySchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const validated = result.data
  const date = startOfDay(new Date(validated.date))
  const userId = Number(session.user.id)

  // Auto-populate from HealthKit data if not provided by user
  const healthKitData = await getHealthKitDataForDate(userId, date)
  const dataSources: Record<string, string> = validated.dataSources || {}

  // Prepare data - only include defined fields
  const data: any = {}

  // Weight: use user input or keep existing
  if (validated.weight !== undefined) {
    data.weight = validated.weight
    if (validated.weight !== null) dataSources.weight = "manual"
  }

  // Body fat percentage (M3)
  if (validated.bodyFatPercentage !== undefined) {
    data.bodyFatPercentage = validated.bodyFatPercentage
  }

  // Height in inches (M7)
  if (validated.heightInches !== undefined) {
    data.heightInches = validated.heightInches
  }

  // Steps: auto-populate from HealthKit workouts if not provided
  if (validated.steps !== undefined) {
    data.steps = validated.steps
    if (validated.steps !== null) dataSources.steps = "manual"
  } else if (healthKitData.steps !== null) {
    data.steps = healthKitData.steps
    dataSources.steps = "healthkit"
  }

  // Calories: auto-populate from HealthKit if not provided
  if (validated.calories !== undefined) {
    data.calories = validated.calories
    if (validated.calories !== null) dataSources.calories = "manual"
  } else if (healthKitData.calories !== null) {
    data.calories = healthKitData.calories
    dataSources.calories = "healthkit"
  }

  // Sleep quality: derive from SleepRecord if not provided
  if (validated.sleepQuality !== undefined) {
    data.sleepQuality = validated.sleepQuality
    if (validated.sleepQuality !== null) dataSources.sleepQuality = "manual"
  } else if (healthKitData.sleepQuality !== null) {
    data.sleepQuality = healthKitData.sleepQuality
    dataSources.sleepQuality = "healthkit"
  }

  if (validated.perceivedStress !== undefined)
    data.perceivedStress = validated.perceivedStress
  if (validated.notes !== undefined) data.notes = validated.notes
  if (validated.customResponses !== undefined)
    data.customResponses = validated.customResponses

  // Always update dataSources if we have any
  if (Object.keys(dataSources).length > 0) {
    data.dataSources = dataSources
  }

  return prisma.entry.upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    create: {
      userId,
      date,
      ...data,
    },
    update: data,
  })
}

/**
 * Fetches HealthKit data for a specific date to auto-populate entry fields
 */
async function getHealthKitDataForDate(
  userId: number,
  date: Date
): Promise<{
  steps: number | null
  calories: number | null
  sleepQuality: number | null
}> {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Get workouts for the day (can derive steps from walking/running workouts)
  const workouts = await prisma.healthKitWorkout.findMany({
    where: {
      userId,
      startTime: { gte: dayStart, lte: dayEnd },
    },
  })

  // Get sleep record for the night (sleep that ends on this day)
  const sleepRecord = await prisma.sleepRecord.findFirst({
    where: {
      userId,
      endTime: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { totalSleep: "desc" }, // Get longest sleep session
  })

  // Calculate steps from walking/running workouts
  // Estimate ~1300 steps per km for walking, ~1200 for running
  let totalSteps = 0
  let totalCalories = 0

  for (const workout of workouts) {
    // Sum up calories from all workouts
    if (workout.calories) {
      totalCalories += Math.round(workout.calories)
    }

    // Estimate steps from distance-based workouts
    if (workout.distance) {
      const distanceKm = workout.distance / 1000
      const workoutType = workout.workoutType.toLowerCase()

      if (
        workoutType.includes("walk") ||
        workoutType.includes("hike")
      ) {
        totalSteps += Math.round(distanceKm * 1300)
      } else if (workoutType.includes("run") || workoutType.includes("jog")) {
        totalSteps += Math.round(distanceKm * 1200)
      }
    }
  }

  // Derive sleep quality from sleep record (1-10 scale)
  // Based on total sleep: 8+ hours = 10, 7-8 = 8, 6-7 = 6, <6 = 4
  let sleepQuality: number | null = null
  if (sleepRecord) {
    const sleepHours = sleepRecord.totalSleep / 60
    if (sleepHours >= 8) sleepQuality = 10
    else if (sleepHours >= 7.5) sleepQuality = 9
    else if (sleepHours >= 7) sleepQuality = 8
    else if (sleepHours >= 6.5) sleepQuality = 7
    else if (sleepHours >= 6) sleepQuality = 6
    else if (sleepHours >= 5.5) sleepQuality = 5
    else if (sleepHours >= 5) sleepQuality = 4
    else sleepQuality = 3
  }

  return {
    steps: totalSteps > 0 ? totalSteps : null,
    calories: totalCalories > 0 ? totalCalories : null,
    sleepQuality,
  }
}

/**
 * Get HealthKit data preview for a date (used by UI to show auto-fill indicators)
 */
export async function getHealthKitPreview(dateString: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const date = startOfDay(new Date(dateString))
  const userId = Number(session.user.id)

  return getHealthKitDataForDate(userId, date)
}

export async function getCheckInConfig(cohortId?: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // If cohortId provided, fetch config for that cohort
  if (cohortId) {
    return prisma.cohortCheckInConfig.findUnique({
      where: { cohortId },
    })
  }

  // Otherwise, find user's cohort and get its config
  const membership = await prisma.cohortMembership.findFirst({
    where: {
      userId: Number(session.user.id),
      status: "ACTIVE",
    },
    include: {
      cohort: {
        include: {
          config: true,
        },
      },
    },
  })

  return membership?.cohort?.config || null
}

export async function updateCheckInConfig(cohortId: number, prompts: any) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only admins can update check-in configs
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: only admins can update check-in configs")
  }

  return prisma.cohortCheckInConfig.upsert({
    where: { cohortId },
    create: {
      cohortId,
      prompts,
    },
    update: {
      prompts,
    },
  })
}

/**
 * Delete an entry by ID
 * Only the owner can delete their own entries
 */
export async function deleteEntry(entryId: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const userId = Number(session.user.id)

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  })

  if (!entry) {
    throw new Error("Entry not found")
  }

  if (entry.userId !== userId) {
    throw new Error("Forbidden: cannot delete other users' entries")
  }

  await prisma.entry.delete({
    where: { id: entryId },
  })

  return { success: true }
}

export async function getCheckInStats(userId?: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const targetUserId = userId || Number(session.user.id)

  // Check permission
  if (targetUserId !== Number(session.user.id) && session.user.role === "CLIENT") {
    throw new Error("Forbidden")
  }

  const entries = await prisma.entry.findMany({
    where: { userId: targetUserId },
    orderBy: { date: "desc" },
    take: 90, // Last 90 days
    select: { date: true },
  })

  // Calculate streak
  let currentStreak = 0
  let lastDate: Date | null = null

  for (const entry of entries) {
    const entryDate = startOfDay(entry.date)
    const today = startOfDay(new Date())

    if (!lastDate) {
      // First entry
      const daysDiff = Math.floor(
        (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff === 0) {
        currentStreak = 1
        lastDate = entryDate
      } else {
        break // Streak broken
      }
    } else {
      const daysDiff = Math.floor(
        (lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff === 1) {
        currentStreak++
        lastDate = entryDate
      } else {
        break // Streak broken
      }
    }
  }

  return {
    totalEntries: entries.length,
    currentStreak,
    lastCheckIn: entries[0]?.date || null,
  }
}
