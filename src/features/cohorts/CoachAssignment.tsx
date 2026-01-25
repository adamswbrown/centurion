"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useAddCoachToCohort,
  useRemoveCoachFromCohort,
  useAllCoaches,
} from "@/hooks/useCohorts"
import { X } from "lucide-react"

interface CoachAssignmentProps {
  cohortId: number
  currentCoaches: Array<{
    coach: {
      id: number
      name: string | null
      email: string | null
    }
  }>
}

export function CoachAssignment({
  cohortId,
  currentCoaches,
}: CoachAssignmentProps) {
  const [selectedCoachId, setSelectedCoachId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: allCoaches } = useAllCoaches()
  const addCoach = useAddCoachToCohort()
  const removeCoach = useRemoveCoachFromCohort()

  const currentCoachIds = new Set(currentCoaches.map((c) => c.coach.id))
  const availableCoaches =
    allCoaches?.filter((coach) => !currentCoachIds.has(coach.id)) || []

  const handleAddCoach = () => {
    if (!selectedCoachId) return

    setError(null)
    setMessage(null)

    addCoach.mutate(
      { cohortId, coachId: Number(selectedCoachId) },
      {
        onSuccess: () => {
          setMessage("Coach added successfully")
          setSelectedCoachId("")
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to add coach")
        },
      },
    )
  }

  const handleRemoveCoach = (coachId: number) => {
    setError(null)
    setMessage(null)

    removeCoach.mutate(
      { cohortId, coachId },
      {
        onSuccess: () => {
          setMessage("Coach removed successfully")
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to remove coach")
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Coaches</CardTitle>
          <Badge variant="secondary">{currentCoaches.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {currentCoaches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coaches assigned</p>
        ) : (
          <div className="space-y-2">
            {currentCoaches.map(({ coach }) => (
              <div
                key={coach.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{coach.name}</p>
                  <p className="text-sm text-muted-foreground">{coach.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCoach(coach.id)}
                  disabled={removeCoach.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableCoaches.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Add Coach</p>
            <div className="flex gap-2">
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {availableCoaches.map((coach) => (
                    <SelectItem key={coach.id} value={String(coach.id)}>
                      {coach.name} ({coach.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddCoach}
                disabled={!selectedCoachId || addCoach.isPending}
              >
                {addCoach.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
