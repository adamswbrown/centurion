"use client"

import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface AppointmentCardProps {
  appointment: {
    id: number
    startTime: Date | string
    endTime: Date | string
    status: string
    user: {
      name: string | null
      email: string
    }
  }
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const start = new Date(appointment.startTime)
  const end = new Date(appointment.endTime)

  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="flex items-center justify-between rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
    >
      <div className="flex flex-col">
        <span className="font-medium">
          {appointment.user.name || appointment.user.email}
        </span>
        <span className="text-muted-foreground">
          {format(start, "h:mm a")} - {format(end, "h:mm a")}
        </span>
      </div>
      <Badge variant="outline">
        {appointment.status === "ATTENDED" ? "Attended" : "Scheduled"}
      </Badge>
    </Link>
  )
}
