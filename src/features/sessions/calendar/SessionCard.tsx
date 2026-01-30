"use client"

import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Users, MapPin, Clock, User } from "lucide-react"
import type { CalendarSession, SessionStatus } from "./types"

interface SessionCardProps {
  session: CalendarSession
  status: SessionStatus
  isCompact?: boolean
  onClick: () => void
}

const statusColors: Record<SessionStatus, string> = {
  available: "border-l-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30",
  registered: "border-l-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30",
  waitlisted: "border-l-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
  full: "border-l-gray-400 bg-gray-50 hover:bg-gray-100 dark:bg-gray-950/20 dark:hover:bg-gray-950/30",
  past: "border-l-gray-300 bg-gray-50/50 opacity-60 dark:bg-gray-950/10",
}

// Appointments use a distinct purple color scheme
const appointmentColors: Record<SessionStatus, string> = {
  available: "border-l-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
  registered: "border-l-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
  waitlisted: "border-l-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
  full: "border-l-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
  past: "border-l-purple-300 bg-purple-50/50 opacity-60 dark:bg-purple-950/10",
}

const statusBadgeColors: Record<SessionStatus, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  registered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  waitlisted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  full: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  past: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}

const appointmentBadgeColors: Record<SessionStatus, string> = {
  available: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  registered: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  waitlisted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  full: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  past: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}

const statusLabels: Record<SessionStatus, string> = {
  available: "Available",
  registered: "Booked",
  waitlisted: "Waitlist",
  full: "Full",
  past: "Past",
}

export function SessionCard({ session, status, isCompact = false, onClick }: SessionCardProps) {
  const isAppointment = session.itemType === "appointment"
  const spotsRemaining = session.maxOccupancy - session.registeredCount
  const classColor = isAppointment ? "#9333ea" : (session.classType?.color || "#6366f1")
  const colors = isAppointment ? appointmentColors : statusColors
  const badgeColors = isAppointment ? appointmentBadgeColors : statusBadgeColors

  if (isCompact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left p-2 rounded-md border-l-4 transition-colors text-xs",
          colors[status]
        )}
        style={{ borderLeftColor: classColor }}
      >
        <div className="font-medium truncate flex items-center gap-1">
          {isAppointment && <User className="h-3 w-3 flex-shrink-0" />}
          {isAppointment ? session.title : (session.classType?.name ?? session.title)}
        </div>
        <div className="text-muted-foreground">
          {format(session.startTime, "h:mm a")}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border-l-4 transition-colors",
        colors[status]
      )}
      style={{ borderLeftColor: classColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-1">
            {isAppointment && <User className="h-4 w-4 flex-shrink-0" />}
            {isAppointment ? session.title : (session.classType?.name ?? session.title)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(session.startTime, "h:mm a")} - {format(session.endTime, "h:mm a")}
            </span>
          </div>
          {session.coach?.name && (
            <div className="mt-1 text-sm text-muted-foreground">
              {session.coach.name}
            </div>
          )}
          {session.location && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{session.location}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", badgeColors[status])}>
            {isAppointment ? "1-on-1" : statusLabels[status]}
          </span>
          {!isAppointment && status !== "past" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {spotsRemaining > 0 ? `${spotsRemaining} spots` : "Full"}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
