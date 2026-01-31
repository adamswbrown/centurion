"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, isToday, isTomorrow } from "date-fns"
import { Calendar, User, Dumbbell } from "lucide-react"
import Link from "next/link"
import { useAvailableSessions, useMyRegistrations } from "@/hooks/useSessions"

export function UpcomingSessionsCard() {
  const { data: registrations, isLoading: loadingRegistrations } = useMyRegistrations()
  const { data: availableSessions, isLoading: loadingSessions } = useAvailableSessions({
    // Get next 7 days of sessions
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  const isLoading = loadingRegistrations || loadingSessions

  // Get user's booked sessions (upcoming only)
  const bookedSessions = registrations?.filter(
    (r) => r.status === "REGISTERED" && new Date(r.session.startTime) > new Date()
  ).slice(0, 3) || []

  // Get available sessions they could book
  const suggestedSessions = availableSessions?.slice(0, 3) || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatSessionDate = (date: Date) => {
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    return format(date, "EEE, MMM d")
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Sessions
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/client/sessions">View All</Link>
          </Button>
        </div>
        <CardDescription>Your upcoming sessions and quick booking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booked Sessions */}
        {bookedSessions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Your Bookings</h4>
            <div className="space-y-2">
              {bookedSessions.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-10 rounded-full"
                      style={{ backgroundColor: reg.session.classType?.color || "#6366f1" }}
                    />
                    <div>
                      <p className="font-medium">{reg.session.classType?.name || reg.session.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatSessionDate(new Date(reg.session.startTime))} at{" "}
                        {format(new Date(reg.session.startTime), "h:mm a")}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Booked</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No bookings yet */}
        {bookedSessions.length === 0 && (
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No upcoming bookings</p>
            <Button size="sm" asChild>
              <Link href="/client/sessions">Browse Sessions</Link>
            </Button>
          </div>
        )}

        {/* Suggested Sessions */}
        {suggestedSessions.length > 0 && bookedSessions.length < 3 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Available This Week</h4>
            <div className="space-y-2">
              {suggestedSessions.slice(0, 3 - bookedSessions.length).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-10 rounded-full"
                      style={{ backgroundColor: session.classType?.color || "#6366f1" }}
                    />
                    <div>
                      <p className="font-medium">{session.classType?.name || session.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatSessionDate(new Date(session.startTime))} {format(new Date(session.startTime), "h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {session.coach.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/client/sessions">Book</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
