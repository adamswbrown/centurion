"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfDay } from "date-fns"

const upsertEntrySchema = z.object({
  date: z.string().min(1),
  weight: z.number().optional().nullable(),
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

  // Prepare data - only include defined fields
  const data: any = {}
  if (validated.weight !== undefined) data.weight = validated.weight
  if (validated.steps !== undefined) data.steps = validated.steps
  if (validated.calories !== undefined) data.calories = validated.calories
  if (validated.sleepQuality !== undefined)
    data.sleepQuality = validated.sleepQuality
  if (validated.perceivedStress !== undefined)
    data.perceivedStress = validated.perceivedStress
  if (validated.notes !== undefined) data.notes = validated.notes
  if (validated.customResponses !== undefined)
    data.customResponses = validated.customResponses
  if (validated.dataSources !== undefined)
    data.dataSources = validated.dataSources

  return prisma.entry.upsert({
    where: {
      userId_date: {
        userId: Number(session.user.id),
        date,
      },
    },
    create: {
      userId: Number(session.user.id),
      date,
      ...data,
    },
    update: data,
  })
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
