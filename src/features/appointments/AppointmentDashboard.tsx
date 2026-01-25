"use client"

import { useState } from "react"
import { AppointmentCalendar } from "@/features/appointments/AppointmentCalendar"
import { AppointmentForm } from "@/features/appointments/AppointmentForm"

interface AppointmentDashboardProps {
  members: Array<{ id: number; name: string | null; email: string }>
}

export function AppointmentDashboard({ members }: AppointmentDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  return (
    <div className="space-y-6">
      <AppointmentForm members={members} initialDate={selectedDate ?? undefined} />
      <AppointmentCalendar
        selectedDate={selectedDate ?? undefined}
        onSelectDate={(date) => setSelectedDate(date)}
      />
    </div>
  )
}
