"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths } from "date-fns"
import type { CalendarView } from "./types"

interface WeekNavigationProps {
  currentDate: Date
  view: CalendarView
  onDateChange: (date: Date) => void
}

export function WeekNavigation({ currentDate, view, onDateChange }: WeekNavigationProps) {
  const handlePrevious = () => {
    switch (view) {
      case "day":
        onDateChange(addDays(currentDate, -1))
        break
      case "week":
        onDateChange(addWeeks(currentDate, -1))
        break
      case "month":
        onDateChange(addMonths(currentDate, -1))
        break
    }
  }

  const handleNext = () => {
    switch (view) {
      case "day":
        onDateChange(addDays(currentDate, 1))
        break
      case "week":
        onDateChange(addWeeks(currentDate, 1))
        break
      case "month":
        onDateChange(addMonths(currentDate, 1))
        break
    }
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const getDateRangeLabel = () => {
    switch (view) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, "MMMM d")} - ${format(weekEnd, "d, yyyy")}`
        }
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
      }
      case "month":
        return format(currentDate, "MMMM yyyy")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleToday}>
        Today
      </Button>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-lg font-semibold min-w-[200px]">
        {getDateRangeLabel()}
      </span>
    </div>
  )
}
