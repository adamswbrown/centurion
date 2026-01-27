"use client"

import { WorkoutCard } from "./WorkoutCard"

interface Workout {
  id: number
  title: string
  description?: string | null
  videoUrl?: string | null
  status: string
  scheduledAt?: Date | string | null
  completedAt?: Date | string | null
  duration?: number | null
  user?: { id: number; name: string | null; email: string } | null
}

interface WorkoutListProps {
  workouts: Workout[]
  showUser?: boolean
  onStatusChange?: (id: number, status: string) => void
  onDelete?: (id: number) => void
  emptyMessage?: string
}

export function WorkoutList({
  workouts,
  showUser = false,
  onStatusChange,
  onDelete,
  emptyMessage = "No workouts found.",
}: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          showUser={showUser}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
