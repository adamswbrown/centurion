"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUpsertEntry, useHealthKitPreview, type UpsertEntryInput } from "@/hooks/useEntries"
import { format } from "date-fns"

interface CheckInFormProps {
  initialData?: Partial<UpsertEntryInput>
  onSuccess?: () => void
}

function HealthKitIndicator({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-purple-600 mt-1">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <span>HealthKit: {value.toLocaleString()} {label} (auto-fills if empty)</span>
    </div>
  )
}

export function CheckInForm({ initialData, onSuccess }: CheckInFormProps) {
  const today = format(new Date(), "yyyy-MM-dd")
  const [date, setDate] = useState(initialData?.date || today)
  const [weight, setWeight] = useState<string>(initialData?.weight?.toString() || "")
  const [steps, setSteps] = useState<string>(initialData?.steps?.toString() || "")
  const [calories, setCalories] = useState<string>(initialData?.calories?.toString() || "")
  const [sleepQuality, setSleepQuality] = useState<string>(
    initialData?.sleepQuality?.toString() || ""
  )
  const [perceivedStress, setPerceivedStress] = useState<string>(
    initialData?.perceivedStress?.toString() || ""
  )
  const [notes, setNotes] = useState(initialData?.notes || "")

  // Fetch HealthKit preview data for the selected date
  const { data: healthKitData } = useHealthKitPreview(date)

  const { mutate: upsertEntry, isPending } = useUpsertEntry()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: UpsertEntryInput = {
      date,
      weight: weight ? parseFloat(weight) : null,
      steps: steps ? parseInt(steps) : null,
      calories: calories ? parseInt(calories) : null,
      sleepQuality: sleepQuality ? parseInt(sleepQuality) : null,
      perceivedStress: perceivedStress ? parseInt(perceivedStress) : null,
      notes: notes || null,
    }

    upsertEntry(data, {
      onSuccess: () => {
        onSuccess?.()
        // Clear form after successful submission
        setWeight("")
        setSteps("")
        setCalories("")
        setSleepQuality("")
        setPerceivedStress("")
        setNotes("")
      },
    })
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-6">Log Your Check-In</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="weight">Weight (lbs) <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight in lbs"
          />
        </div>

        <div>
          <Label htmlFor="steps">Steps <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="steps"
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder={healthKitData?.steps ? `HealthKit: ${healthKitData.steps.toLocaleString()}` : "Enter step count"}
          />
          {!steps && <HealthKitIndicator value={healthKitData?.steps ?? null} label="steps" />}
        </div>

        <div>
          <Label htmlFor="calories">Calories <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="calories"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder={healthKitData?.calories ? `HealthKit: ${healthKitData.calories.toLocaleString()}` : "Enter calories burned"}
          />
          {!calories && <HealthKitIndicator value={healthKitData?.calories ?? null} label="cal" />}
        </div>

        <div>
          <Label htmlFor="sleepQuality">Sleep Quality <span className="text-muted-foreground font-normal">(1-10, optional)</span></Label>
          <Input
            id="sleepQuality"
            type="number"
            min="1"
            max="10"
            value={sleepQuality}
            onChange={(e) => setSleepQuality(e.target.value)}
            placeholder={healthKitData?.sleepQuality ? `HealthKit: ${healthKitData.sleepQuality}/10` : "Rate 1-10"}
          />
          {!sleepQuality && <HealthKitIndicator value={healthKitData?.sleepQuality ?? null} label="/10" />}
        </div>

        <div>
          <Label htmlFor="perceivedStress">Perceived Stress <span className="text-muted-foreground font-normal">(1-10, optional)</span></Label>
          <Input
            id="perceivedStress"
            type="number"
            min="1"
            max="10"
            value={perceivedStress}
            onChange={(e) => setPerceivedStress(e.target.value)}
            placeholder="Rate 1-10"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Submit Check-In"}
        </Button>
      </form>
    </div>
  )
}
