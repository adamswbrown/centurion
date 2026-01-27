"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, differenceInHours } from "date-fns"
import { AttendanceStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCancelMyAppointment } from "@/hooks/useClientAppointments"
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

interface ClientAppointmentDetailProps {
  appointment: {
    id: number
    startTime: Date
    endTime: Date
    fee: any
    status: AttendanceStatus
    notes: string | null
    videoUrl: string | null
    googleEventId: string | null
  }
}

export function ClientAppointmentDetail({
  appointment,
}: ClientAppointmentDetailProps) {
  const router = useRouter()
  const cancelAppointment = useCancelMyAppointment()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const startTime = new Date(appointment.startTime)
  const endTime = new Date(appointment.endTime)
  const hoursUntilAppointment = differenceInHours(startTime, new Date())
  const canCancel = hoursUntilAppointment >= 24
  const isPast = startTime < new Date()

  const statusLabel = {
    [AttendanceStatus.NOT_ATTENDED]: isPast ? "Missed" : "Scheduled",
    [AttendanceStatus.ATTENDED]: "Attended",
  }

  const statusColor = {
    [AttendanceStatus.NOT_ATTENDED]: isPast
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700",
    [AttendanceStatus.ATTENDED]: "bg-green-100 text-green-700",
  }

  function handleCancel() {
    setError(null)
    setSuccess(null)
    cancelAppointment.mutate(appointment.id, {
      onSuccess: () => {
        setSuccess("Appointment cancelled successfully")
        setTimeout(() => {
          router.push("/appointments/me")
        }, 1500)
      },
      onError: (err) => {
        setError(
          err instanceof Error ? err.message : "Failed to cancel appointment"
        )
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointment Details</h1>
          <p className="text-muted-foreground">
            {format(startTime, "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/appointments/me")}>
          Back to Calendar
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Session Information</span>
              <Badge className={statusColor[appointment.status]}>
                {statusLabel[appointment.status]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(startTime, "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Day</p>
                <p className="font-medium">{format(startTime, "EEEE")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="font-medium">{format(startTime, "h:mm a")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">{format(endTime, "h:mm a")}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">
                {Math.round(
                  (endTime.getTime() - startTime.getTime()) / (1000 * 60)
                )}{" "}
                minutes
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">Training Facility</p>
            </div>

            {appointment.videoUrl && (
              <div>
                <p className="text-sm text-muted-foreground">Video Call</p>
                <a
                  href={appointment.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                >
                  Join Video Call
                </a>
              </div>
            )}

            {appointment.googleEventId && (
              <div>
                <p className="text-sm text-muted-foreground">Calendar</p>
                <p className="text-sm text-emerald-600">
                  Synced to Google Calendar
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coach Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {appointment.notes ? (
              <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No notes have been added for this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isPast && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canCancel ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={cancelAppointment.isPending}
                  >
                    {cancelAppointment.isPending
                      ? "Cancelling..."
                      : "Cancel Appointment"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this appointment scheduled
                      for {format(startTime, "MMMM d, yyyy")} at{" "}
                      {format(startTime, "h:mm a")}? This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This appointment is less than 24 hours away and cannot be
                  cancelled online.
                </p>
                <p className="text-sm">
                  Please contact your coach directly if you need to reschedule.
                </p>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground">
                Time until appointment:{" "}
                {hoursUntilAppointment > 0
                  ? `${hoursUntilAppointment} hours`
                  : "Starting soon"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
