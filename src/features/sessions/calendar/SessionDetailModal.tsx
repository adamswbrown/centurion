"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Mail,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarSession, SessionStatus } from "./types"

interface SessionDetailModalProps {
  session: CalendarSession | null
  status: SessionStatus
  isOpen: boolean
  onClose: () => void
  onBook: () => void
  onCancel: () => void
  isBooking: boolean
  isCancelling: boolean
}

const statusLabels: Record<SessionStatus, string> = {
  available: "Available",
  registered: "You're Booked",
  waitlisted: "On Waitlist",
  full: "Class Full",
  past: "Past Session",
}

const statusColors: Record<SessionStatus, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  registered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  waitlisted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  full: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  past: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}

const appointmentStatusColors: Record<SessionStatus, string> = {
  available: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  registered: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  waitlisted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  full: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  past: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}

export function SessionDetailModal({
  session,
  status,
  isOpen,
  onClose,
  onBook,
  onCancel,
  isBooking,
  isCancelling,
}: SessionDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview")

  if (!session) return null

  const isAppointment = session.itemType === "appointment"
  const spotsRemaining = session.maxOccupancy - session.registeredCount
  const classColor = isAppointment ? "#9333ea" : (session.classType?.color || "#6366f1")
  const isPast = status === "past"
  const badgeColors = isAppointment ? appointmentStatusColors : statusColors

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="w-1 h-12 rounded-full flex-shrink-0"
              style={{ backgroundColor: classColor }}
            />
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                {isAppointment && <User className="h-5 w-5" />}
                {isAppointment ? session.title : (session.classType?.name ?? session.title)}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn(badgeColors[status])}>
                  {isAppointment ? "1-on-1 Session" : statusLabels[status]}
                </Badge>
                {!isPast && !isAppointment && (
                  <span className="text-sm text-muted-foreground">
                    {spotsRemaining > 0 ? `${spotsRemaining} spots left` : "Full"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="venue">Venue</TabsTrigger>
            <TabsTrigger value="coach">Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(session.startTime, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(session.startTime, "h:mm a")} -{" "}
                  {format(session.endTime, "h:mm a")}
                </span>
              </div>
              {!isAppointment && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {session.registeredCount} / {session.maxOccupancy} attendees
                  </span>
                </div>
              )}
              {isAppointment && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Personal Training Session</span>
                </div>
              )}
              {session.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{session.location}</span>
                </div>
              )}
            </div>

            {session.classType?.description && (
              <div className="pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">About this class</h4>
                <p className="text-sm text-muted-foreground">
                  {session.classType.description}
                </p>
              </div>
            )}

            {session.notes && (
              <div className="pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">Session notes</h4>
                <p className="text-sm text-muted-foreground">{session.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="venue" className="mt-4">
            {session.location ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">{session.location}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Arrive 5-10 minutes early to check in and prepare for class.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No venue information available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="coach" className="mt-4">
            {session.coach ? (
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session.coach.image ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {session.coach.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">
                    {session.coach.name ?? "Coach"}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{session.coach.email}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No coach information available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        <div className="mt-6 pt-4 border-t">
          {status === "available" && (
            <Button
              className="w-full"
              size="lg"
              onClick={onBook}
              disabled={isBooking}
            >
              {isBooking ? "Booking..." : "Book This Class"}
            </Button>
          )}

          {status === "full" && (
            <Button
              className="w-full"
              size="lg"
              variant="secondary"
              onClick={onBook}
              disabled={isBooking}
            >
              {isBooking ? "Joining..." : "Join Waitlist"}
            </Button>
          )}

          {status === "registered" && !isAppointment && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-800 dark:text-blue-200">
                  You're booked for this class
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </div>
          )}

          {status === "registered" && isAppointment && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm">
              <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-800 dark:text-purple-200">
                This 1-on-1 session was scheduled by your coach
              </span>
            </div>
          )}

          {status === "waitlisted" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-800 dark:text-amber-200">
                  You're on the waitlist. We'll notify you if a spot opens up.
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Leaving..." : "Leave Waitlist"}
              </Button>
            </div>
          )}

          {status === "past" && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-950/30 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                This session has already ended
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
