/**
 * POST /api/healthkit/pair
 *
 * Endpoint for iOS app to pair with a coach using a pairing code.
 * This establishes the client relationship for HealthKit data ingestion.
 */

import { NextRequest, NextResponse } from "next/server"
import { pairingCodeSchema } from "@/lib/validations/healthkit"
import { validateAndUsePairingCode } from "@/lib/healthkit/pairing"

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
    const validated = pairingCodeSchema.parse(body)

    // Validate and use the pairing code
    const result = await validateAndUsePairingCode(validated.code)

    if (!result.success) {
      return addCorsHeaders(
        NextResponse.json({ error: result.error }, { status: 400 })
      )
    }

    return addCorsHeaders(
      NextResponse.json(
        {
          success: true,
          message: "Successfully paired",
          client_id: result.userId,
          client: (result.pairingCode as { user: unknown }).user,
          paired_at: new Date().toISOString(),
        },
        { status: 200 }
      )
    )
  } catch (error: unknown) {
    console.error("Error in /api/healthkit/pair:", error)

    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
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
