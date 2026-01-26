"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUpsertEntry, type UpsertEntryInput } from "@/hooks/useEntries"
import { format } from "date-fns"

interface CheckInFormProps {
  initialData?: Partial<UpsertEntryInput>
  onSuccess?: () => void
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
            placeholder="Enter step count"
          />
        </div>

        <div>
          <Label htmlFor="calories">Calories <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="calories"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Enter calories consumed"
          />
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
            placeholder="Rate 1-10"
          />
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
