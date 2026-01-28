"use client"

import {
  useMyRegistrations,
  useSessionUsage,
  useAvailableSessions,
  useRegisterForSession,
  useCancelRegistration,
} from "@/hooks/useSessionRegistration"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

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

export function ClientSessionBrowser() {
  const { data: sessions, isLoading: sessionsLoading } = useAvailableSessions()
  const { data: registrations, isLoading: registrationsLoading } =
    useMyRegistrations({ upcoming: true })
  const registerMutation = useRegisterForSession()
  const cancelMutation = useCancelRegistration()

  const registeredSessionIds = new Set(
    registrations?.map((r) => r.sessionId) ?? []
  )

  const handleRegister = (sessionId: number) => {
    registerMutation.mutate({ sessionId })
  }

  const handleCancel = (registrationId: number) => {
    cancelMutation.mutate({ registrationId })
  }

  return (
    <div className="space-y-6">
      <SessionUsageBar />

      {registrations && registrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Registered Sessions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {registrations.map((registration) => (
              <Card key={registration.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {registration.session?.classType?.name ??
                        registration.session?.title ??
                        "Session"}
                    </CardTitle>
                    <Badge variant="secondary">Registered</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {registration.session?.startTime
                      ? format(
                          new Date(registration.session.startTime),
                          "EEE, MMM d 'at' h:mm a"
                        )
                      : "Time TBD"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(registration.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Registration
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Sessions</h2>

        {sessionsLoading || registrationsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <div className="space-y-2">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => {
              const isRegistered = registeredSessionIds.has(s.id)
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {s.classType?.name ?? s.title ?? "Session"}
                      </CardTitle>
                      {s.maxOccupancy != null && (
                        <Badge variant="outline">
                          {Math.max(0, s.maxOccupancy - (s._count?.registrations ?? 0))} spots left
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-1">
                      {s.startTime
                        ? format(
                            new Date(s.startTime),
                            "EEE, MMM d 'at' h:mm a"
                          )
                        : "Time TBD"}
                    </p>
                    {s.coach && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Coach: {s.coach.name}
                      </p>
                    )}
                    {isRegistered ? (
                      <Badge>Registered</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRegister(s.id)}
                        disabled={registerMutation.isPending}
                      >
                        Book Session
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No upcoming sessions available. Check back later.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
