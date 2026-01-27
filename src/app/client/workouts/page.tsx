"use client"

import { useState, useEffect, useCallback } from "react"
import { WorkoutList } from "@/features/workouts/WorkoutList"
import { getWorkouts, updateWorkout } from "@/app/actions/workouts"

export default function ClientWorkoutsPage() {
  const [workouts, setWorkouts] = useState<Awaited<ReturnType<typeof getWorkouts>>>([])
  const [loading, setLoading] = useState(true)

  const loadWorkouts = useCallback(async () => {
    try {
      const data = await getWorkouts()
      setWorkouts(data)
    } catch (error) {
      console.error("Failed to load workouts:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkouts()
  }, [loadWorkouts])

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateWorkout({ id, status: status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" })
      await loadWorkouts()
    } catch (error) {
      console.error("Failed to update workout:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <p className="text-muted-foreground">Your assigned workouts from your coach</p>
      </div>

      <WorkoutList
        workouts={workouts}
        onStatusChange={handleStatusChange}
        emptyMessage="No workouts assigned to you yet."
      />
    </div>
  )
}
