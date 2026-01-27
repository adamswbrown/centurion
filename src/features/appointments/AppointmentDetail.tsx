"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { AttendanceStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useDeleteAppointment,
  useSyncAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointments"
import { extractTimeString } from "@/lib/calendar"

interface AppointmentDetailProps {
  appointment: {
    id: number
    title: string | null
    startTime: Date
    endTime: Date
    fee: any
    status: AttendanceStatus
    notes: string | null
    videoUrl: string | null
    user: {
      id: number
      name: string | null
      email: string
    }
    googleEventId: string | null
  }
}

export function AppointmentDetail({ appointment }: AppointmentDetailProps) {
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const syncAppointment = useSyncAppointment()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const defaultFee = useMemo(() => Number(appointment.fee), [appointment.fee])

  function handleUpdate(payload: {
    id: number
    title?: string
    startTime: string
    endTime: string
    fee: number
    notes: string
    videoUrl?: string
    status?: AttendanceStatus
  }) {
    setError(null)
    setMessage(null)
    updateAppointment.mutate({ ...payload, title: payload.title ?? appointment.title ?? "" }, {
      onSuccess: () => setMessage("Appointment updated"),
      onError: (err) =>
        setError(err instanceof Error ? err.message : "Failed to update appointment"),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            defaultValue={appointment.title ?? ""}
            onBlur={(event) =>
              handleUpdate({
                id: appointment.id,
                title: event.target.value,
                startTime: extractTimeString(new Date(appointment.startTime)),
                endTime: extractTimeString(new Date(appointment.endTime)),
                fee: defaultFee,
                notes: appointment.notes ?? "",
              })
            }
          />
        </div>
        <p className="text-muted-foreground">
          {appointment.user.name || appointment.user.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <div className="rounded-md border px-3 py-2 text-sm">
            {format(new Date(appointment.startTime), "MMM dd, yyyy")}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={appointment.status}
            onChange={(event) =>
              handleUpdate({
                id: appointment.id,
                startTime: extractTimeString(new Date(appointment.startTime)),
                endTime: extractTimeString(new Date(appointment.endTime)),
                fee: defaultFee,
                notes: appointment.notes ?? "",
                status: event.target.value as AttendanceStatus,
              })
            }
          >
            <option value={AttendanceStatus.NOT_ATTENDED}>Scheduled</option>
            <option value={AttendanceStatus.ATTENDED}>Attended</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            defaultValue={extractTimeString(new Date(appointment.startTime))}
            onBlur={(event) =>
              handleUpdate({
                id: appointment.id,
                startTime: event.target.value,
                endTime: extractTimeString(new Date(appointment.endTime)),
                fee: defaultFee,
                notes: appointment.notes ?? "",
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            defaultValue={extractTimeString(new Date(appointment.endTime))}
            onBlur={(event) =>
              handleUpdate({
                id: appointment.id,
                startTime: extractTimeString(new Date(appointment.startTime)),
                endTime: event.target.value,
                fee: defaultFee,
                notes: appointment.notes ?? "",
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">Fee</Label>
          <Input
            id="fee"
            type="number"
            step="0.01"
            defaultValue={defaultFee}
            onBlur={(event) =>
              handleUpdate({
                id: appointment.id,
                startTime: extractTimeString(new Date(appointment.startTime)),
                endTime: extractTimeString(new Date(appointment.endTime)),
                fee: Number(event.target.value),
                notes: appointment.notes ?? "",
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={4}
          defaultValue={appointment.notes ?? ""}
          onBlur={(event) =>
            handleUpdate({
              id: appointment.id,
              startTime: extractTimeString(new Date(appointment.startTime)),
              endTime: extractTimeString(new Date(appointment.endTime)),
              fee: defaultFee,
              notes: event.target.value,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl">Video URL</Label>
        <Input
          id="videoUrl"
          type="url"
          placeholder="https://zoom.us/j/... or https://meet.google.com/..."
          defaultValue={appointment.videoUrl ?? ""}
          onBlur={(event) =>
            handleUpdate({
              id: appointment.id,
              startTime: extractTimeString(new Date(appointment.startTime)),
              endTime: extractTimeString(new Date(appointment.endTime)),
              fee: defaultFee,
              notes: appointment.notes ?? "",
              videoUrl: event.target.value,
            })
          }
        />
        {appointment.videoUrl && (
          <a
            href={appointment.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Open video link
          </a>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setMessage(null)
            syncAppointment.mutate(appointment.id, {
              onSuccess: (result) =>
                setMessage(result.message ?? "Calendar sync complete"),
              onError: (err) =>
                setError(
                  err instanceof Error ? err.message : "Calendar sync failed",
                ),
            })
          }}
          disabled={syncAppointment.isPending}
        >
          {appointment.googleEventId ? "Resync Calendar" : "Sync to Calendar"}
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            deleteAppointment.mutate(appointment.id, {
              onSuccess: () => router.push("/appointments"),
              onError: (err) =>
                setError(
                  err instanceof Error ? err.message : "Failed to delete appointment",
                ),
            })
          }
          disabled={deleteAppointment.isPending}
        >
          Delete Appointment
        </Button>
      </div>
    </div>
  )
}
