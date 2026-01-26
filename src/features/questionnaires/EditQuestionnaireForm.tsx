"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestionnaireBuilder } from "./QuestionnaireBuilder"
import { updateQuestionnaireBundle } from "@/app/actions/questionnaires"
import { DEFAULT_TEMPLATES } from "@/lib/default-questionnaire-templates"

type WeekKey = "week1" | "week2" | "week3" | "week4" | "week5" | "week6"

interface EditQuestionnaireFormProps {
  cohortId: number
  cohortName: string
  weekNumber: number
  initialQuestions: unknown
}

export function EditQuestionnaireForm({
  cohortId,
  cohortName,
  weekNumber,
  initialQuestions,
}: EditQuestionnaireFormProps) {
  const router = useRouter()
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>(
    `week${weekNumber}` as WeekKey
  )
  // Initialize bundle with default templates and overlay the saved questions for this week
  const [bundle, setBundle] = useState(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base: Record<string, any> = { ...DEFAULT_TEMPLATES }
    const weekKey = `week${weekNumber}` as WeekKey
    if (initialQuestions) {
      base[weekKey] = initialQuestions
    }
    return base
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const weekKey = `week${weekNumber}` as WeekKey
      const questions = bundle[weekKey]

      await updateQuestionnaireBundle(cohortId, weekNumber, questions)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update questionnaire")
    } finally {
      setSaving(false)
    }
  }

  const handleWeekChange = (week: WeekKey) => {
    // When switching weeks in the editor, we need to navigate to the new week
    const newWeekNumber = parseInt(week.replace("week", ""))
    router.push(`/admin/questionnaires/${cohortId}?week=${newWeekNumber}`)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Questionnaire saved successfully!
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Editing Week {weekNumber}</CardTitle>
            <Badge variant="secondary">{cohortName}</Badge>
          </div>
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
