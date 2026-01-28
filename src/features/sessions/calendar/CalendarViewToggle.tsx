"use client"

import { cn } from "@/lib/utils"
import type { CalendarView } from "./types"

interface CalendarViewToggleProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
}

export function CalendarViewToggle({ view, onViewChange }: CalendarViewToggleProps) {
  const views: { value: CalendarView; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ]

  return (
    <div className="inline-flex rounded-lg border bg-muted p-1">
      {views.map((v) => (
        <button
          key={v.value}
          onClick={() => onViewChange(v.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            view === v.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}
