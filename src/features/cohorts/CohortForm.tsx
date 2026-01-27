"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateCohort } from "@/hooks/useCohorts"
import { getCustomCohortTypes } from "@/app/actions/cohort-types"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  type: z.enum(["TIMED", "ONGOING", "CHALLENGE", "CUSTOM", ""]).optional(),
  customCohortTypeId: z.string().optional(),
  membershipDurationMonths: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface CustomCohortTypeOption {
  id: number
  label: string
  description: string | null
}

export function CohortForm() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customTypes, setCustomTypes] = useState<CustomCohortTypeOption[]>([])
  const createCohort = useCreateCohort()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "",
    },
  })

  const selectedType = watch("type")

  useEffect(() => {
    if (open) {
      getCustomCohortTypes()
        .then((types) => setCustomTypes(types))
        .catch(() => setCustomTypes([]))
    }
  }, [open])

  const onSubmit = (data: FormData) => {
    setError(null)

    const start = new Date(data.startDate)
    const end = data.endDate ? new Date(data.endDate) : undefined

    if (end && end <= start) {
      setError("End date must be after start date")
      return
    }

    if (data.type === "TIMED" && !data.endDate) {
      setError("Timed cohorts require an end date")
      return
    }

    if (data.type === "CUSTOM" && !data.customCohortTypeId) {
      setError("Please select a custom cohort type")
      return
    }

    createCohort.mutate(
      {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type ? (data.type as "TIMED" | "ONGOING" | "CHALLENGE" | "CUSTOM") : undefined,
        customCohortTypeId: data.customCohortTypeId ? Number(data.customCohortTypeId) : undefined,
        membershipDurationMonths: data.membershipDurationMonths
          ? Number(data.membershipDurationMonths)
          : undefined,
      },
      {
        onSuccess: (cohort) => {
          setOpen(false)
          reset()
          router.push(`/cohorts/${cohort.id}`)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to create cohort")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Cohort</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Cohort</DialogTitle>
          <DialogDescription>
            Create a new cohort program for group training
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Spring 2026 Bootcamp"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Cohort description (optional)"
              rows={3}
            />
          </div>

          {/* Cohort Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Cohort Type</Label>
            <Select
              value={selectedType || ""}
              onValueChange={(value) => setValue("type", value as FormData["type"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TIMED">Timed</SelectItem>
                <SelectItem value="ONGOING">Ongoing</SelectItem>
                <SelectItem value="CHALLENGE">Challenge</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {selectedType === "TIMED" && "Has a fixed start and end date."}
              {selectedType === "ONGOING" && "No fixed end date, with optional membership duration."}
              {selectedType === "CHALLENGE" && "A time-limited challenge program."}
              {selectedType === "CUSTOM" && "Select a custom type defined by your admin."}
              {!selectedType && "Optional. Categorize your cohort."}
            </p>
          </div>

          {/* Custom Type Selector */}
          {selectedType === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="customCohortTypeId">Custom Type</Label>
              <Select
                value={watch("customCohortTypeId") || ""}
                onValueChange={(value) => setValue("customCohortTypeId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select custom type" />
                </SelectTrigger>
                <SelectContent>
                  {customTypes.map((ct) => (
                    <SelectItem key={ct.id} value={String(ct.id)}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No custom types defined. Create them in Admin Settings first.
                </p>
              )}
            </div>
          )}

          {/* Membership Duration for ONGOING */}
          {selectedType === "ONGOING" && (
            <div className="space-y-2">
              <Label htmlFor="membershipDurationMonths">
                Membership Duration (months)
              </Label>
              <Input
                id="membershipDurationMonths"
                type="number"
                min={1}
                {...register("membershipDurationMonths")}
                placeholder="e.g., 3"
              />
              <p className="text-sm text-muted-foreground">
                Optional. How long each member stays in the cohort.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-sm text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date{selectedType === "ONGOING" ? " (optional)" : ""}
              </Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-sm text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                reset()
                setError(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCohort.isPending}>
              {createCohort.isPending ? "Creating..." : "Create Cohort"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
