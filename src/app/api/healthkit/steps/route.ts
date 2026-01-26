/**
 * POST /api/healthkit/steps
 *
 * Endpoint for iOS app to send HealthKit step count data.
 * Updates the Entry model with step data from HealthKit.
 */

import { NextRequest, NextResponse } from "next/server"
import { ingestStepsSchema } from "@/lib/validations/healthkit"
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
    const validated = ingestStepsSchema.parse(body)

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
      `[/api/healthkit/steps] Processing ${validated.steps.length} step records for client ${validated.client_id}`
    )

    // Process each step record
    const results: {
      processed: number
      errors: { date: string; message: string }[]
    } = {
      processed: 0,
      errors: [],
    }

    for (const stepRecord of validated.steps) {
      try {
        const date = new Date(stepRecord.date)
        date.setHours(0, 0, 0, 0)

        // Check if entry exists for this date
        const existingEntry = await prisma.entry.findUnique({
          where: {
            userId_date: {
              userId: validated.client_id,
              date: date,
            },
          },
          select: { steps: true, dataSources: true },
        })

        let updateData: Record<string, unknown>

        if (existingEntry) {
          // Entry exists - check if it has manual data
          const dataSources = existingEntry.dataSources as Record<string, string> | null
          const hasManualSteps = dataSources?.steps === "manual"

          if (hasManualSteps) {
            // Manual data exists - preserve it, but mark that we have healthkit data too
            updateData = {
              dataSources: {
                ...(dataSources || {}),
                steps: "manual", // Keep manual designation
                healthkit_steps: "healthkit", // Track that we have healthkit data available
              },
            }
          } else {
            // No manual data - update with HealthKit value
            updateData = {
              steps: stepRecord.total_steps,
              dataSources: {
                ...(dataSources || {}),
                steps: "healthkit",
              },
            }
          }
        } else {
          // No existing entry - create new one with HealthKit data
          updateData = {
            steps: stepRecord.total_steps,
            dataSources: {
              steps: "healthkit",
            },
          }
        }

        // Upsert entry for this date
        await prisma.entry.upsert({
          where: {
            userId_date: {
              userId: validated.client_id,
              date: date,
            },
          },
          update: updateData,
          create: {
            userId: validated.client_id,
            date: date,
            steps: stepRecord.total_steps,
            dataSources: {
              steps: "healthkit",
            },
          },
        })

        results.processed++
      } catch (err: unknown) {
        results.errors.push({
          date: stepRecord.date,
          message:
            err instanceof Error ? err.message : "Failed to process step record",
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
          total: validated.steps.length,
          errors: results.errors.length > 0 ? results.errors : undefined,
        },
        { status: statusCode }
      )
    )
  } catch (error: unknown) {
    console.error("Error in /api/healthkit/steps:", error)

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
