"use client"

import { useState, useCallback } from "react"
import { Model } from "survey-core"
import { Button } from "@/components/ui/button"
import { SurveyContainer } from "@/components/questionnaires/SurveyContainer"
import { useQuestionnaireResponse, useUpsertQuestionnaireResponse } from "@/hooks/useQuestionnaires"
import { format } from "date-fns"

interface QuestionnaireViewerProps {
  cohortId: number
  weekNumber: number
}

export function QuestionnaireViewer({ cohortId, weekNumber }: QuestionnaireViewerProps) {
  const { data, isLoading } = useQuestionnaireResponse(cohortId, weekNumber)
  const { mutate: upsertResponse, isPending } = useUpsertQuestionnaireResponse()
  const [responses, setResponses] = useState<any>({})
  const [hasChanges, setHasChanges] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-muted-foreground">Loading questionnaire...</p>
      </div>
    )
  }

  if (!data || !data.bundle) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Week {weekNumber} Questionnaire</h2>
        <p className="text-muted-foreground">
          No questionnaire available for this week yet.
        </p>
      </div>
    )
  }

  const { bundle, response, currentWeek } = data
  const isLocked = response?.status === "COMPLETED" || weekNumber < currentWeek
  const isNotAvailableYet = weekNumber > currentWeek

  // Parse SurveyJS JSON schema from questions field
  const surveyJson = typeof bundle.questions === "string"
    ? JSON.parse(bundle.questions)
    : bundle.questions

  // Handle survey completion
  const handleComplete = useCallback((sender: Model) => {
    const surveyData = sender.data
    upsertResponse({
      bundleId: bundle.id,
      weekNumber,
      responses: surveyData,
      status: "COMPLETED",
    })
  }, [bundle.id, weekNumber, upsertResponse])

  // Handle value changes for auto-save
  const handleValueChanged = useCallback((sender: Model) => {
    setResponses(sender.data)
    setHasChanges(true)
  }, [])

  const handleSave = () => {
    upsertResponse({
      bundleId: bundle.id,
      weekNumber,
      responses,
      status: "IN_PROGRESS",
    })
    setHasChanges(false)
  }

  if (isNotAvailableYet) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Week {weekNumber} Questionnaire</h2>
        <p className="text-muted-foreground">
          This questionnaire will be available in Week {weekNumber}.
          Current week: {currentWeek}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Week {weekNumber} Questionnaire</h2>
        {isLocked && response?.updatedAt && (
          <p className="text-sm text-muted-foreground mt-1">
            Submitted on {format(new Date(response.updatedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </div>

      {isLocked && (
        <div className="bg-muted/50 border rounded-md p-4 mb-6">
          <p className="text-sm font-medium">Questionnaire Locked</p>
          <p className="text-sm text-muted-foreground">
            This questionnaire has been submitted and is now read-only.
          </p>
        </div>
      )}

      <SurveyContainer
        surveyJson={surveyJson}
        initialData={response?.responses as Record<string, any> | undefined}
        readOnly={isLocked}
        onComplete={handleComplete}
        onValueChanged={handleValueChanged}
      />

      {!isLocked && hasChanges && (
        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} variant="outline" disabled={isPending}>
            {isPending ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      )}
    </div>
  )
}
