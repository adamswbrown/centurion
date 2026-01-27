"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfYear, endOfYear } from "date-fns"

export interface WrappedStats {
  year: number
  totalCheckIns: number
  totalWorkouts: number
  workoutsCompleted: number
  totalSteps: number
  averageSleepQuality: number | null
  averageWeight: number | null
  weightChange: number | null
  totalCaloriesBurned: number
  longestStreak: number
  mostActiveMonth: string | null
  healthKitWorkoutMinutes: number
}

/**
 * Get year-in-review fitness stats for the current user
 */
export async function getFitnessWrapped(year?: number): Promise<WrappedStats> {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const userId = Number(session.user.id)
  const targetYear = year || new Date().getFullYear()
  const yearStart = startOfYear(new Date(targetYear, 0, 1))
  const yearEnd = endOfYear(new Date(targetYear, 0, 1))

  // Get entries for the year
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      date: { gte: yearStart, lte: yearEnd },
    },
    orderBy: { date: "asc" },
  })

  // Get workouts for the year
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      createdAt: { gte: yearStart, lte: yearEnd },
    },
  })

  // Get HealthKit workouts for the year
  const hkWorkouts = await prisma.healthKitWorkout.findMany({
    where: {
      userId,
      startTime: { gte: yearStart, lte: yearEnd },
    },
  })

  // Calculate stats
  const totalCheckIns = entries.length
  const totalWorkouts = workouts.length
  const workoutsCompleted = workouts.filter((w) => w.status === "COMPLETED").length

  const totalSteps = entries.reduce((sum, e) => sum + (e.steps || 0), 0)
  const totalCaloriesBurned = entries.reduce((sum, e) => sum + (e.calories || 0), 0)

  // Average sleep quality
  const sleepEntries = entries.filter((e) => e.sleepQuality !== null)
  const averageSleepQuality =
    sleepEntries.length > 0
      ? sleepEntries.reduce((sum, e) => sum + (e.sleepQuality || 0), 0) / sleepEntries.length
      : null

  // Weight change (first vs last recorded weight)
  const weightEntries = entries.filter((e) => e.weight !== null)
  let averageWeight: number | null = null
  let weightChange: number | null = null

  if (weightEntries.length > 0) {
    averageWeight =
      weightEntries.reduce((sum, e) => sum + (e.weight || 0), 0) / weightEntries.length
    if (weightEntries.length >= 2) {
      const firstWeight = weightEntries[0].weight!
      const lastWeight = weightEntries[weightEntries.length - 1].weight!
      weightChange = lastWeight - firstWeight
    }
  }

  // Longest check-in streak
  let longestStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null

  for (const entry of entries) {
    const entryDate = new Date(entry.date)
    if (lastDate) {
      const daysDiff = Math.round(
        (entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff === 1) {
        currentStreak++
      } else {
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    longestStreak = Math.max(longestStreak, currentStreak)
    lastDate = entryDate
  }

  // Most active month (by check-in count)
  const monthCounts: Record<number, number> = {}
  for (const entry of entries) {
    const month = new Date(entry.date).getMonth()
    monthCounts[month] = (monthCounts[month] || 0) + 1
  }

  let mostActiveMonth: string | null = null
  let maxCount = 0
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  for (const [month, count] of Object.entries(monthCounts)) {
    if (count > maxCount) {
      maxCount = count
      mostActiveMonth = monthNames[Number(month)]
    }
  }

  // HealthKit workout minutes
  const healthKitWorkoutMinutes = hkWorkouts.reduce(
    (sum, w) => sum + Math.round(w.duration / 60),
    0
  )

  return {
    year: targetYear,
    totalCheckIns,
    totalWorkouts,
    workoutsCompleted,
    totalSteps,
    averageSleepQuality: averageSleepQuality ? Math.round(averageSleepQuality * 10) / 10 : null,
    averageWeight: averageWeight ? Math.round(averageWeight * 10) / 10 : null,
    weightChange: weightChange ? Math.round(weightChange * 10) / 10 : null,
    totalCaloriesBurned,
    longestStreak,
    mostActiveMonth,
    healthKitWorkoutMinutes,
  }
}
