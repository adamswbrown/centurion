"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateSystemSettings } from "@/app/actions/settings"

interface SystemSettingsFormProps {
  initialSettings: Record<string, unknown>
}

export function SystemSettingsForm({ initialSettings }: SystemSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [maxClientsPerCoach, setMaxClientsPerCoach] = useState(
    (initialSettings.maxClientsPerCoach as number) ?? 20
  )
  const [healthkitEnabled, setHealthkitEnabled] = useState(
    (initialSettings.healthkitEnabled as boolean) ?? false
  )
  const [iosIntegrationEnabled, setIosIntegrationEnabled] = useState(
    (initialSettings.iosIntegrationEnabled as boolean) ?? false
  )
  const [defaultProteinPercent, setDefaultProteinPercent] = useState(
    (initialSettings.defaultProteinPercent as number) ?? 30
  )
  const [defaultCarbsPercent, setDefaultCarbsPercent] = useState(
    (initialSettings.defaultCarbsPercent as number) ?? 40
  )
  const [defaultFatPercent, setDefaultFatPercent] = useState(
    (initialSettings.defaultFatPercent as number) ?? 30
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateSystemSettings({
        maxClientsPerCoach,
        healthkitEnabled,
        iosIntegrationEnabled,
        defaultProteinPercent,
        defaultCarbsPercent,
        defaultFatPercent,
      })
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coach Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxClientsPerCoach">Max Clients per Coach</Label>
            <Input
              id="maxClientsPerCoach"
              type="number"
              min={1}
              value={maxClientsPerCoach}
              onChange={(e) => setMaxClientsPerCoach(Number(e.target.value))}
              aria-describedby="maxClientsPerCoach-desc"
            />
            <p id="maxClientsPerCoach-desc" className="text-sm text-muted-foreground">
              Maximum number of clients a single coach can manage
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="healthkitEnabled"
              checked={healthkitEnabled}
              onChange={(e) => setHealthkitEnabled(e.target.checked)}
              className="h-4 w-4"
              aria-label="Enable HealthKit integration"
            />
            <Label htmlFor="healthkitEnabled">Enable HealthKit Integration</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="iosIntegrationEnabled"
              checked={iosIntegrationEnabled}
              onChange={(e) => setIosIntegrationEnabled(e.target.checked)}
              className="h-4 w-4"
              aria-label="Enable iOS integration"
            />
            <Label htmlFor="iosIntegrationEnabled">Enable iOS Integration</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Macro Split</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="defaultProteinPercent">Protein %</Label>
            <Input
              id="defaultProteinPercent"
              type="number"
              min={0}
              max={100}
              value={defaultProteinPercent}
              onChange={(e) => setDefaultProteinPercent(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultCarbsPercent">Carbs %</Label>
            <Input
              id="defaultCarbsPercent"
              type="number"
              min={0}
              max={100}
              value={defaultCarbsPercent}
              onChange={(e) => setDefaultCarbsPercent(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultFatPercent">Fat %</Label>
            <Input
              id="defaultFatPercent"
              type="number"
              min={0}
              max={100}
              value={defaultFatPercent}
              onChange={(e) => setDefaultFatPercent(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {success && (
        <div role="status" aria-live="polite" className="text-green-600 text-sm">
          Settings saved successfully
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  )
}
