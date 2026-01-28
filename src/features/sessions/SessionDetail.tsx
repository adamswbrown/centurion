"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MapPin,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { useSession, useCancelSession } from "@/hooks/useSessions"
import {
  useSessionRegistrations,
  useMarkAttendance,
} from "@/hooks/useSessionRegistration"

function registrationStatusVariant(status: string) {
  switch (status) {
    case "REGISTERED":
      return "secondary"
    case "WAITLISTED":
      return "outline"
    case "ATTENDED":
      return "default"
    case "NO_SHOW":
      return "destructive"
    case "CANCELLED":
    case "LATE_CANCELLED":
      return "outline"
    default:
      return "outline"
  }
}

function sessionStatusVariant(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "secondary"
    case "CANCELLED":
      return "destructive"
    case "COMPLETED":
      return "default"
    default:
      return "outline"
  }
}

interface SessionDetailProps {
  sessionId: number
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const { data: session, isLoading } = useSession(sessionId)
  const { data: registrations, isLoading: regsLoading } =
    useSessionRegistrations(sessionId)
  const cancelSession = useCancelSession()
  const markAttendance = useMarkAttendance()
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading session...</p>
  }

  if (!session) {
    return <p className="text-sm text-muted-foreground">Session not found.</p>
  }

  const isCancellable = session.status === "SCHEDULED"

  function handleCancel() {
    setError(null)
    cancelSession.mutate(sessionId, {
      onError: (err) =>
        setError(
          err instanceof Error ? err.message : "Failed to cancel session"
        ),
    })
  }

  function handleMarkAttendance(
    registrationId: number,
    status: "ATTENDED" | "NO_SHOW"
  ) {
    markAttendance.mutate({ registrationId, status })
  }

  const registrationList = registrations ?? session.registrations ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{session.title}</CardTitle>
              {session.classType && (
                <Badge
                  className="mt-2"
                  style={{
                    backgroundColor: session.classType.color ?? undefined,
                    color: "#fff",
                  }}
                >
                  {session.classType.name}
                </Badge>
              )}
            </div>
            <Badge variant={sessionStatusVariant(session.status)}>
              {session.status.charAt(0) +
                session.status.slice(1).toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(session.startTime), "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(session.startTime), "h:mm a")} -{" "}
                {format(new Date(session.endTime), "h:mm a")}
              </span>
            </div>
            {session.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{session.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {registrationList.filter(
                  (r) =>
                    r.status === "REGISTERED" || r.status === "ATTENDED"
                ).length}
                /{session.maxOccupancy} registered
              </span>
            </div>
          </div>

          {session.coach && (
            <p className="mt-3 text-sm text-muted-foreground">
              Coach: {session.coach.name || session.coach.email}
            </p>
          )}

          {session.notes && (
            <p className="mt-2 text-sm text-muted-foreground">
              {session.notes}
            </p>
          )}

          {error && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {isCancellable && (
            <div className="mt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={cancelSession.isPending}
              >
                {cancelSession.isPending
                  ? "Cancelling..."
                  : "Cancel Session"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Registrations</h3>
        {regsLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading registrations...
          </p>
        ) : registrationList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No registrations yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrationList.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">
                    {reg.user?.name || reg.user?.email || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={registrationStatusVariant(reg.status)}
                    >
                      {reg.status === "LATE_CANCELLED"
                        ? "Late Cancel"
                        : reg.status.charAt(0) +
                          reg.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reg.registeredAt
                      ? format(new Date(reg.registeredAt), "MMM dd, h:mm a")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {(reg.status === "REGISTERED" ||
                      reg.status === "ATTENDED" ||
                      reg.status === "NO_SHOW") && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant={
                            reg.status === "ATTENDED" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleMarkAttendance(reg.id, "ATTENDED")
                          }
                          disabled={markAttendance.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Attended
                        </Button>
                        <Button
                          variant={
                            reg.status === "NO_SHOW"
                              ? "destructive"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleMarkAttendance(reg.id, "NO_SHOW")
                          }
                          disabled={markAttendance.isPending}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          No Show
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
