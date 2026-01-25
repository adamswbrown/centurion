"use client"

import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useDeleteAppointment } from "@/hooks/useAppointments"
import Link from "next/link"

interface AppointmentListProps {
  appointments: Array<{
    id: number
    startTime: Date
    endTime: Date
    fee: string
    status: string
    user: {
      id: number
      name: string | null
      email: string
    }
  }>
}

export function AppointmentList({ appointments }: AppointmentListProps) {
  const deleteAppointment = useDeleteAppointment()

  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments yet</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appointment) => (
          <TableRow key={appointment.id}>
            <TableCell className="font-medium">
              <Link
                href={`/appointments/${appointment.id}`}
                className="hover:underline"
              >
                {appointment.user.name || appointment.user.email}
              </Link>
            </TableCell>
            <TableCell>
              {format(new Date(appointment.startTime), "MMM dd, yyyy")}
            </TableCell>
            <TableCell>
              {format(new Date(appointment.startTime), "hh:mm a")} -{" "}
              {format(new Date(appointment.endTime), "hh:mm a")}
            </TableCell>
            <TableCell>${appointment.fee}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {appointment.status === "ATTENDED" ? "Attended" : "Scheduled"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteAppointment.mutate(appointment.id)}
                aria-label="Delete appointment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
