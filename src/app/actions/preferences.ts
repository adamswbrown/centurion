"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireCoach } from "@/lib/auth"

const userPreferenceSchema = z.object({
  weightUnit: z.enum(["lbs", "kg"]).optional(),
  measurementUnit: z.enum(["inches", "cm"]).optional(),
  dateFormat: z.enum(["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]).optional(),
})

export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>

const DEFAULT_PREFERENCES = {
  weightUnit: "lbs" as const,
  measurementUnit: "inches" as const,
  dateFormat: "MM/dd/yyyy" as const,
}

export async function getUserPreferences(userId?: number) {
  const session = await requireAuth()
  const currentUserId = Number.parseInt(session.id, 10)

  // Clients can only access their own preferences
  if (userId && userId !== currentUserId) {
    await requireCoach()
  }

  const targetUserId = userId || currentUserId

  const preferences = await prisma.userPreference.findUnique({
    where: { userId: targetUserId },
  })

  if (!preferences) {
    return {
      id: 0,
      userId: targetUserId,
      ...DEFAULT_PREFERENCES,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return preferences
}

export async function updateUserPreferences(input: UserPreferenceInput) {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const result = userPreferenceSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const data = result.data

  const updateData: Record<string, string> = {}
  if (data.weightUnit) updateData.weightUnit = data.weightUnit
  if (data.measurementUnit) updateData.measurementUnit = data.measurementUnit
  if (data.dateFormat) updateData.dateFormat = data.dateFormat

  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      weightUnit: data.weightUnit || DEFAULT_PREFERENCES.weightUnit,
      measurementUnit: data.measurementUnit || DEFAULT_PREFERENCES.measurementUnit,
      dateFormat: data.dateFormat || DEFAULT_PREFERENCES.dateFormat,
    },
  })

  return { success: true, preferences }
}
