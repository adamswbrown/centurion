import { format as formatDateFns } from "date-fns"

// ============================================
// Weight Conversions
// ============================================

export function lbsToKg(lbs: number): number {
  return lbs * 0.453592
}

export function kgToLbs(kg: number): number {
  return kg / 0.453592
}

// ============================================
// Length Conversions
// ============================================

export function inchesToCm(inches: number): number {
  return inches * 2.54
}

export function cmToInches(cm: number): number {
  return cm / 2.54
}

// ============================================
// Display Helpers
// ============================================

/**
 * Format a weight value for display.
 * Values are stored in kg internally. Convert to lbs if user prefers lbs.
 */
export function formatWeight(valueKg: number, unit: "lbs" | "kg"): string {
  if (unit === "lbs") {
    const lbs = kgToLbs(valueKg)
    return `${lbs.toFixed(1)} lbs`
  }
  return `${valueKg.toFixed(1)} kg`
}

/**
 * Format a height value for display.
 * Values are stored in cm internally. Convert to inches if user prefers inches.
 */
export function formatHeight(valueCm: number, unit: "inches" | "cm"): string {
  if (unit === "inches") {
    const inches = cmToInches(valueCm)
    return `${inches.toFixed(1)} in`
  }
  return `${valueCm.toFixed(1)} cm`
}

/**
 * Convert a weight from the user's display unit to kg for storage.
 */
export function toKg(value: number, fromUnit: "lbs" | "kg"): number {
  return fromUnit === "lbs" ? lbsToKg(value) : value
}

/**
 * Convert a weight from kg to the user's display unit.
 */
export function fromKg(valueKg: number, toUnit: "lbs" | "kg"): number {
  return toUnit === "lbs" ? kgToLbs(valueKg) : valueKg
}

/**
 * Convert a height from the user's display unit to cm for storage.
 */
export function toCm(value: number, fromUnit: "inches" | "cm"): number {
  return fromUnit === "inches" ? inchesToCm(value) : value
}

/**
 * Convert a height from cm to the user's display unit.
 */
export function fromCm(valueCm: number, toUnit: "inches" | "cm"): number {
  return toUnit === "inches" ? cmToInches(valueCm) : valueCm
}

/**
 * Format a date using the user's preferred date format.
 */
export function formatDate(date: Date | string, dateFormat: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDateFns(d, dateFormat)
}

// ============================================
// BMI Calculations (M7/M8)
// ============================================

/**
 * Calculate BMI from weight (lbs) and height (inches).
 * Formula: BMI = (weight in lbs / (height in inches)^2) * 703
 */
export function calculateBMI(weightLbs: number, heightInches: number): number {
  if (heightInches <= 0 || weightLbs <= 0) return 0
  return (weightLbs / (heightInches * heightInches)) * 703
}

/**
 * Calculate BMI from metric units.
 * Formula: BMI = weight (kg) / (height (m))^2
 */
export function calculateBMIMetric(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

/**
 * Get BMI category label.
 */
export function getBMICategory(bmi: number): string {
  if (bmi <= 0) return "N/A"
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

// ============================================
// Temperature Conversions
// ============================================

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9)
}

export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32
}

// ============================================
// Distance Conversions
// ============================================

export function milesToKm(miles: number): number {
  return miles * 1.60934
}

export function kmToMiles(km: number): number {
  return km / 1.60934
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084
}

export function feetToMeters(feet: number): number {
  return feet / 3.28084
}
