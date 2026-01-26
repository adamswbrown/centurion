import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { prisma } from "@/lib/prisma"
import { HealthKitAdminDashboard } from "@/features/healthkit/HealthKitAdminDashboard"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function AdminHealthKitPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) {
    return null
  }

  // Get all clients with their HealthKit data summary
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          healthKitWorkouts: true,
          sleepRecords: true,
          entries: true,
        },
      },
      pairingCodesAsUser: {
        where: {
          usedAt: { not: null },
        },
        orderBy: { usedAt: "desc" },
        take: 1,
        select: {
          usedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // Get active pairing codes
  const activePairingCodes = await prisma.pairingCode.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get recent HealthKit syncs (last 10 workouts and sleep records)
  const recentWorkouts = await prisma.healthKitWorkout.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  })

  const recentSleepRecords = await prisma.sleepRecord.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  })

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">HealthKit Data Management</h1>
        </div>

        <HealthKitAdminDashboard
          clients={clients}
          activePairingCodes={activePairingCodes}
          recentWorkouts={recentWorkouts}
          recentSleepRecords={recentSleepRecords}
        />
      </div>
    </AppLayout>
  )
}
