"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useAddBootcampAttendee,
  useRemoveBootcampAttendee,
  useUpdateBootcamp,
} from "@/hooks/useBootcamps"

interface BootcampDetailProps {
  bootcamp: {
    id: number
    name: string
    startTime: Date
    endTime: Date
    location: string | null
    capacity: number | null
    description: string | null
    attendees: Array<{
      id: number
      user: {
        id: number
        name: string | null
        email: string
      }
    }>
  }
  members: Array<{ id: number; name: string | null; email: string }>
}

export function BootcampDetail({ bootcamp, members }: BootcampDetailProps) {
  const updateBootcamp = useUpdateBootcamp()
  const addAttendee = useAddBootcampAttendee()
  const removeAttendee = useRemoveBootcampAttendee()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const attendeeIds = useMemo(
    () => new Set(bootcamp.attendees.map((attendee) => attendee.user.id)),
    [bootcamp.attendees],
  )

  function handleUpdate(field: string, value: string) {
    setError(null)
    setMessage(null)
    updateBootcamp.mutate(
      {
        id: bootcamp.id,
        name: field === "name" ? value : bootcamp.name,
        startTime:
          field === "startTime"
            ? value
            : new Date(bootcamp.startTime).toISOString().slice(0, 16),
        endTime:
          field === "endTime"
            ? value
            : new Date(bootcamp.endTime).toISOString().slice(0, 16),
        location: field === "location" ? value : bootcamp.location ?? "",
        capacity:
          field === "capacity"
            ? value
              ? Number(value)
              : undefined
            : bootcamp.capacity ?? undefined,
        description: field === "description" ? value : bootcamp.description ?? "",
      },
      {
        onSuccess: () => setMessage("Bootcamp updated"),
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Failed to update bootcamp"),
      },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{bootcamp.name}</h1>
        <p className="text-muted-foreground">
          {format(new Date(bootcamp.startTime), "MMM dd, yyyy · h:mm a")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            defaultValue={bootcamp.name}
            onBlur={(event) => handleUpdate("name", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            defaultValue={bootcamp.location ?? ""}
            onBlur={(event) => handleUpdate("location", event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            defaultValue={new Date(bootcamp.startTime).toISOString().slice(0, 16)}
            onBlur={(event) => handleUpdate("startTime", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            defaultValue={new Date(bootcamp.endTime).toISOString().slice(0, 16)}
            onBlur={(event) => handleUpdate("endTime", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            defaultValue={bootcamp.capacity ?? ""}
            onBlur={(event) => handleUpdate("capacity", event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          defaultValue={bootcamp.description ?? ""}
          onBlur={(event) => handleUpdate("description", event.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="memberSelect">Add attendee</Label>
          {bootcamp.capacity && (
            <span className={`text-sm ${bootcamp.attendees.length >= bootcamp.capacity ? 'text-destructive font-medium' : bootcamp.attendees.length >= bootcamp.capacity * 0.9 ? 'text-orange-600' : 'text-muted-foreground'}`}>
              {bootcamp.attendees.length}/{bootcamp.capacity} spots filled
            </span>
          )}
        </div>
        {bootcamp.capacity && bootcamp.attendees.length >= bootcamp.capacity ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            ⚠️ This bootcamp is at capacity. Remove an attendee before adding more.
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              id="memberSelect"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
              onChange={(event) => {
                const memberId = Number(event.target.value)
                if (!memberId) return
                addAttendee.mutate(
                  { bootcampId: bootcamp.id, memberId },
                  {
                    onSuccess: () => setMessage("Attendee added"),
                    onError: (err) =>
                      setError(
                        err instanceof Error ? err.message : "Failed to add attendee",
                      ),
                  },
                )
                event.currentTarget.value = ""
              }}
            >
              <option value="">Select member</option>
              {members
                .filter((member) => !attendeeIds.has(member.id))
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Attendees</Label>
        {bootcamp.attendees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendees yet</p>
        ) : (
          <div className="space-y-2">
            {bootcamp.attendees.map((attendee) => (
              <div
                key={attendee.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div>
                  <p className="font-medium">
                    {attendee.user.name || attendee.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attendee.user.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    removeAttendee.mutate(
                      { bootcampId: bootcamp.id, memberId: attendee.user.id },
                      {
                        onSuccess: () => setMessage("Attendee removed"),
                        onError: (err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to remove attendee",
                          ),
                      },
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
          {message}
        </div>
      )}
    </div>
  )
}
