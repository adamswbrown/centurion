"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Video, Calendar, Trash2 } from "lucide-react"

interface WorkoutCardProps {
  workout: {
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
  showUser?: boolean
  onStatusChange?: (id: number, status: string) => void
  onDelete?: (id: number) => void
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
}

const statusLabel: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
}

export function WorkoutCard({
  workout,
  showUser = false,
  onStatusChange,
  onDelete,
}: WorkoutCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{workout.title}</CardTitle>
            {showUser && workout.user && (
              <p className="text-sm text-muted-foreground">
                {workout.user.name || workout.user.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[workout.status] || "secondary"}>
              {statusLabel[workout.status] || workout.status}
            </Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(workout.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {workout.description && (
          <p className="text-sm text-muted-foreground">{workout.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {workout.scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(workout.scheduledAt), "MMM d, yyyy")}
            </span>
          )}
          {workout.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {workout.duration} min
            </span>
          )}
          {workout.videoUrl && (
            <a
              href={workout.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Video className="h-3.5 w-3.5" />
              Video
            </a>
          )}
        </div>

        {onStatusChange && workout.status !== "COMPLETED" && (
          <div className="flex gap-2 pt-2">
            {workout.status === "NOT_STARTED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(workout.id, "IN_PROGRESS")}
              >
                Start Workout
              </Button>
            )}
            {workout.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(workout.id, "COMPLETED")}
              >
                Mark Complete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
