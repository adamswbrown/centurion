"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateBootcamp } from "@/hooks/useBootcamps"

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function BootcampForm() {
  const createBootcamp = useCreateBootcamp()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
      location: "",
      capacity: undefined,
      description: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setMessage(null)
    try {
      await createBootcamp.mutateAsync({
        ...values,
        capacity: values.capacity ? Number(values.capacity) : undefined,
      })
      setMessage("Bootcamp created")
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bootcamp")
    }
  })

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...form.register("location")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" type="datetime-local" {...form.register("startTime")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input id="endTime" type="datetime-local" {...form.register("endTime")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" type="number" {...form.register("capacity")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...form.register("description")} />
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
        <Button type="submit" disabled={createBootcamp.isPending}>
          {createBootcamp.isPending ? "Creating..." : "Create Bootcamp"}
        </Button>
      </div>
    </form>
  )
}
