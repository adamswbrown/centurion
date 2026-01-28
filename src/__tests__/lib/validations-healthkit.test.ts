import { describe, it, expect } from "vitest"
import {
  ingestWorkoutsSchema,
  ingestStepsSchema,
  ingestSleepSchema,
  pairingCodeSchema,
} from "@/lib/validations/healthkit"

describe("healthkit validations", () => {
  describe("ingestWorkoutsSchema", () => {
    it("validates correct workout data", () => {
      const validData = {
        client_id: 1,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: 3600,
            distance_meters: 5000,
            calories_burned: 300,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("validates workout with minimal required fields", () => {
      const minimalData = {
        client_id: 5,
        workouts: [
          {
            workout_type: "Cycling",
            start_time: "2025-01-28T14:00:00Z",
            end_time: "2025-01-28T15:30:00Z",
            duration_seconds: 5400,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it("validates workout with max 100 items", () => {
      const maxData = {
        client_id: 2,
        workouts: Array(100).fill({
          workout_type: "Walking",
          start_time: "2025-01-28T08:00:00Z",
          end_time: "2025-01-28T08:30:00Z",
          duration_seconds: 1800,
        }),
      }

      const result = ingestWorkoutsSchema.safeParse(maxData)
      expect(result.success).toBe(true)
    })

    it("fails when client_id is 0", () => {
      const invalidData = {
        client_id: 0,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: 3600,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when client_id is negative", () => {
      const invalidData = {
        client_id: -5,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: 3600,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when client_id is not an integer", () => {
      const invalidData = {
        client_id: 3.5,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: 3600,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when workouts array is empty", () => {
      const invalidData = {
        client_id: 1,
        workouts: [],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when workouts array has more than 100 items", () => {
      const invalidData = {
        client_id: 1,
        workouts: Array(101).fill({
          workout_type: "Running",
          start_time: "2025-01-28T10:00:00Z",
          end_time: "2025-01-28T11:00:00Z",
          duration_seconds: 3600,
        }),
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when workout_type is missing", () => {
      const invalidData = {
        client_id: 1,
        workouts: [
          {
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: 3600,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when start_time has invalid datetime format", () => {
      const invalidData = {
        client_id: 1,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: 3600,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when end_time has invalid datetime format", () => {
      const invalidData = {
        client_id: 1,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "invalid-date",
            duration_seconds: 3600,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when duration_seconds is 0", () => {
      const invalidData = {
        client_id: 1,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T10:00:00Z",
            duration_seconds: 0,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when duration_seconds is negative", () => {
      const invalidData = {
        client_id: 1,
        workouts: [
          {
            workout_type: "Running",
            start_time: "2025-01-28T10:00:00Z",
            end_time: "2025-01-28T11:00:00Z",
            duration_seconds: -100,
          },
        ],
      }

      const result = ingestWorkoutsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("ingestStepsSchema", () => {
    it("validates correct steps data", () => {
      const validData = {
        client_id: 1,
        steps: [
          {
            date: "2025-01-28",
            total_steps: 10000,
          },
          {
            date: "2025-01-27",
            total_steps: 8500,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("validates steps with 0 total_steps", () => {
      const validData = {
        client_id: 3,
        steps: [
          {
            date: "2025-01-28",
            total_steps: 0,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("validates steps with max value 200000", () => {
      const validData = {
        client_id: 2,
        steps: [
          {
            date: "2025-01-28",
            total_steps: 200000,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("validates steps with max 400 items", () => {
      const maxData = {
        client_id: 1,
        steps: Array(400).fill({
          date: "2025-01-28",
          total_steps: 5000,
        }),
      }

      const result = ingestStepsSchema.safeParse(maxData)
      expect(result.success).toBe(true)
    })

    it("fails when client_id is invalid", () => {
      const invalidData = {
        client_id: 0,
        steps: [
          {
            date: "2025-01-28",
            total_steps: 1000,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when steps array is empty", () => {
      const invalidData = {
        client_id: 1,
        steps: [],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when steps array has more than 400 items", () => {
      const invalidData = {
        client_id: 1,
        steps: Array(401).fill({
          date: "2025-01-28",
          total_steps: 1000,
        }),
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when date format is invalid", () => {
      const invalidData = {
        client_id: 1,
        steps: [
          {
            date: "01-28-2025",
            total_steps: 1000,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when total_steps is negative", () => {
      const invalidData = {
        client_id: 1,
        steps: [
          {
            date: "2025-01-28",
            total_steps: -100,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when total_steps exceeds 200000", () => {
      const invalidData = {
        client_id: 1,
        steps: [
          {
            date: "2025-01-28",
            total_steps: 200001,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when date is missing", () => {
      const invalidData = {
        client_id: 1,
        steps: [
          {
            total_steps: 1000,
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when total_steps is missing", () => {
      const invalidData = {
        client_id: 1,
        steps: [
          {
            date: "2025-01-28",
          },
        ],
      }

      const result = ingestStepsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("ingestSleepSchema", () => {
    it("validates correct sleep data", () => {
      const validData = {
        client_id: 1,
        sleep_records: [
          {
            date: "2025-01-28",
            total_sleep_minutes: 480,
            deep_sleep_minutes: 120,
            rem_sleep_minutes: 90,
            light_sleep_minutes: 270,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("validates sleep with only required fields", () => {
      const minimalData = {
        client_id: 2,
        sleep_records: [
          {
            date: "2025-01-28",
            total_sleep_minutes: 360,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it("validates sleep with max value 1440", () => {
      const validData = {
        client_id: 3,
        sleep_records: [
          {
            date: "2025-01-28",
            total_sleep_minutes: 1440,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("validates sleep with max 400 items", () => {
      const maxData = {
        client_id: 1,
        sleep_records: Array(400).fill({
          date: "2025-01-28",
          total_sleep_minutes: 480,
        }),
      }

      const result = ingestSleepSchema.safeParse(maxData)
      expect(result.success).toBe(true)
    })

    it("fails when client_id is invalid", () => {
      const invalidData = {
        client_id: -1,
        sleep_records: [
          {
            date: "2025-01-28",
            total_sleep_minutes: 480,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when sleep_records array is empty", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: [],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when sleep_records array has more than 400 items", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: Array(401).fill({
          date: "2025-01-28",
          total_sleep_minutes: 480,
        }),
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when date format is invalid", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: [
          {
            date: "28-01-2025",
            total_sleep_minutes: 480,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when total_sleep_minutes exceeds 1440", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: [
          {
            date: "2025-01-28",
            total_sleep_minutes: 1441,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when total_sleep_minutes is negative", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: [
          {
            date: "2025-01-28",
            total_sleep_minutes: -10,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when date is missing", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: [
          {
            total_sleep_minutes: 480,
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when total_sleep_minutes is missing", () => {
      const invalidData = {
        client_id: 1,
        sleep_records: [
          {
            date: "2025-01-28",
          },
        ],
      }

      const result = ingestSleepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("pairingCodeSchema", () => {
    it("validates correct 6-character alphanumeric code", () => {
      const validCodes = ["ABC123", "XYZ789", "A1B2C3", "123456", "ABCDEF"]

      validCodes.forEach((code) => {
        const result = pairingCodeSchema.safeParse({ code })
        expect(result.success).toBe(true)
      })
    })

    it("fails when code is less than 6 characters", () => {
      const invalidData = { code: "ABC12" }

      const result = pairingCodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when code is more than 6 characters", () => {
      const invalidData = { code: "ABC1234" }

      const result = pairingCodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when code contains non-alphanumeric characters", () => {
      const invalidCodes = ["ABC-12", "AB@123", "ABC 12", "AB!123"]

      invalidCodes.forEach((code) => {
        const result = pairingCodeSchema.safeParse({ code })
        expect(result.success).toBe(false)
      })
    })

    it("fails when code is empty", () => {
      const invalidData = { code: "" }

      const result = pairingCodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when code is missing", () => {
      const invalidData = {}

      const result = pairingCodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("fails when code contains lowercase letters mixed with special characters", () => {
      const invalidData = { code: "abc!23" }

      const result = pairingCodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
