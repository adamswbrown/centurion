"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateSession } from "@/hooks/useSessions"
import { useClassTypes } from "@/hooks/useClassTypes"

const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  classTypeId: z.coerce.number().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  maxOccupancy: z.coerce.number().int().min(1, "Must allow at least 1 participant"),
  location: z.string().optional(),
  notes: z.string().optional(),
  cohortId: z.coerce.number().optional(),
})

type SessionFormValues = z.infer<typeof sessionFormSchema>

interface SessionFormProps {
  cohorts?: Array<{ id: number; name: string }>
  onSuccess?: () => void
}

export function SessionForm({ cohorts, onSuccess }: SessionFormProps) {
  const createSession = useCreateSession()
  const { data: classTypes } = useClassTypes({ activeOnly: true })
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: "",
      classTypeId: undefined,
      startTime: "",
      endTime: "",
      maxOccupancy: 12,
      location: "",
      notes: "",
      cohortId: undefined,
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setMessage(null)

    try {
      await createSession.mutateAsync({
        title: values.title,
        classTypeId: values.classTypeId || undefined,
        startTime: values.startTime,
        endTime: values.endTime,
        maxOccupancy: values.maxOccupancy,
        location: values.location || undefined,
        notes: values.notes || undefined,
        cohortId: values.cohortId || undefined,
      })
      setMessage("Session created successfully")
      form.reset()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session")
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="session-title">Title</Label>
          <Input
            id="session-title"
            type="text"
            placeholder="e.g. Morning HIIT"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="session-classType">Class Type</Label>
          <select
            id="session-classType"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...form.register("classTypeId")}
          >
            <option value="">No class type</option>
            {(classTypes ?? []).map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="session-startTime">Start Time</Label>
          <Input
            id="session-startTime"
            type="datetime-local"
            {...form.register("startTime")}
          />
          {form.formState.errors.startTime && (
            <p className="text-xs text-destructive">
              {form.formState.errors.startTime.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="session-endTime">End Time</Label>
          <Input
            id="session-endTime"
            type="datetime-local"
            {...form.register("endTime")}
          />
          {form.formState.errors.endTime && (
            <p className="text-xs text-destructive">
              {form.formState.errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="session-maxOccupancy">Max Occupancy</Label>
          <Input
            id="session-maxOccupancy"
            type="number"
            min={1}
            {...form.register("maxOccupancy")}
          />
          {form.formState.errors.maxOccupancy && (
            <p className="text-xs text-destructive">
              {form.formState.errors.maxOccupancy.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="session-location">Location (optional)</Label>
          <Input
            id="session-location"
            type="text"
            placeholder="e.g. Studio A"
            {...form.register("location")}
          />
        </div>
        {cohorts && cohorts.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="session-cohort">Cohort (optional)</Label>
            <select
              id="session-cohort"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("cohortId")}
            >
              <option value="">No cohort</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="session-notes">Notes (optional)</Label>
        <Textarea
          id="session-notes"
          rows={3}
          placeholder="Any additional notes for this session..."
          {...form.register("notes")}
        />
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

      <div className="flex justify-end">
        <Button type="submit" disabled={createSession.isPending}>
          {createSession.isPending ? "Creating..." : "Create Session"}
        </Button>
      </div>
    </form>
  )
}
