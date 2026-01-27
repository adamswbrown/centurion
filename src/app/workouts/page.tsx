"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { WorkoutList } from "@/features/workouts/WorkoutList"
import { WorkoutForm } from "@/features/workouts/WorkoutForm"
import {
  getWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  type CreateWorkoutInput,
} from "@/app/actions/workouts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Awaited<ReturnType<typeof getWorkouts>>>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

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

  const handleCreate = async (input: CreateWorkoutInput) => {
    setCreating(true)
    try {
      await createWorkout(input)
      setDialogOpen(false)
      await loadWorkouts()
    } catch (error) {
      console.error("Failed to create workout:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateWorkout({ id, status: status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" })
      await loadWorkouts()
    } catch (error) {
      console.error("Failed to update workout:", error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this workout?")) return
    try {
      await deleteWorkout(id)
      await loadWorkouts()
    } catch (error) {
      console.error("Failed to delete workout:", error)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">Manage client workout assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Workout</DialogTitle>
            </DialogHeader>
            <WorkoutForm
              userId={0}
              onSubmit={handleCreate}
              isPending={creating}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <WorkoutList
        workouts={workouts}
        showUser
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        emptyMessage="No workouts assigned yet. Create one to get started."
      />
    </div>
  )
}
