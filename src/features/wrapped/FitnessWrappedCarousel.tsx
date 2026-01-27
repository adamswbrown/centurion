"use client"

import {
  ClipboardCheck,
  Dumbbell,
  Footprints,
  Moon,
  Scale,
  Flame,
  Trophy,
  Calendar,
  Timer,
} from "lucide-react"
import { WrappedStatCard } from "./WrappedStatCard"
import type { WrappedStats } from "@/app/actions/fitness-wrapped"

interface FitnessWrappedCarouselProps {
  stats: WrappedStats
}

export function FitnessWrappedCarousel({ stats }: FitnessWrappedCarouselProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Your {stats.year} Fitness Wrapped</h2>
        <p className="text-muted-foreground">Here is your year in review</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <WrappedStatCard
          icon={ClipboardCheck}
          label="Check-Ins"
          value={stats.totalCheckIns}
          subtext="Total daily check-ins logged"
          color="text-green-600"
        />

        <WrappedStatCard
          icon={Dumbbell}
          label="Workouts Completed"
          value={`${stats.workoutsCompleted} / ${stats.totalWorkouts}`}
          subtext="Assigned workouts completed"
          color="text-blue-600"
        />

        <WrappedStatCard
          icon={Footprints}
          label="Total Steps"
          value={stats.totalSteps.toLocaleString()}
          subtext={`~${Math.round(stats.totalSteps * 0.0005)} miles`}
          color="text-orange-600"
        />

        {stats.averageSleepQuality !== null && (
          <WrappedStatCard
            icon={Moon}
            label="Avg Sleep Quality"
            value={`${stats.averageSleepQuality}/10`}
            subtext="Average across all check-ins"
            color="text-purple-600"
          />
        )}

        {stats.weightChange !== null && (
          <WrappedStatCard
            icon={Scale}
            label="Weight Change"
            value={`${stats.weightChange > 0 ? "+" : ""}${stats.weightChange} lbs`}
            subtext={stats.averageWeight ? `Average: ${stats.averageWeight} lbs` : undefined}
            color="text-teal-600"
          />
        )}

        <WrappedStatCard
          icon={Flame}
          label="Calories Burned"
          value={stats.totalCaloriesBurned.toLocaleString()}
          subtext="Total tracked calories"
          color="text-red-600"
        />

        <WrappedStatCard
          icon={Trophy}
          label="Longest Streak"
          value={`${stats.longestStreak} days`}
          subtext="Consecutive daily check-ins"
          color="text-yellow-600"
        />

        {stats.mostActiveMonth && (
          <WrappedStatCard
            icon={Calendar}
            label="Most Active Month"
            value={stats.mostActiveMonth}
            subtext="Based on check-in frequency"
            color="text-indigo-600"
          />
        )}

        {stats.healthKitWorkoutMinutes > 0 && (
          <WrappedStatCard
            icon={Timer}
            label="HealthKit Minutes"
            value={stats.healthKitWorkoutMinutes.toLocaleString()}
            subtext={`~${Math.round(stats.healthKitWorkoutMinutes / 60)} hours of activity`}
            color="text-pink-600"
          />
        )}
      </div>
    </div>
  )
}
