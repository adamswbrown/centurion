"use client"

import { useMemo, useState } from "react"
import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  DateFilter,
  generateCalendarMonth,
  getPrismaDateFilter,
} from "@/lib/calendar"
import { useSessions } from "@/hooks/useSessions"

const viewOptions = ["month", "week"] as const
type ViewMode = (typeof viewOptions)[number]

interface SessionCalendarProps {
  onSelectSession?: (sessionId: number) => void
}

export function SessionCalendar({ onSelectSession }: SessionCalendarProps) {
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

  const { data: sessions } = useSessions({
    startDate: dateFilter.gte.toISOString(),
    endDate: dateFilter.lt.toISOString(),
  })

  const sessionList = sessions ?? []

  const monthDays = useMemo(
    () => generateCalendarMonth(dateFilter),
    [dateFilter]
  )

  const sessionsByDay = useMemo(() => {
    const map = new Map<
      string,
      typeof sessionList
    >()
    sessionList.forEach((session) => {
      const dayKey = format(new Date(session.startTime), "yyyy-MM-dd")
      const existing = map.get(dayKey) ?? []
      map.set(dayKey, [...existing, session])
    })
    return map
  }, [sessionList])

  const startWeekDate = startOfWeek(cursor)
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startWeekDate, i)
  )

  function shiftMonth(direction: "prev" | "next") {
    const next = new Date(cursor)
    next.setMonth(cursor.getMonth() + (direction === "next" ? 1 : -1))
    setCursor(next)
  }

  function shiftWeek(direction: "prev" | "next") {
    setCursor(addDays(cursor, direction === "next" ? 7 : -7))
  }

  function renderSessionPill(session: (typeof sessionList)[number]) {
    const color = session.classType?.color ?? "#6b7280"

    return (
      <button
        key={session.id}
        onClick={() => onSelectSession?.(session.id)}
        className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors hover:opacity-80"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <span
          className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate font-medium">{session.title}</span>
        <span className="ml-auto flex-shrink-0 text-[10px] opacity-70">
          {format(new Date(session.startTime), "h:mm a")}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {view === "month"
              ? format(cursor, "MMMM yyyy")
              : `Week of ${format(startWeekDate, "MMM dd")}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {sessionList.length} session(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              view === "month" ? shiftMonth("prev") : shiftWeek("prev")
            }
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              view === "month" ? shiftMonth("next") : shiftWeek("next")
            }
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

      {view === "month" ? (
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dayDate = new Date(day.year, day.month, day.day)
              const dayKey = format(dayDate, "yyyy-MM-dd")
              const items = sessionsByDay.get(dayKey) ?? []
              const isToday = isSameDay(dayDate, new Date())

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "min-h-[100px] rounded-md border p-1.5 transition-colors",
                    isToday && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs",
                        isToday ? "font-bold text-primary" : "font-medium"
                      )}
                    >
                      {format(dayDate, "d")}
                    </span>
                    {items.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {items.length}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 3).map(renderSessionPill)}
                    {items.length > 3 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{items.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd")
            const items = sessionsByDay.get(dayKey) ?? []
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={dayKey}
                className={cn(
                  "min-h-[120px] rounded-md border p-2 transition-colors",
                  isToday && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs",
                      isToday ? "font-bold text-primary" : "font-medium"
                    )}
                  >
                    {format(day, "EEE dd")}
                  </span>
                  {items.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {items.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No sessions
                    </p>
                  ) : (
                    items.map(renderSessionPill)
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
