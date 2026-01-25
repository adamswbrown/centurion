"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  useAvailableBootcamps,
  useRegisterForBootcamp,
  useUnregisterFromBootcamp,
} from "@/hooks/useClientBootcamps"
import type { Session } from "next-auth"

interface BootcampRegistrationProps {
  session: Session
}

export function BootcampRegistration({ session }: BootcampRegistrationProps) {
  const { data: bootcamps, isLoading } = useAvailableBootcamps()
  const register = useRegisterForBootcamp()
  const unregister = useUnregisterFromBootcamp()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (isLoading) return <div>Loading bootcamps...</div>

  if (!bootcamps || bootcamps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No upcoming bootcamps available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bootcamps.map((bootcamp) => {
          const userId = Number(session.user.id)
          const isRegistered = bootcamp.attendees.some(
            (a) => a.user.id === userId,
          )
          const isFull =
            bootcamp.capacity !== null &&
            bootcamp.attendees.length >= bootcamp.capacity
          const spotsLeft =
            bootcamp.capacity !== null
              ? bootcamp.capacity - bootcamp.attendees.length
              : null

          return (
            <Card key={bootcamp.id}>
              <CardHeader>
                <CardTitle>{bootcamp.name}</CardTitle>
                <CardDescription>
                  {format(new Date(bootcamp.startTime), "MMM dd, yyyy")}
                  <br />
                  {format(new Date(bootcamp.startTime), "h:mm a")} -{" "}
                  {format(new Date(bootcamp.endTime), "h:mm a")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {bootcamp.location && (
                  <p className="text-sm text-muted-foreground">
                    📍 {bootcamp.location}
                  </p>
                )}
                {bootcamp.description && (
                  <p className="text-sm">{bootcamp.description}</p>
                )}

                <div className="flex items-center gap-2">
                  {isRegistered && (
                    <Badge variant="default">Registered</Badge>
                  )}
                  {isFull && !isRegistered && (
                    <Badge variant="destructive">Full</Badge>
                  )}
                  {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 3 && (
                    <Badge variant="outline" className="text-orange-600">
                      {spotsLeft} spots left
                    </Badge>
                  )}
                  {bootcamp.capacity && (
                    <span className="text-xs text-muted-foreground">
                      {bootcamp.attendees.length}/{bootcamp.capacity} attendees
                    </span>
                  )}
                </div>

                {isRegistered ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setError(null)
                      setMessage(null)
                      unregister.mutate(bootcamp.id, {
                        onSuccess: () => setMessage("Unregistered successfully"),
                        onError: (err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to unregister",
                          ),
                      })
                    }}
                    disabled={unregister.isPending}
                  >
                    {unregister.isPending ? "Unregistering..." : "Unregister"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setError(null)
                      setMessage(null)
                      register.mutate(bootcamp.id, {
                        onSuccess: () => setMessage("Registered successfully!"),
                        onError: (err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to register",
                          ),
                      })
                    }}
                    disabled={register.isPending || isFull}
                  >
                    {register.isPending
                      ? "Registering..."
                      : isFull
                        ? "Full"
                        : "Register"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
