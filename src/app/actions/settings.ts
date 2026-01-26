"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireAuth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit-log"
import type { Prisma } from "@prisma/client"

const systemSettingsSchema = z.object({
  maxClientsPerCoach: z.number().int().positive().optional(),
  healthkitEnabled: z.boolean().optional(),
  iosIntegrationEnabled: z.boolean().optional(),
  defaultProteinPercent: z.number().min(0).max(100).optional(),
  defaultCarbsPercent: z.number().min(0).max(100).optional(),
  defaultFatPercent: z.number().min(0).max(100).optional(),
})

const updateUserProfileSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  email: z.string().email("Valid email required").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
})

export async function getSystemSettings() {
  await requireAdmin()

  const settings = await prisma.systemSettings.findMany()

  const result: Record<string, unknown> = {}
  for (const setting of settings) {
    result[setting.key] = setting.value
  }

  return result
}

export async function updateSystemSettings(input: z.infer<typeof systemSettingsSchema>) {
  const session = await requireAdmin()

  const result = systemSettingsSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const actorId = Number.parseInt(session.id, 10)
  const updatedSettings: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(result.data)) {
    if (value !== undefined) {
      const jsonValue = value as Prisma.InputJsonValue
      await prisma.systemSettings.upsert({
        where: { key },
        update: { value: jsonValue },
        create: { key, value: jsonValue },
      })
      updatedSettings[key] = value
    }
  }

  await logAuditEvent({
    action: "UPDATE_SYSTEM_SETTINGS",
    actorId,
    targetType: "SystemSettings",
    details: updatedSettings,
  })

  return updatedSettings
}

export async function getUserSettings(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
      creditsExpiry: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  return user
}

export async function updateUserProfile(input: z.infer<typeof updateUserProfileSchema>) {
  const session = await requireAuth()

  const result = updateUserProfileSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { name, email, password } = result.data
  const hashed = password ? await bcrypt.hash(password, 10) : undefined
  const userId = Number.parseInt(session.id, 10)

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(hashed !== undefined ? { password: hashed } : {}),
    },
  })

  await logAuditEvent({
    action: "UPDATE_USER_PROFILE",
    actorId: userId,
    targetId: user.id,
    targetType: "User",
    details: { name, email },
  })

  return user
}
