"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateUserPreferences, type UserPreferenceInput } from "@/app/actions/preferences"

interface UserPreferencesFormProps {
  initialValues: {
    weightUnit: string
    measurementUnit: string
    dateFormat: string
  }
}

export function UserPreferencesForm({ initialValues }: UserPreferencesFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [weightUnit, setWeightUnit] = useState(initialValues.weightUnit)
  const [measurementUnit, setMeasurementUnit] = useState(initialValues.measurementUnit)
  const [dateFormat, setDateFormat] = useState(initialValues.dateFormat)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const input: UserPreferenceInput = {
        weightUnit: weightUnit as "lbs" | "kg",
        measurementUnit: measurementUnit as "inches" | "cm",
        dateFormat: dateFormat as "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd",
      }

      const result = await updateUserPreferences(input)
      if (result && "error" in result) {
        setError(result.error as string)
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences")
    } finally {
      setLoading(false)
    }
  }

  // Preview of date format
  const now = new Date()
  const previewDate = (() => {
    try {
      if (dateFormat === "dd/MM/yyyy") {
        return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
      }
      if (dateFormat === "yyyy-MM-dd") {
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      }
      return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`
    } catch {
      return "--"
    }
  })()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>
            Choose how weights, measurements, and dates are displayed throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weightUnit">Weight Unit</Label>
            <Select value={weightUnit} onValueChange={setWeightUnit}>
              <SelectTrigger id="weightUnit">
                <SelectValue placeholder="Select weight unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="measurementUnit">Measurement Unit</Label>
            <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
              <SelectTrigger id="measurementUnit">
                <SelectValue placeholder="Select measurement unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inches">Inches</SelectItem>
                <SelectItem value="cm">Centimeters (cm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger id="dateFormat">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (US)</SelectItem>
                <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (UK/EU)</SelectItem>
                <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (ISO)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Preview: {previewDate}
            </p>
          </div>
        </CardContent>
      </Card>

      {success && (
        <div role="status" aria-live="polite" className="text-green-600 text-sm">
          Preferences saved successfully
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  )
}
