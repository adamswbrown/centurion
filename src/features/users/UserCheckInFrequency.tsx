"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCheckInFrequencyConfig, updateUserCheckInFrequency } from "@/app/actions/check-in-frequency"

interface UserCheckInFrequencyProps {
  userId: number
  currentFrequency: number | null
}

export function UserCheckInFrequency({ userId, currentFrequency }: UserCheckInFrequencyProps) {
  const [config, setConfig] = useState<{
    systemDefault: number
    cohortOverride: number | null
    cohortName: string | null
    userOverride: number | null
    effective: number
  } | null>(null)
  const [days, setDays] = useState<string>(currentFrequency?.toString() || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCheckInFrequencyConfig(userId).then(setConfig)
  }, [userId])

  useEffect(() => {
    if (config) {
      setDays(config.userOverride?.toString() || "")
    }
  }, [config])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const value = days.trim() === "" ? null : Number(days)
    if (value !== null && (isNaN(value) || value < 1 || value > 90)) {
      setError("Frequency must be between 1 and 90 days")
      setSaving(false)
      return
    }
    const result = await updateUserCheckInFrequency(userId, value)
    if ("error" in result && typeof result.error === "string") {
      setError(result.error)
    } else {
      const updated = await getCheckInFrequencyConfig(userId)
      setConfig(updated)
    }
    setSaving(false)
  }

  const handleClear = async () => {
    setSaving(true)
    setError(null)
    await updateUserCheckInFrequency(userId, null)
    setDays("")
    const updated = await getCheckInFrequencyConfig(userId)
    setConfig(updated)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Check-in Frequency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {config && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>System default: every {config.systemDefault} days</p>
            {config.cohortName && (
              <p>
                Cohort ({config.cohortName}):{" "}
                {config.cohortOverride ? `every ${config.cohortOverride} days` : "using default"}
              </p>
            )}
            <p className="font-medium text-foreground">
              Effective: every {config.effective} days
            </p>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="user-frequency">User override (days)</Label>
            <Input
              id="user-frequency"
              type="number"
              min={1}
              max={90}
              placeholder="No override"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save"}
          </Button>
          {config?.userOverride !== null && (
            <Button onClick={handleClear} disabled={saving} size="sm" variant="outline">
              Clear
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
