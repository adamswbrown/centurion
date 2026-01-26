/**
 * POST /api/healthkit/sleep
 *
 * Endpoint for iOS app to send HealthKit sleep data.
 * Stores detailed sleep records.
 */

import { NextRequest, NextResponse } from "next/server"
import { ingestSleepSchema } from "@/lib/validations/healthkit"
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
    const validated = ingestSleepSchema.parse(body)

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

    console.log(
      `[/api/healthkit/sleep] Processing ${validated.sleep_records.length} sleep records for client ${validated.client_id}`
    )

    // Process each sleep record
    const results: {
      processed: number
      errors: { date: string; message: string }[]
    } = {
      processed: 0,
      errors: [],
    }

    for (const sleepRecord of validated.sleep_records) {
      try {
        // Parse start and end times
        const startTime = sleepRecord.sleep_start
          ? new Date(sleepRecord.sleep_start)
          : new Date(`${sleepRecord.date}T00:00:00Z`)
        const endTime = sleepRecord.sleep_end
          ? new Date(sleepRecord.sleep_end)
          : new Date(startTime.getTime() + sleepRecord.total_sleep_minutes * 60000)

        // Check for existing record for this date
        const existing = await prisma.sleepRecord.findFirst({
          where: {
            userId: validated.client_id,
            startTime: {
              gte: new Date(`${sleepRecord.date}T00:00:00Z`),
              lt: new Date(`${sleepRecord.date}T23:59:59Z`),
            },
          },
        })

        if (existing) {
          // Update existing record
          await prisma.sleepRecord.update({
            where: { id: existing.id },
            data: {
              startTime,
              endTime,
              totalSleep: sleepRecord.total_sleep_minutes,
              inBedTime: sleepRecord.in_bed_minutes ?? sleepRecord.total_sleep_minutes,
              deepSleep: sleepRecord.deep_sleep_minutes ?? null,
              remSleep: sleepRecord.rem_sleep_minutes ?? null,
              coreSleep: sleepRecord.core_sleep_minutes ?? null,
              sourceDevice: sleepRecord.source_device ?? null,
            },
          })
        } else {
          // Create new record
          await prisma.sleepRecord.create({
            data: {
              userId: validated.client_id,
              startTime,
              endTime,
              totalSleep: sleepRecord.total_sleep_minutes,
              inBedTime: sleepRecord.in_bed_minutes ?? sleepRecord.total_sleep_minutes,
              deepSleep: sleepRecord.deep_sleep_minutes ?? null,
              remSleep: sleepRecord.rem_sleep_minutes ?? null,
              coreSleep: sleepRecord.core_sleep_minutes ?? null,
              sourceDevice: sleepRecord.source_device ?? null,
            },
          })
        }

        results.processed++
      } catch (err: unknown) {
        results.errors.push({
          date: sleepRecord.date,
          message:
            err instanceof Error ? err.message : "Failed to process sleep record",
        })
      }
    }

    // Return results
    const statusCode = results.errors.length > 0 ? 207 : 200

    return addCorsHeaders(
      NextResponse.json(
        {
          success: results.processed > 0,
          processed: results.processed,
          total: validated.sleep_records.length,
          errors: results.errors.length > 0 ? results.errors : undefined,
        },
        { status: statusCode }
      )
    )
  } catch (error: unknown) {
    console.error("Error in /api/healthkit/sleep:", error)

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
