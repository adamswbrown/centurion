"use client"

import { useState, useEffect, useCallback } from "react"
import { getUserPreferences } from "@/app/actions/preferences"
import { formatWeight, formatHeight, formatDate, fromKg, fromCm } from "@/lib/unit-conversions"

interface Preferences {
  weightUnit: "lbs" | "kg"
  measurementUnit: "inches" | "cm"
  dateFormat: string
}

const DEFAULT_PREFERENCES: Preferences = {
  weightUnit: "lbs",
  measurementUnit: "inches",
  dateFormat: "MM/dd/yyyy",
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const prefs = await getUserPreferences()
        setPreferences({
          weightUnit: (prefs.weightUnit as "lbs" | "kg") || DEFAULT_PREFERENCES.weightUnit,
          measurementUnit: (prefs.measurementUnit as "inches" | "cm") || DEFAULT_PREFERENCES.measurementUnit,
          dateFormat: prefs.dateFormat || DEFAULT_PREFERENCES.dateFormat,
        })
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const displayWeight = useCallback(
    (valueInKg: number | null | undefined): string => {
      if (valueInKg == null) return "--"
      return formatWeight(valueInKg, preferences.weightUnit)
    },
    [preferences.weightUnit]
  )

  const displayHeight = useCallback(
    (valueInCm: number | null | undefined): string => {
      if (valueInCm == null) return "--"
      return formatHeight(valueInCm, preferences.measurementUnit)
    },
    [preferences.measurementUnit]
  )

  const displayDate = useCallback(
    (date: Date | string | null | undefined): string => {
      if (!date) return "--"
      return formatDate(date, preferences.dateFormat)
    },
    [preferences.dateFormat]
  )

  const weightValue = useCallback(
    (valueInKg: number | null | undefined): number | null => {
      if (valueInKg == null) return null
      return Number(fromKg(valueInKg, preferences.weightUnit).toFixed(1))
    },
    [preferences.weightUnit]
  )

  const heightValue = useCallback(
    (valueInCm: number | null | undefined): number | null => {
      if (valueInCm == null) return null
      return Number(fromCm(valueInCm, preferences.measurementUnit).toFixed(1))
    },
    [preferences.measurementUnit]
  )

  return {
    preferences,
    loading,
    displayWeight,
    displayHeight,
    displayDate,
    weightValue,
    heightValue,
  }
}
