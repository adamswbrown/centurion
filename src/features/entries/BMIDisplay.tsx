"use client"

import { cn } from "@/lib/utils"

interface BMIDisplayProps {
  weightLbs: number
  heightInches: number
  className?: string
}

/**
 * Calculate BMI from weight (lbs) and height (inches).
 * Formula: BMI = (weight in lbs / (height in inches)^2) * 703
 */
export function calculateBMI(weightLbs: number, heightInches: number): number {
  if (heightInches <= 0) return 0
  return (weightLbs / (heightInches * heightInches)) * 703
}

/**
 * Get BMI category label and color
 */
export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" }
  if (bmi < 25) return { label: "Normal", color: "text-green-600" }
  if (bmi < 30) return { label: "Overweight", color: "text-yellow-600" }
  return { label: "Obese", color: "text-red-600" }
}

export function BMIDisplay({ weightLbs, heightInches, className }: BMIDisplayProps) {
  const bmi = calculateBMI(weightLbs, heightInches)
  const { label, color } = getBMICategory(bmi)

  if (bmi <= 0) return null

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="text-muted-foreground">BMI:</span>
      <span className="font-medium">{bmi.toFixed(1)}</span>
      <span className={cn("text-xs font-medium", color)}>({label})</span>
    </div>
  )
}
