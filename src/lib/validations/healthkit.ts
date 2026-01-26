/**
 * Zod validation schemas for HealthKit data ingestion endpoints.
 * These schemas validate data sent from the iOS app.
 */

import { z } from "zod"

// Common field validators
const idSchema = z.number().int().positive("Invalid user ID")
const isoDateTimeSchema = z.string().datetime({ message: "Invalid ISO 8601 datetime" })
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")

// ==================== Workout Schemas ====================

const workoutItemSchema = z.object({
  workout_type: z.string().min(1, "Workout type is required").max(100),
  start_time: isoDateTimeSchema,
  end_time: isoDateTimeSchema,
  duration_seconds: z.number().positive("Duration must be positive"),
  calories_active: z.number().nonnegative().nullable().optional(),
  distance_meters: z.number().nonnegative().nullable().optional(),
  avg_heart_rate: z.number().min(30).max(250).nullable().optional(),
  max_heart_rate: z.number().min(30).max(250).nullable().optional(),
  source_device: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const ingestWorkoutsSchema = z.object({
  client_id: idSchema,
  workouts: z
    .array(workoutItemSchema)
    .min(1, "At least one workout is required")
    .max(100, "Maximum 100 workouts per request"),
})

export type IngestWorkoutsInput = z.infer<typeof ingestWorkoutsSchema>
export type WorkoutItem = z.infer<typeof workoutItemSchema>

// ==================== Steps Schemas ====================

const stepsItemSchema = z.object({
  date: dateOnlySchema,
  total_steps: z
    .number()
    .int()
    .nonnegative("Steps cannot be negative")
    .max(200000, "Steps seem unreasonably high"),
  source_devices: z.array(z.string().max(100)).optional(),
})

export const ingestStepsSchema = z.object({
  client_id: idSchema,
  steps: z
    .array(stepsItemSchema)
    .min(1, "At least one step record is required")
    .max(400, "Maximum 400 step records per request"),
})

export type IngestStepsInput = z.infer<typeof ingestStepsSchema>
export type StepsItem = z.infer<typeof stepsItemSchema>

// ==================== Sleep Schemas ====================

const sleepRecordSchema = z.object({
  date: dateOnlySchema,
  total_sleep_minutes: z
    .number()
    .int()
    .nonnegative()
    .max(1440, "Total sleep cannot exceed 24 hours"),
  in_bed_minutes: z.number().int().nonnegative().max(1440).optional(),
  awake_minutes: z.number().int().nonnegative().max(1440).optional(),
  deep_sleep_minutes: z.number().int().nonnegative().max(1440).optional(),
  rem_sleep_minutes: z.number().int().nonnegative().max(1440).optional(),
  core_sleep_minutes: z.number().int().nonnegative().max(1440).optional(),
  sleep_start: isoDateTimeSchema.optional(),
  sleep_end: isoDateTimeSchema.optional(),
  source_device: z.string().max(100).optional().nullable(),
})

export const ingestSleepSchema = z.object({
  client_id: idSchema,
  sleep_records: z
    .array(sleepRecordSchema)
    .min(1, "At least one sleep record is required")
    .max(400, "Maximum 400 sleep records per request"),
})

export type IngestSleepInput = z.infer<typeof ingestSleepSchema>
export type SleepRecordItem = z.infer<typeof sleepRecordSchema>

// ==================== Pairing Schemas ====================

export const pairingCodeSchema = z.object({
  code: z
    .string()
    .length(6, "Pairing code must be 6 characters")
    .regex(/^[A-Z0-9]+$/i, "Pairing code must be alphanumeric"),
})

export type PairingCodeInput = z.infer<typeof pairingCodeSchema>

export const generatePairingCodeSchema = z.object({
  client_id: idSchema,
  regenerate: z.boolean().optional().default(false),
})

export type GeneratePairingCodeInput = z.infer<typeof generatePairingCodeSchema>

// ==================== Response Schemas ====================

export const healthkitIngestionResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number().int().nonnegative(),
  errors: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        message: z.string(),
      })
    )
    .optional(),
})

export type HealthkitIngestionResponse = z.infer<typeof healthkitIngestionResponseSchema>
