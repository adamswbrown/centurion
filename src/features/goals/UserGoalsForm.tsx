"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { upsertUserGoals, type UserGoalsInput } from "@/app/actions/goals"

interface UserGoalsFormProps {
  initialValues: {
    currentWeightKg: number | null
    targetWeightKg: number | null
    heightCm: number | null
    dailyCaloriesKcal: number | null
    proteinGrams: number | null
    carbGrams: number | null
    fatGrams: number | null
    waterIntakeMl: number | null
    dailyStepsTarget: number | null
    weeklyWorkoutMinutes: number | null
  } | null
  weightUnit?: "lbs" | "kg"
  measurementUnit?: "inches" | "cm"
}

function toDisplay(val: number | null, converter: (v: number) => number): string {
  if (val == null) return ""
  return String(Number(converter(val).toFixed(1)))
}

function fromDisplay(val: string, converter: (v: number) => number): number | null {
  if (!val || val.trim() === "") return null
  const num = parseFloat(val)
  if (isNaN(num)) return null
  return Number(converter(num).toFixed(2))
}

// Conversion helpers
const kgToLbs = (kg: number) => kg / 0.453592
const lbsToKg = (lbs: number) => lbs * 0.453592
const cmToInches = (cm: number) => cm / 2.54
const inchesToCm = (inches: number) => inches * 2.54

export function UserGoalsForm({ initialValues, weightUnit = "lbs", measurementUnit = "inches" }: UserGoalsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const weightConvert = weightUnit === "lbs" ? kgToLbs : (v: number) => v
  const weightToKg = weightUnit === "lbs" ? lbsToKg : (v: number) => v
  const heightConvert = measurementUnit === "inches" ? cmToInches : (v: number) => v
  const heightToCm = measurementUnit === "inches" ? inchesToCm : (v: number) => v

  const [currentWeight, setCurrentWeight] = useState(
    toDisplay(initialValues?.currentWeightKg ?? null, weightConvert)
  )
  const [targetWeight, setTargetWeight] = useState(
    toDisplay(initialValues?.targetWeightKg ?? null, weightConvert)
  )
  const [height, setHeight] = useState(
    toDisplay(initialValues?.heightCm ?? null, heightConvert)
  )
  const [dailyCalories, setDailyCalories] = useState(
    initialValues?.dailyCaloriesKcal?.toString() ?? ""
  )
  const [protein, setProtein] = useState(
    initialValues?.proteinGrams?.toString() ?? ""
  )
  const [carbs, setCarbs] = useState(
    initialValues?.carbGrams?.toString() ?? ""
  )
  const [fat, setFat] = useState(
    initialValues?.fatGrams?.toString() ?? ""
  )
  const [water, setWater] = useState(
    initialValues?.waterIntakeMl?.toString() ?? ""
  )
  const [steps, setSteps] = useState(
    initialValues?.dailyStepsTarget?.toString() ?? ""
  )
  const [workoutMinutes, setWorkoutMinutes] = useState(
    initialValues?.weeklyWorkoutMinutes?.toString() ?? ""
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const input: UserGoalsInput = {
        currentWeightKg: fromDisplay(currentWeight, weightToKg),
        targetWeightKg: fromDisplay(targetWeight, weightToKg),
        heightCm: fromDisplay(height, heightToCm),
        dailyCaloriesKcal: dailyCalories ? parseInt(dailyCalories, 10) || null : null,
        proteinGrams: protein ? parseFloat(protein) || null : null,
        carbGrams: carbs ? parseFloat(carbs) || null : null,
        fatGrams: fat ? parseFloat(fat) || null : null,
        waterIntakeMl: water ? parseInt(water, 10) || null : null,
        dailyStepsTarget: steps ? parseInt(steps, 10) || null : null,
        weeklyWorkoutMinutes: workoutMinutes ? parseInt(workoutMinutes, 10) || null : null,
      }

      const result = await upsertUserGoals(input)
      if (result && "error" in result) {
        setError(result.error as string)
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goals")
    } finally {
      setLoading(false)
    }
  }

  const weightLabel = weightUnit === "lbs" ? "lbs" : "kg"
  const heightLabel = measurementUnit === "inches" ? "inches" : "cm"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weight Goals</CardTitle>
          <CardDescription>Set your current and target weight.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentWeight">Current Weight ({weightLabel})</Label>
              <Input
                id="currentWeight"
                type="number"
                step="0.1"
                min="0"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder={`e.g. ${weightUnit === "lbs" ? "165" : "75"}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target Weight ({weightLabel})</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                min="0"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={`e.g. ${weightUnit === "lbs" ? "155" : "70"}`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height ({heightLabel})</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              min="0"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={`e.g. ${measurementUnit === "inches" ? "68" : "173"}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition Goals</CardTitle>
          <CardDescription>Set your daily nutrition targets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dailyCalories">Daily Calories (kcal)</Label>
            <Input
              id="dailyCalories"
              type="number"
              min="0"
              value={dailyCalories}
              onChange={(e) => setDailyCalories(e.target.value)}
              placeholder="e.g. 2000"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                min="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="e.g. 150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="0.1"
                min="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="e.g. 200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                min="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="e.g. 65"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="water">Daily Water Intake (ml)</Label>
            <Input
              id="water"
              type="number"
              min="0"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              placeholder="e.g. 2500"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Goals</CardTitle>
          <CardDescription>Set your daily steps and weekly workout targets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="steps">Daily Steps Target</Label>
              <Input
                id="steps"
                type="number"
                min="0"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workoutMinutes">Weekly Workout Minutes</Label>
              <Input
                id="workoutMinutes"
                type="number"
                min="0"
                value={workoutMinutes}
                onChange={(e) => setWorkoutMinutes(e.target.value)}
                placeholder="e.g. 150"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {success && (
        <div role="status" aria-live="polite" className="text-green-600 text-sm">
          Goals saved successfully
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Saving..." : "Save Goals"}
      </Button>
    </form>
  )
}
