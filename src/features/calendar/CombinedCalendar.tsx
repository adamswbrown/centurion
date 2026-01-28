"use client"

import { useMemo, useState } from "react"
import { addDays, endOfWeek, format, isSameDay, startOfWeek } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DateFilter, generateCalendarMonth, getPrismaDateFilter } from "@/lib/calendar"
import { useAppointments } from "@/hooks/useAppointments"
import { useSessions } from "@/hooks/useSessions"

const viewOptions = ["month", "week"] as const

type ViewMode = (typeof viewOptions)[number]

export function CombinedCalendar() {
  const [view, setView] = useState<ViewMode>("month")
  const [cursor, setCursor] = useState(() => new Date())

  const dateFilter = useMemo<DateFilter>(() => {
    if (view === "week") {
      const weekStart = startOfWeek(cursor)
      const weekEnd = endOfWeek(cursor)
      return { gte: weekStart, lt: addDays(weekEnd, 1) }
    }
    return getPrismaDateFilter(cursor.getFullYear(), cursor.getMonth())
  }, [cursor, view])

  const { data: appointments } = useAppointments({
    from: dateFilter.gte,
    to: dateFilter.lt,
  })
  const { data: sessions } = useSessions({
    startDate: dateFilter.gte?.toISOString(),
    endDate: dateFilter.lt?.toISOString(),
  })

  const appointmentList = appointments ?? []
  const sessionList = sessions ?? []

  const monthDays = useMemo(() => generateCalendarMonth(dateFilter), [dateFilter])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { appointments: typeof appointmentList; sessions: typeof sessionList }>()
    appointmentList.forEach((appointment) => {
      const dayKey = format(new Date(appointment.startTime), "yyyy-MM-dd")
      const entry = map.get(dayKey) || { appointments: [], sessions: [] }
      entry.appointments.push(appointment)
      map.set(dayKey, entry)
    })
    sessionList.forEach((session) => {
      const dayKey = format(new Date(session.startTime), "yyyy-MM-dd")
      const entry = map.get(dayKey) || { appointments: [], sessions: [] }
      entry.sessions.push(session)
      map.set(dayKey, entry)
    })
    return map
  }, [appointmentList, sessionList])

  const startWeek = startOfWeek(cursor)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(startWeek, index))

  function shiftMonth(direction: "prev" | "next") {
    const next = new Date(cursor)
    next.setMonth(cursor.getMonth() + (direction === "next" ? 1 : -1))
    setCursor(next)
  }

  function shiftWeek(direction: "prev" | "next") {
    const next = addDays(cursor, direction === "next" ? 7 : -7)
    setCursor(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {view === "month"
              ? format(cursor, "MMMM yyyy")
              : `Week of ${format(startWeek, "MMM dd")}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {appointmentList.length} appointments · {sessionList.length} sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => (view === "month" ? shiftMonth("prev") : shiftWeek("prev"))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            onClick={() => (view === "month" ? shiftMonth("next") : shiftWeek("next"))}
          >
            Next
          </Button>
          <div className="flex items-center gap-1 rounded-md border p-1">
            {viewOptions.map((option) => (
              <Button
                key={option}
                variant={view === option ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(option)}
              >
                {option === "month" ? "Month" : "Week"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Appointments
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sessions
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const dayDate = new Date(day.year, day.month, day.day)
            const dayKey = format(dayDate, "yyyy-MM-dd")
            const events = eventsByDay.get(dayKey) || { appointments: [], sessions: [] }
            const isToday = isSameDay(dayDate, new Date())

            return (
              <div
                key={dayKey}
                className={cn(
                  "min-h-[120px] rounded-md border p-2",
                  isToday && "border-primary",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {format(dayDate, "EEE dd")}
                  </span>
                  {(events.appointments.length + events.sessions.length) > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {events.appointments.length + events.sessions.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {events.appointments.slice(0, 2).map((appointment) => (
                    <div key={`apt-${appointment.id}`} className="rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs">
                      {format(new Date(appointment.startTime), "h:mm a")}
                    </div>
                  ))}
                  {events.sessions.slice(0, 2).map((session) => (
                    <div key={`session-${session.id}`} className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs">
                      {session.title}
                    </div>
                  ))}
                  {(events.appointments.length + events.sessions.length) > 4 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{events.appointments.length + events.sessions.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd")
            const events = eventsByDay.get(dayKey) || { appointments: [], sessions: [] }
            return (
              <div key={dayKey} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {format(day, "EEE dd")}
                  </span>
                  {(events.appointments.length + events.sessions.length) > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {events.appointments.length + events.sessions.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {events.appointments.map((appointment) => (
                    <div key={`apt-${appointment.id}`} className="rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs">
                      {format(new Date(appointment.startTime), "h:mm a")}
                    </div>
                  ))}
                  {events.sessions.map((session) => (
                    <div key={`session-${session.id}`} className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs">
                      {session.title}
                    </div>
                  ))}
                  {events.appointments.length + events.sessions.length === 0 && (
                    <p className="text-xs text-muted-foreground">No events</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
