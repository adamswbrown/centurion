/**
 * POST /api/admin/healthkit/generate-code
 *
 * Admin endpoint to generate a pairing code for a client.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createPairingCode, regeneratePairingCode } from "@/lib/healthkit/pairing"
import { z } from "zod"

const schema = z.object({
  clientId: z.number().int().positive(),
  regenerate: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "COACH") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const validated = schema.parse(body)

    const result = validated.regenerate
      ? await regeneratePairingCode(Number(session.user.id), validated.clientId)
      : await createPairingCode(Number(session.user.id), validated.clientId)

    return NextResponse.json({
      code: result.code,
      expiresAt: result.expiresAt,
      client: result.user,
    })
  } catch (error: unknown) {
    console.error("Error generating pairing code:", error)

    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: "errors" in error ? error.errors : undefined },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
