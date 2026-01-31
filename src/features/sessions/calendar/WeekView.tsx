"use client"

import { useMemo } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isBefore,
} from "date-fns"
import { cn } from "@/lib/utils"
import { SessionCard } from "./SessionCard"
import type { CalendarSession, SessionStatus } from "./types"

interface WeekViewProps {
  currentDate: Date
  sessions: CalendarSession[]
  registeredSessionIds: Set<number>
  waitlistedSessionIds: Set<number>
  onSessionClick: (session: CalendarSession) => void
}

export function WeekView({
  currentDate,
  sessions,
  registeredSessionIds,
  waitlistedSessionIds,
  onSessionClick,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarSession[]>()

    for (const day of weekDays) {
      const dayKey = format(day, "yyyy-MM-dd")
      grouped.set(dayKey, [])
    }

    for (const session of sessions) {
      const dayKey = format(session.startTime, "yyyy-MM-dd")
      const existing = grouped.get(dayKey)
      if (existing) {
        existing.push(session)
      }
    }

    // Sort sessions within each day by start time
    for (const [key, daySessions] of grouped) {
      grouped.set(
        key,
        daySessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      )
    }

    return grouped
  }, [weekDays, sessions])

  const getSessionStatus = (session: CalendarSession): SessionStatus => {
    if (isBefore(session.endTime, new Date())) {
      return "past"
    }
    if (registeredSessionIds.has(session.id)) {
      return "registered"
    }
    if (waitlistedSessionIds.has(session.id)) {
      return "waitlisted"
    }
    if (session.registeredCount >= session.maxOccupancy) {
      return "full"
    }
    return "available"
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row with day names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-2 rounded-lg",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {format(day, "EEE")}
              </div>
              <div className={cn("text-lg font-semibold", isToday(day) ? "" : "")}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Sessions grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd")
            const daySessions = sessionsByDay.get(dayKey) || []
            const isPast = isBefore(day, new Date()) && !isToday(day)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[200px] p-2 rounded-lg border bg-muted/30",
                  isPast && "opacity-50"
                )}
              >
                <div className="space-y-2">
                  {daySessions.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No sessions
                    </div>
                  ) : (
                    daySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        status={getSessionStatus(session)}
                        isCompact
                        onClick={() => onSessionClick(session)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
