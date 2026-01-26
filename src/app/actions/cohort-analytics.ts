import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfDay } from "date-fns"

export const getCohortCheckInAnalyticsSchema = z.object({
  cohortId: z.number(),
  from: z.date().optional(),
  to: z.date().optional(),
})

export type CohortCheckInAnalytics = {
  memberId: number
  name: string | null
  email: string | null
  status: string
  totalCheckIns: number
  currentStreak: number
  lastCheckIn: Date | null
}

export async function getCohortCheckInAnalytics({ cohortId, from, to }: z.infer<typeof getCohortCheckInAnalyticsSchema>) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "COACH")) {
    throw new Error("Forbidden")
  }

  // Get all active members in the cohort
  const memberships = await prisma.cohortMembership.findMany({
    where: { cohortId, status: "ACTIVE" },
    include: { user: true },
  })

  const analytics: CohortCheckInAnalytics[] = []

  for (const m of memberships) {
    const entries = await prisma.entry.findMany({
      where: {
        userId: m.userId,
        ...(from || to ? { date: { ...(from ? { gte: startOfDay(from) } : {}), ...(to ? { lte: startOfDay(to) } : {}) } } : {}),
      },
      orderBy: { date: "desc" },
      select: { date: true },
    })

    // Calculate streak
    let currentStreak = 0
    let lastDate: Date | null = null
    for (const entry of entries) {
      const entryDate = startOfDay(entry.date)
      if (!lastDate) {
        const daysDiff = Math.floor((startOfDay(new Date()).getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff === 0) {
          currentStreak = 1
          lastDate = entryDate
        } else {
          break
        }
      } else {
        const daysDiff = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff === 1) {
          currentStreak++
          lastDate = entryDate
        } else {
          break
        }
      }
    }

    analytics.push({
      memberId: m.userId,
      name: m.user.name,
      email: m.user.email,
      status: m.status,
      totalCheckIns: entries.length,
      currentStreak,
      lastCheckIn: entries[0]?.date || null,
    })
  }

  return analytics
}
