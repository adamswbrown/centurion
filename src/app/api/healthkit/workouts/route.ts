/**
 * POST /api/healthkit/workouts
 *
 * Endpoint for iOS app to send HealthKit workout data.
 * Stores workout records with full metadata from Apple Health.
 */

import { NextRequest, NextResponse } from "next/server"
import { ingestWorkoutsSchema } from "@/lib/validations/healthkit"
import { prisma } from "@/lib/prisma"

// CORS headers helper
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  return response
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate request body
    const validated = ingestWorkoutsSchema.parse(body)

    // Verify client exists
    const client = await prisma.user.findUnique({
      where: { id: validated.client_id },
      select: { id: true },
    })

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      )
    }

    // Log sync batch details
    const dateRange =
      validated.workouts.length > 0
        ? {
            earliest: new Date(
              Math.min(
                ...validated.workouts.map((w) => new Date(w.start_time).getTime())
              )
            ).toISOString(),
            latest: new Date(
              Math.max(
                ...validated.workouts.map((w) => new Date(w.start_time).getTime())
              )
            ).toISOString(),
          }
        : null
    console.log(
      `[/api/healthkit/workouts] Processing ${validated.workouts.length} workouts for client ${validated.client_id}${
        dateRange ? ` (${dateRange.earliest} to ${dateRange.latest})` : ""
      }`
    )

    // Process each workout
    const results: {
      processed: number
      errors: { index: number; message: string }[]
    } = {
      processed: 0,
      errors: [],
    }

    for (let i = 0; i < validated.workouts.length; i++) {
      const workout = validated.workouts[i]

      try {
        // Check for duplicate (same user, type, and start time)
        const existing = await prisma.healthKitWorkout.findFirst({
          where: {
            userId: validated.client_id,
            workoutType: workout.workout_type,
            startTime: new Date(workout.start_time),
          },
        })

        const metadataValue = workout.metadata
          ? JSON.parse(JSON.stringify(workout.metadata))
          : undefined

        const heartRateValue =
          workout.avg_heart_rate || workout.max_heart_rate
            ? {
                avg: workout.avg_heart_rate ?? null,
                max: workout.max_heart_rate ?? null,
              }
            : undefined

        if (existing) {
          // Update existing workout
          await prisma.healthKitWorkout.update({
            where: { id: existing.id },
            data: {
              endTime: new Date(workout.end_time),
              duration: workout.duration_seconds,
              calories: workout.calories_active ?? null,
              distance: workout.distance_meters ?? null,
              ...(heartRateValue && { heartRate: heartRateValue }),
              ...(metadataValue && { metadata: metadataValue }),
            },
          })
        } else {
          // Create new workout
          await prisma.healthKitWorkout.create({
            data: {
              userId: validated.client_id,
              workoutType: workout.workout_type,
              startTime: new Date(workout.start_time),
              endTime: new Date(workout.end_time),
              duration: workout.duration_seconds,
              calories: workout.calories_active ?? null,
              distance: workout.distance_meters ?? null,
              ...(heartRateValue && { heartRate: heartRateValue }),
              ...(metadataValue && { metadata: metadataValue }),
            },
          })
        }

        results.processed++
      } catch (err: unknown) {
        results.errors.push({
          index: i,
          message:
            err instanceof Error ? err.message : "Failed to process workout",
        })
      }
    }

    // Return results
    const statusCode = results.errors.length > 0 ? 207 : 200 // 207 Multi-Status if partial success

    return addCorsHeaders(
      NextResponse.json(
        {
          success: results.processed > 0,
          processed: results.processed,
          total: validated.workouts.length,
          errors: results.errors.length > 0 ? results.errors : undefined,
        },
        { status: statusCode }
      )
    )
  } catch (error: unknown) {
    console.error("Error in /api/healthkit/workouts:", error)

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError"
    ) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error: "Validation error",
            details: "errors" in error ? error.errors : undefined,
          },
          { status: 400 }
        )
      )
    }

    return addCorsHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    )
  }
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}
