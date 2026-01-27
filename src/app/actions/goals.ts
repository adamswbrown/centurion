"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireCoach } from "@/lib/auth"

const userGoalsSchema = z.object({
  currentWeightKg: z.number().positive().optional().nullable(),
  targetWeightKg: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  dailyCaloriesKcal: z.number().int().positive().optional().nullable(),
  proteinGrams: z.number().positive().optional().nullable(),
  carbGrams: z.number().positive().optional().nullable(),
  fatGrams: z.number().positive().optional().nullable(),
  waterIntakeMl: z.number().int().positive().optional().nullable(),
  dailyStepsTarget: z.number().int().positive().optional().nullable(),
  weeklyWorkoutMinutes: z.number().int().positive().optional().nullable(),
})

export type UserGoalsInput = z.infer<typeof userGoalsSchema>

export async function getUserGoals(userId?: number) {
  const session = await requireAuth()
  const currentUserId = Number.parseInt(session.id, 10)

  // Clients can only access their own goals
  if (userId && userId !== currentUserId) {
    await requireCoach()
  }

  const targetUserId = userId || currentUserId

  const goals = await prisma.userGoals.findUnique({
    where: { userId: targetUserId },
  })

  return goals
}

export async function upsertUserGoals(input: UserGoalsInput) {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const result = userGoalsSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const data = result.data

  const goals = await prisma.userGoals.upsert({
    where: { userId },
    update: {
      currentWeightKg: data.currentWeightKg ?? null,
      targetWeightKg: data.targetWeightKg ?? null,
      heightCm: data.heightCm ?? null,
      dailyCaloriesKcal: data.dailyCaloriesKcal ?? null,
      proteinGrams: data.proteinGrams ?? null,
      carbGrams: data.carbGrams ?? null,
      fatGrams: data.fatGrams ?? null,
      waterIntakeMl: data.waterIntakeMl ?? null,
      dailyStepsTarget: data.dailyStepsTarget ?? null,
      weeklyWorkoutMinutes: data.weeklyWorkoutMinutes ?? null,
    },
    create: {
      userId,
      currentWeightKg: data.currentWeightKg ?? null,
      targetWeightKg: data.targetWeightKg ?? null,
      heightCm: data.heightCm ?? null,
      dailyCaloriesKcal: data.dailyCaloriesKcal ?? null,
      proteinGrams: data.proteinGrams ?? null,
      carbGrams: data.carbGrams ?? null,
      fatGrams: data.fatGrams ?? null,
      waterIntakeMl: data.waterIntakeMl ?? null,
      dailyStepsTarget: data.dailyStepsTarget ?? null,
      weeklyWorkoutMinutes: data.weeklyWorkoutMinutes ?? null,
    },
  })

  return { success: true, goals }
}
