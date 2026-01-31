"use client"

import { useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
} from "date-fns"
import { cn } from "@/lib/utils"
import type { CalendarSession, SessionStatus } from "./types"

interface MonthViewProps {
  currentDate: Date
  sessions: CalendarSession[]
  registeredSessionIds: Set<number>
  waitlistedSessionIds: Set<number>
  onSessionClick: (session: CalendarSession) => void
  onDayClick: (date: Date) => void
}

export function MonthView({
  currentDate,
  sessions,
  registeredSessionIds,
  waitlistedSessionIds,
  onSessionClick,
  onDayClick,
}: MonthViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarSession[]>()

    for (const session of sessions) {
      const dayKey = format(session.startTime, "yyyy-MM-dd")
      const existing = grouped.get(dayKey) || []
      existing.push(session)
      grouped.set(dayKey, existing)
    }

    return grouped
  }, [sessions])

  const getSessionDotColor = (session: CalendarSession): string => {
    if (isBefore(session.endTime, new Date())) {
      return "bg-gray-300"
    }
    if (registeredSessionIds.has(session.id)) {
      return "bg-blue-500"
    }
    if (waitlistedSessionIds.has(session.id)) {
      return "bg-amber-500"
    }
    if (session.registeredCount >= session.maxOccupancy) {
      return "bg-gray-400"
    }
    return "bg-green-500"
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-xs font-medium uppercase text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd")
          const daySessions = sessionsByDay.get(dayKey) || []
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isPast = isBefore(day, new Date()) && !isToday(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[80px] p-2 rounded-lg border text-left transition-colors hover:bg-muted/50",
                !isCurrentMonth && "opacity-40",
                isPast && "opacity-50",
                isToday(day) && "ring-2 ring-primary"
              )}
            >
              <div
                className={cn(
                  "text-sm font-medium mb-1",
                  isToday(day) && "text-primary"
                )}
              >
                {format(day, "d")}
              </div>

              {/* Session dots/indicators */}
              <div className="flex flex-wrap gap-1">
                {daySessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      getSessionDotColor(session)
                    )}
                    title={session.classType?.name ?? session.title}
                  />
                ))}
                {daySessions.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{daySessions.length - 3}
                  </span>
                )}
              </div>

              {/* Show first session title if any */}
              {daySessions.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  {daySessions[0].classType?.name ?? daySessions[0].title}
                  {daySessions.length > 1 && ` +${daySessions.length - 1}`}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Waitlist</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Full</span>
        </div>
      </div>
    </div>
  )
}
