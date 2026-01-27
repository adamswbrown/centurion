"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateCohortCheckInFrequency } from "@/app/actions/check-in-frequency"

interface CohortCheckInFrequencyProps {
  cohortId: number
  currentFrequency: number | null
}

export function CohortCheckInFrequency({
  cohortId,
  currentFrequency,
}: CohortCheckInFrequencyProps) {
  const router = useRouter()
  const [frequency, setFrequency] = useState(
    currentFrequency?.toString() ?? ""
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const days = frequency.trim() === "" ? null : parseInt(frequency, 10)

      if (days !== null && (isNaN(days) || days < 1 || days > 90)) {
        setError("Frequency must be between 1 and 90 days")
        setLoading(false)
        return
      }

      const result = await updateCohortCheckInFrequency(cohortId, days)
      if (result && "error" in result) {
        setError(result.error as string)
      } else {
        setMessage(
          days === null
            ? "Override cleared. Using system default."
            : `Check-in frequency set to every ${days} day(s).`
        )
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update frequency")
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setFrequency("")
    // Auto-save on clear
    setError(null)
    setMessage(null)
    setLoading(true)

    updateCohortCheckInFrequency(cohortId, null)
      .then((result) => {
        if (result && "error" in result) {
          setError(result.error as string)
        } else {
          setMessage("Override cleared. Using system default.")
          router.refresh()
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to clear frequency")
      })
      .finally(() => setLoading(false))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in Frequency Override</CardTitle>
        <CardDescription>
          Override the system default check-in frequency for this cohort.
          Leave blank to use the system default (7 days).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="frequency">Frequency (days)</Label>
            <Input
              id="frequency"
              type="number"
              min="1"
              max="90"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="System default: 7 days"
            />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
          {currentFrequency != null && (
            <Button variant="outline" onClick={handleClear} disabled={loading}>
              Clear Override
            </Button>
          )}
        </div>

        {message && (
          <p className="text-sm text-emerald-600">{message}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
