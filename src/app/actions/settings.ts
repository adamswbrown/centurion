"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireAuth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit-log"
import type { Prisma } from "@prisma/client"

// ============================================
// SYSTEM SETTINGS DEFAULTS
// ============================================

export const SYSTEM_SETTINGS_DEFAULTS: Record<string, unknown> = {
  // Coach management
  maxClientsPerCoach: 50,
  minClientsPerCoach: 10,

  // Activity windows
  recentActivityDays: 14,
  lowEngagementEntries: 7,
  noActivityDays: 14,
  criticalNoActivityDays: 30,
  shortTermWindowDays: 7,
  longTermWindowDays: 30,

  // Check-in
  defaultCheckInFrequencyDays: 7,
  notificationTimeUtc: "09:00",

  // Feature flags
  healthkitEnabled: true,
  iosIntegrationEnabled: true,
  showPersonalizedPlan: true,

  // Admin
  adminOverrideEmail: "",

  // Adherence scoring
  adherenceGreenMinimum: 6,
  adherenceAmberMinimum: 3,
  attentionMissedCheckinsPolicy: "option_a",

  // Body fat categories
  bodyFatLowPercent: 12.5,
  bodyFatMediumPercent: 20.0,
  bodyFatHighPercent: 30.0,
  bodyFatVeryHighPercent: 37.5,

  // Nutrition
  minDailyCalories: 1000,
  maxDailyCalories: 5000,
  minProteinPerLb: 0.4,
  maxProteinPerLb: 2.0,
  defaultCarbsPercent: 40.0,
  defaultProteinPercent: 30.0,
  defaultFatPercent: 30.0,

  // Step categories (thresholds)
  stepsNotMuch: 5000,
  stepsLight: 7500,
  stepsModerate: 10000,
  stepsHeavy: 12500,

  // Workout categories (minutes thresholds)
  workoutNotMuch: 75,
  workoutLight: 150,
  workoutModerate: 225,
  workoutHeavy: 300,

  // Legal content
  termsContentHtml: "",
  privacyContentHtml: "",
  dataProcessingContentHtml: "",
  consentVersion: "1.0.0",
}

// ============================================
// VALIDATION SCHEMAS BY CATEGORY
// ============================================

const coachManagementSchema = z.object({
  maxClientsPerCoach: z.number().int().positive().optional(),
  minClientsPerCoach: z.number().int().positive().optional(),
})

const activityWindowsSchema = z.object({
  recentActivityDays: z.number().int().positive().optional(),
  lowEngagementEntries: z.number().int().positive().optional(),
  noActivityDays: z.number().int().positive().optional(),
  criticalNoActivityDays: z.number().int().positive().optional(),
  shortTermWindowDays: z.number().int().positive().optional(),
  longTermWindowDays: z.number().int().positive().optional(),
})

const checkInSchema = z.object({
  defaultCheckInFrequencyDays: z.number().int().positive().optional(),
  notificationTimeUtc: z.string().optional(),
})

const featureFlagsSchema = z.object({
  healthkitEnabled: z.boolean().optional(),
  iosIntegrationEnabled: z.boolean().optional(),
  showPersonalizedPlan: z.boolean().optional(),
})

const adminSchema = z.object({
  adminOverrideEmail: z.string().optional(),
})

const adherenceScoringSchema = z.object({
  adherenceGreenMinimum: z.number().int().min(0).optional(),
  adherenceAmberMinimum: z.number().int().min(0).optional(),
  attentionMissedCheckinsPolicy: z.string().optional(),
})

const bodyFatSchema = z.object({
  bodyFatLowPercent: z.number().min(0).max(100).optional(),
  bodyFatMediumPercent: z.number().min(0).max(100).optional(),
  bodyFatHighPercent: z.number().min(0).max(100).optional(),
  bodyFatVeryHighPercent: z.number().min(0).max(100).optional(),
})

const nutritionSchema = z.object({
  minDailyCalories: z.number().int().positive().optional(),
  maxDailyCalories: z.number().int().positive().optional(),
  minProteinPerLb: z.number().min(0).optional(),
  maxProteinPerLb: z.number().min(0).optional(),
  defaultCarbsPercent: z.number().min(0).max(100).optional(),
  defaultProteinPercent: z.number().min(0).max(100).optional(),
  defaultFatPercent: z.number().min(0).max(100).optional(),
})

const stepCategoriesSchema = z.object({
  stepsNotMuch: z.number().int().min(0).optional(),
  stepsLight: z.number().int().min(0).optional(),
  stepsModerate: z.number().int().min(0).optional(),
  stepsHeavy: z.number().int().min(0).optional(),
})

const workoutCategoriesSchema = z.object({
  workoutNotMuch: z.number().int().min(0).optional(),
  workoutLight: z.number().int().min(0).optional(),
  workoutModerate: z.number().int().min(0).optional(),
  workoutHeavy: z.number().int().min(0).optional(),
})

const legalContentSchema = z.object({
  termsContentHtml: z.string().optional(),
  privacyContentHtml: z.string().optional(),
  dataProcessingContentHtml: z.string().optional(),
  consentVersion: z.string().optional(),
})

// Combined schema for all settings
const systemSettingsSchema = coachManagementSchema
  .merge(activityWindowsSchema)
  .merge(checkInSchema)
  .merge(featureFlagsSchema)
  .merge(adminSchema)
  .merge(adherenceScoringSchema)
  .merge(bodyFatSchema)
  .merge(nutritionSchema)
  .merge(stepCategoriesSchema)
  .merge(workoutCategoriesSchema)
  .merge(legalContentSchema)

const updateUserProfileSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  email: z.string().email("Valid email required").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
})

// ============================================
// HELPER: Get individual setting with typed default
// ============================================

export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await prisma.systemSettings.findUnique({ where: { key } })
  return setting ? (setting.value as T) : defaultValue
}

// ============================================
// SYSTEM SETTINGS CRUD
// ============================================

export async function getSystemSettings() {
  await requireAdmin()

  const settings = await prisma.systemSettings.findMany()

  // Start with defaults, override with DB values
  const result: Record<string, unknown> = { ...SYSTEM_SETTINGS_DEFAULTS }
  for (const setting of settings) {
    result[setting.key] = setting.value
  }

  return result
}

export async function updateSystemSettings(input: Record<string, unknown>) {
  const session = await requireAdmin()

  // Validate against combined schema (partial - all fields optional)
  const result = systemSettingsSchema.partial().safeParse(input)
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

// ============================================
// USER PROFILE
// ============================================

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
