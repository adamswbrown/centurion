"use client"

import { useMemo } from "react"
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
    startTime: Date
    endTime: Date
    fee: any
    status: AttendanceStatus
    notes: string | null
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

  const defaultFee = useMemo(() => Number(appointment.fee), [appointment.fee])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Appointment</h1>
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
              updateAppointment.mutate({
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
              updateAppointment.mutate({
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
              updateAppointment.mutate({
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
              updateAppointment.mutate({
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
            updateAppointment.mutate({
              id: appointment.id,
              startTime: extractTimeString(new Date(appointment.startTime)),
              endTime: extractTimeString(new Date(appointment.endTime)),
              fee: defaultFee,
              notes: event.target.value,
            })
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => syncAppointment.mutate(appointment.id)}
          disabled={syncAppointment.isPending}
        >
          {appointment.googleEventId ? "Resync Calendar" : "Sync to Calendar"}
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            deleteAppointment.mutate(appointment.id, {
              onSuccess: () => router.push("/appointments"),
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
