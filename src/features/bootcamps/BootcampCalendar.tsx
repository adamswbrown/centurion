"use client"

import { useMemo, useState } from "react"
import { addDays, endOfWeek, format, isSameDay, startOfWeek } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DateFilter, generateCalendarMonth, getPrismaDateFilter } from "@/lib/calendar"
import { useBootcamps } from "@/hooks/useBootcamps"
import Link from "next/link"

const viewOptions = ["month", "week"] as const

type ViewMode = (typeof viewOptions)[number]

export function BootcampCalendar() {
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

  const { data: bootcamps } = useBootcamps()
  const bootcampList = bootcamps ?? []

  const monthDays = useMemo(() => generateCalendarMonth(dateFilter), [dateFilter])

  const bootcampsByDay = useMemo(() => {
    const map = new Map<string, typeof bootcampList>()
    bootcampList.forEach((bootcamp) => {
      const dayKey = format(new Date(bootcamp.startTime), "yyyy-MM-dd")
      const existing = map.get(dayKey) ?? []
      map.set(dayKey, [...existing, bootcamp])
    })
    return map
  }, [bootcampList])

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
            {bootcampList.length} bootcamp(s)
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

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const dayDate = new Date(day.year, day.month, day.day)
            const dayKey = format(dayDate, "yyyy-MM-dd")
            const items = bootcampsByDay.get(dayKey) ?? []
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
                  {items.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {items.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {items.slice(0, 3).map((bootcamp) => (
                    <Link
                      key={bootcamp.id}
                      href={`/bootcamps/${bootcamp.id}`}
                      className="block rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                    >
                      {bootcamp.name}
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{items.length - 3} more
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
            const items = bootcampsByDay.get(dayKey) ?? []
            return (
              <div key={dayKey} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
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
                    <p className="text-xs text-muted-foreground">No bootcamps</p>
                  ) : (
                    items.map((bootcamp) => (
                      <Link
                        key={bootcamp.id}
                        href={`/bootcamps/${bootcamp.id}`}
                        className="block rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                      >
                        {bootcamp.name}
                      </Link>
                    ))
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
