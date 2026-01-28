"use client"

import { useMemo } from "react"
import { format, isBefore, isToday } from "date-fns"
import { SessionCard } from "./SessionCard"
import type { CalendarSession, SessionStatus } from "./types"

interface DayViewProps {
  currentDate: Date
  sessions: CalendarSession[]
  registeredSessionIds: Set<number>
  waitlistedSessionIds: Set<number>
  onSessionClick: (session: CalendarSession) => void
}

export function DayView({
  currentDate,
  sessions,
  registeredSessionIds,
  waitlistedSessionIds,
  onSessionClick,
}: DayViewProps) {
  const daySessions = useMemo(() => {
    return sessions
      .filter((session) => {
        const sessionDate = format(session.startTime, "yyyy-MM-dd")
        const currentDateStr = format(currentDate, "yyyy-MM-dd")
        return sessionDate === currentDateStr
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }, [sessions, currentDate])

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

  const isPastDay = isBefore(currentDate, new Date()) && !isToday(currentDate)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-sm font-medium uppercase text-muted-foreground">
          {format(currentDate, "EEEE")}
        </div>
        <div className="text-3xl font-bold">
          {format(currentDate, "MMMM d, yyyy")}
        </div>
        {isToday(currentDate) && (
          <span className="inline-block mt-2 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
            Today
          </span>
        )}
      </div>

      <div className={`space-y-3 ${isPastDay ? "opacity-50" : ""}`}>
        {daySessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No sessions scheduled for this day
          </div>
        ) : (
          daySessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              status={getSessionStatus(session)}
              onClick={() => onSessionClick(session)}
            />
          ))
        )}
      </div>
    </div>
  )
}
