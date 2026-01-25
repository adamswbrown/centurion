"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateAppointment } from "@/hooks/useAppointments"

const formSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  fee: z.coerce.number().min(0),
  notes: z.string().optional(),
  weeksToRepeat: z.coerce.number().min(0).max(52).optional(),
  selectedDays: z.array(z.number().int().min(0).max(6)).optional(),
})

type FormValues = z.infer<typeof formSchema>

const weekdayOptions = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
]

interface AppointmentFormProps {
  members: Array<{ id: number; name: string | null; email: string }>
  initialDate?: Date
}

export function AppointmentForm({ members, initialDate }: AppointmentFormProps) {
  const createAppointment = useCreateAppointment()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const defaultMemberId = useMemo(() => {
    return members[0]?.id?.toString() ?? ""
  }, [members])
  const lastPresetRef = useRef<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: defaultMemberId,
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "10:00",
      fee: 0,
      notes: "",
      weeksToRepeat: 0,
      selectedDays: [],
    },
  })

  const selectedDays = form.watch("selectedDays") || []

  useEffect(() => {
    if (!initialDate) return
    const formatted = format(initialDate, "yyyy-MM-dd")
    if (lastPresetRef.current === formatted) return
    lastPresetRef.current = formatted
    form.setValue("date", formatted, { shouldDirty: true })
    form.setValue("selectedDays", [initialDate.getDay()], {
      shouldDirty: true,
    })
  }, [form, initialDate])

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setMessage(null)
    try {
      const result = await createAppointment.mutateAsync({
        memberId: Number(values.memberId),
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        fee: values.fee,
        notes: values.notes,
        weeksToRepeat: values.weeksToRepeat ?? 0,
        selectedDays: values.selectedDays ?? [],
      })
      if (!result.syncStatus.success) {
        setError(result.syncStatus.message ?? "Calendar sync failed")
      } else {
        setMessage("Appointment created")
      }
      form.reset({
        ...values,
        notes: "",
        weeksToRepeat: 0,
        selectedDays: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment")
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="memberId">Member</Label>
          <select
            id="memberId"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...form.register("memberId")}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || member.email}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">Fee</Label>
          <Input id="fee" type="number" step="0.01" {...form.register("fee")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...form.register("date")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" type="time" {...form.register("startTime")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input id="endTime" type="time" {...form.register("endTime")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weeksToRepeat">Repeat (weeks)</Label>
          <Input
            id="weeksToRepeat"
            type="number"
            min={0}
            max={52}
            {...form.register("weeksToRepeat")}
          />
        </div>
        <div className="space-y-2">
          <Label>Repeat on</Label>
          <div className="flex flex-wrap gap-2">
            {weekdayOptions.map((day) => {
              const isChecked = selectedDays.includes(day.value)
              return (
                <label key={day.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked
                        ? selectedDays.filter((value) => value !== day.value)
                        : [...selectedDays, day.value]
                      form.setValue("selectedDays", next)
                    }}
                  />
                  {day.label}
                </label>
              )
            })}
          </div>
        </div>
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
        <Button type="submit" disabled={createAppointment.isPending}>
          {createAppointment.isPending ? "Creating..." : "Create Appointment"}
        </Button>
      </div>
    </form>
  )
}
