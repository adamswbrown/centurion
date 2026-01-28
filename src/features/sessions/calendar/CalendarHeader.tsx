"use client"

import { CalendarViewToggle } from "./CalendarViewToggle"
import { WeekNavigation } from "./WeekNavigation"
import type { CalendarView } from "./types"

interface CalendarHeaderProps {
  view: CalendarView
  currentDate: Date
  onViewChange: (view: CalendarView) => void
  onDateChange: (date: Date) => void
}

export function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b">
      <WeekNavigation
        currentDate={currentDate}
        view={view}
        onDateChange={onDateChange}
      />
      <CalendarViewToggle view={view} onViewChange={onViewChange} />
    </div>
  )
}
