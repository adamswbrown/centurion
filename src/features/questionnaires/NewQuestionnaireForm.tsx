"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuestionnaireBuilder } from "./QuestionnaireBuilder"
import { createQuestionnaireBundle } from "@/app/actions/questionnaires"
import { DEFAULT_TEMPLATES } from "@/lib/default-questionnaire-templates"

interface Cohort {
  id: number
  name: string
}

interface NewQuestionnaireFormProps {
  cohorts: Cohort[]
  preselectedCohortId?: number
}

type WeekKey = "week1" | "week2" | "week3" | "week4" | "week5" | "week6"

export function NewQuestionnaireForm({
  cohorts,
  preselectedCohortId,
}: NewQuestionnaireFormProps) {
  const router = useRouter()
  const [cohortId, setCohortId] = useState<number | undefined>(preselectedCohortId)
  const [weekNumber, setWeekNumber] = useState<number>(1)
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>("week1")
  const [bundle, setBundle] = useState(DEFAULT_TEMPLATES)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!cohortId) {
      setError("Please select a cohort")
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Save the current week's questionnaire
      const weekKey = `week${weekNumber}` as WeekKey
      const questions = bundle[weekKey]

      await createQuestionnaireBundle({
        cohortId,
        weekNumber,
        questions,
      })

      router.push("/admin/questionnaires")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create questionnaire")
    } finally {
      setSaving(false)
    }
  }

  const handleWeekChange = (week: WeekKey) => {
    setSelectedWeek(week)
    // Also sync the weekNumber for saving
    setWeekNumber(parseInt(week.replace("week", "")))
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bundle Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cohort</Label>
              <Select
                value={cohortId?.toString()}
                onValueChange={(v) => setCohortId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id.toString()}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Week Number</Label>
              <Select
                value={weekNumber.toString()}
                onValueChange={(v) => {
                  const num = Number(v)
                  setWeekNumber(num)
                  setSelectedWeek(`week${num}` as WeekKey)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionnaireBuilder
            bundle={bundle}
            onChange={setBundle}
            selectedWeek={selectedWeek}
            onWeekChange={handleWeekChange}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/questionnaires")}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !cohortId}>
          {saving ? "Saving..." : "Create Bundle"}
        </Button>
      </div>
    </div>
  )
}
