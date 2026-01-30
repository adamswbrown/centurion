"use client"

import { useState, useMemo, useCallback } from "react"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, isBefore } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useAvailableSessions,
  useMyRegistrations,
  useSessionUsage,
  useRegisterForSession,
  useCancelRegistration,
} from "@/hooks/useSessionRegistration"
import { useMyAppointments } from "@/hooks/useClientAppointments"
import { CalendarHeader } from "./CalendarHeader"
import { WeekView } from "./WeekView"
import { DayView } from "./DayView"
import { MonthView } from "./MonthView"
import { SessionDetailModal } from "./SessionDetailModal"
import type { CalendarView, CalendarSession, SessionStatus } from "./types"
import { RegistrationStatus } from "@prisma/client"

function SessionUsageBar() {
  const { data: usage, isLoading } = useSessionUsage()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (!usage) return null

  let used = 0
  let total = 0
  let label = ""

  switch (usage.type) {
    case "recurring":
      used = usage.used
      total = usage.limit
      label = `${used} / ${total > 0 ? total : "Unlimited"} sessions this week`
      break
    case "pack":
      used = (usage.totalSessions ?? 0) - (usage.sessionsRemaining ?? 0)
      total = usage.totalSessions ?? 0
      label = `${usage.sessionsRemaining} of ${total} sessions remaining`
      break
    case "prepaid":
      label = `${usage.daysRemaining} days remaining`
      break
  }

  const percentage = total > 0 ? Math.round((used / total) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {usage.planName} - Session Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm mb-2">
          <span>{label}</span>
          {total > 0 && <span>{percentage}%</span>}
        </div>
        {total > 0 && (
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ClientSessionCalendar() {
  const [view, setView] = useState<CalendarView>("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<CalendarSession | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case "day":
        return {
          startDate: currentDate.toISOString(),
          endDate: currentDate.toISOString(),
        }
      case "week": {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 })
        const end = endOfWeek(currentDate, { weekStartsOn: 1 })
        return {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }
      }
      case "month": {
        // Fetch a bit more than the month for the calendar edges
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        return {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }
      }
    }
  }, [view, currentDate])

  // Fetch sessions, registrations, and appointments
  const { data: sessionsData, isLoading: sessionsLoading } = useAvailableSessions(dateRange)
  const { data: registrations, isLoading: registrationsLoading } = useMyRegistrations({ upcoming: false })
  const { data: appointmentsData, isLoading: appointmentsLoading } = useMyAppointments({
    from: new Date(dateRange.startDate),
    to: new Date(dateRange.endDate),
  })
  const registerMutation = useRegisterForSession()
  const cancelMutation = useCancelRegistration()

  // Transform API data to CalendarSession format (group sessions)
  const groupSessions: CalendarSession[] = useMemo(() => {
    if (!sessionsData) return []
    return sessionsData.map((s) => ({
      id: s.id,
      title: s.title,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      maxOccupancy: s.maxOccupancy,
      location: s.location,
      notes: s.notes,
      registeredCount: s._count?.registrations ?? 0,
      classType: s.classType,
      coach: s.coach,
      itemType: "session" as const,
    }))
  }, [sessionsData])

  // Transform appointments to CalendarSession format
  const appointmentSessions: CalendarSession[] = useMemo(() => {
    if (!appointmentsData) return []
    return appointmentsData.map((apt) => ({
      id: apt.id,
      title: apt.title || "Personal Training",
      startTime: new Date(apt.startTime),
      endTime: new Date(apt.endTime),
      maxOccupancy: 1,
      location: null,
      notes: apt.notes,
      registeredCount: 1,
      classType: null,
      coach: apt.coach,
      itemType: "appointment" as const,
    }))
  }, [appointmentsData])

  // Merge sessions and appointments
  const sessions: CalendarSession[] = useMemo(() => {
    return [...groupSessions, ...appointmentSessions].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    )
  }, [groupSessions, appointmentSessions])

  // Track registered and waitlisted sessions
  const { registeredSessionIds, waitlistedSessionIds, registrationBySessionId } = useMemo(() => {
    const registered = new Set<number>()
    const waitlisted = new Set<number>()
    const bySessionId = new Map<number, { id: number; status: RegistrationStatus }>()

    for (const reg of registrations ?? []) {
      bySessionId.set(reg.sessionId, { id: reg.id, status: reg.status })
      if (reg.status === RegistrationStatus.REGISTERED || reg.status === RegistrationStatus.ATTENDED) {
        registered.add(reg.sessionId)
      } else if (reg.status === RegistrationStatus.WAITLISTED) {
        waitlisted.add(reg.sessionId)
      }
    }

    return { registeredSessionIds: registered, waitlistedSessionIds: waitlisted, registrationBySessionId: bySessionId }
  }, [registrations])

  const getSessionStatus = useCallback(
    (session: CalendarSession): SessionStatus => {
      if (isBefore(session.endTime, new Date())) {
        return "past"
      }
      // Appointments are always "registered" (coach-booked)
      if (session.itemType === "appointment") {
        return "registered"
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
    },
    [registeredSessionIds, waitlistedSessionIds]
  )

  const handleSessionClick = (session: CalendarSession) => {
    setSelectedSession(session)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSession(null)
  }

  const handleBook = () => {
    if (!selectedSession) return
    registerMutation.mutate(
      { sessionId: selectedSession.id },
      {
        onSuccess: () => {
          handleCloseModal()
        },
      }
    )
  }

  const handleCancel = () => {
    if (!selectedSession) return
    const registration = registrationBySessionId.get(selectedSession.id)
    if (!registration) return
    cancelMutation.mutate(
      { registrationId: registration.id },
      {
        onSuccess: () => {
          handleCloseModal()
        },
      }
    )
  }

  const handleDayClick = (date: Date) => {
    setCurrentDate(date)
    setView("day")
  }

  const isLoading = sessionsLoading || registrationsLoading || appointmentsLoading

  return (
    <div className="space-y-6">
      <SessionUsageBar />

      <Card>
        <CardContent className="pt-6">
          <CalendarHeader
            view={view}
            currentDate={currentDate}
            onViewChange={setView}
            onDateChange={setCurrentDate}
          />

          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {view === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    sessions={sessions}
                    registeredSessionIds={registeredSessionIds}
                    waitlistedSessionIds={waitlistedSessionIds}
                    onSessionClick={handleSessionClick}
                  />
                )}
                {view === "day" && (
                  <DayView
                    currentDate={currentDate}
                    sessions={sessions}
                    registeredSessionIds={registeredSessionIds}
                    waitlistedSessionIds={waitlistedSessionIds}
                    onSessionClick={handleSessionClick}
                  />
                )}
                {view === "month" && (
                  <MonthView
                    currentDate={currentDate}
                    sessions={sessions}
                    registeredSessionIds={registeredSessionIds}
                    waitlistedSessionIds={waitlistedSessionIds}
                    onSessionClick={handleSessionClick}
                    onDayClick={handleDayClick}
                  />
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <SessionDetailModal
        session={selectedSession}
        status={selectedSession ? getSessionStatus(selectedSession) : "available"}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onBook={handleBook}
        onCancel={handleCancel}
        isBooking={registerMutation.isPending}
        isCancelling={cancelMutation.isPending}
      />
    </div>
  )
}
