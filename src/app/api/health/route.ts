import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const startTime = Date.now()

export async function GET() {
  let dbStatus: "connected" | "disconnected" = "disconnected"

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = "connected"
  } catch {
    // dbStatus remains "disconnected"
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    database: dbStatus,
    version: process.env.npm_package_version ?? "0.1.0",
  })
}
