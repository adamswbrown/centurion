import { NextResponse } from "next/server"
import { getVapidPublicKey, isPushConfigured } from "@/lib/push-notifications"

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications not configured", publicKey: null },
      { status: 503 }
    )
  }

  const publicKey = getVapidPublicKey()

  return NextResponse.json({ publicKey })
}
