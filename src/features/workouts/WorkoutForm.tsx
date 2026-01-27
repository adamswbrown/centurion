"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CreateWorkoutInput } from "@/app/actions/workouts"

interface WorkoutFormProps {
  userId: number
  onSubmit: (data: CreateWorkoutInput) => void
  isPending?: boolean
  onCancel?: () => void
}

export function WorkoutForm({ userId, onSubmit, isPending, onCancel }: WorkoutFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [duration, setDuration] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      userId,
      title,
      description: description || null,
      videoUrl: videoUrl || null,
      scheduledAt: scheduledAt || null,
      duration: duration ? parseInt(duration) : null,
    })

    // Reset form
    setTitle("")
    setDescription("")
    setVideoUrl("")
    setScheduledAt("")
    setDuration("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workout-title">Title</Label>
        <Input
          id="workout-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Upper Body Strength"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workout-description">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="workout-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Workout instructions..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workout-scheduled">
            Scheduled Date <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="workout-scheduled"
            type="date"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workout-duration">
            Duration (min) <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="workout-duration"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 45"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workout-video">
          Video URL <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="workout-video"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/..."
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Workout"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
