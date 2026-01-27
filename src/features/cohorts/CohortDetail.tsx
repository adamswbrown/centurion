"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  useUpdateCohort,
  useUpdateCohortStatus,
  useDeleteCohort,
} from "@/hooks/useCohorts"
import { CoachAssignment } from "./CoachAssignment"
import { MemberManagement } from "./MemberManagement"
import { CohortAnalytics } from "./CohortAnalytics"
import { CheckInConfigEditor } from "./CheckInConfigEditor"
import { CohortCheckInFrequency } from "./CohortCheckInFrequency"
import { CohortStatus } from "@prisma/client"

interface CohortDetailProps {
  cohort: {
    id: number
    name: string
    description: string | null
    startDate: Date
    endDate: Date | null
    status: CohortStatus
    checkInFrequencyDays: number | null
    members: Array<{
      status: "ACTIVE" | "PAUSED" | "INACTIVE"
      joinedAt: Date
      leftAt: Date | null
      user: {
        id: number
        name: string | null
        email: string | null
        image: string | null
      }
    }>
    coaches: Array<{
      coach: {
        id: number
        name: string | null
        email: string | null
      }
    }>
  }
}

const statusColors = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
}

export function CohortDetail({ cohort }: CohortDetailProps) {
  const [name, setName] = useState(cohort.name)
  const [description, setDescription] = useState(cohort.description || "")
  const [startDate, setStartDate] = useState(
    format(new Date(cohort.startDate), "yyyy-MM-dd"),
  )
  const [endDate, setEndDate] = useState(
    cohort.endDate ? format(new Date(cohort.endDate), "yyyy-MM-dd") : "",
  )
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const updateCohort = useUpdateCohort()
  const updateStatus = useUpdateCohortStatus()
  const deleteCohort = useDeleteCohort()
  const router = useRouter()

  const handleUpdate = (field: "name" | "description" | "startDate" | "endDate") => {
    setError(null)
    setMessage(null)

    const data: Record<string, unknown> = { id: cohort.id }

    if (field === "name" && name !== cohort.name) {
      data.name = name
    } else if (field === "description" && description !== (cohort.description || "")) {
      data.description = description
    } else if (field === "startDate" && startDate !== format(new Date(cohort.startDate), "yyyy-MM-dd")) {
      data.startDate = startDate
    } else if (field === "endDate" && endDate !== (cohort.endDate ? format(new Date(cohort.endDate), "yyyy-MM-dd") : "")) {
      data.endDate = endDate
    } else {
      return
    }

    updateCohort.mutate(data as { id: number; name?: string; description?: string; startDate?: string; endDate?: string }, {
      onSuccess: () => {
        setMessage("Updated successfully")
        setTimeout(() => setMessage(null), 3000)
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to update")
      },
    })
  }

  const handleStatusChange = (newStatus: CohortStatus) => {
    setError(null)
    setMessage(null)

    updateStatus.mutate(
      { id: cohort.id, status: newStatus },
      {
        onSuccess: () => {
          setMessage(`Cohort marked as ${newStatus.toLowerCase()}`)
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update status")
        },
      },
    )
  }

  const handleDelete = () => {
    deleteCohort.mutate(cohort.id, {
      onSuccess: () => {
        router.push("/cohorts")
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to delete cohort")
      },
    })
  }

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cohort Details</CardTitle>
            <Badge className={statusColors[cohort.status]} variant="secondary">
              {cohort.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleUpdate("name")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleUpdate("description")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={() => handleUpdate("startDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={() => handleUpdate("endDate")}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            {cohort.status === "ACTIVE" && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("COMPLETED")}
              >
                Mark as Completed
              </Button>
            )}
            {cohort.status === "COMPLETED" && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("ARCHIVED")}
              >
                Archive
              </Button>
            )}
            {cohort.status === "ARCHIVED" && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("ACTIVE")}
              >
                Reactivate
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="ml-auto">
                  Delete Cohort
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the cohort and remove all member
                    and coach assignments. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <CohortAnalytics cohortId={cohort.id} />

      <CohortCheckInFrequency
        cohortId={cohort.id}
        currentFrequency={cohort.checkInFrequencyDays}
      />

      <CheckInConfigEditor cohortId={cohort.id} />

      <div className="grid gap-6 md:grid-cols-2">
        <CoachAssignment cohortId={cohort.id} currentCoaches={cohort.coaches} />
        <MemberManagement cohortId={cohort.id} memberships={cohort.members} />
      </div>
    </div>
  )
}
