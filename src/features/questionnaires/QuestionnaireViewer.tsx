"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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

  const handleSubmit = () => {
    upsertResponse({
      bundleId: bundle.id,
      weekNumber,
      responses,
      status: "COMPLETED",
    })
  }

  const handleSave = () => {
    upsertResponse({
      bundleId: bundle.id,
      weekNumber,
      responses,
      status: "IN_PROGRESS",
    })
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

      <div className="mb-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p className="text-sm font-medium">SurveyJS Integration Required</p>
          <p className="text-sm">
            To enable full questionnaire functionality, install survey-core and survey-react-ui packages.
            This placeholder shows the questionnaire structure.
          </p>
        </div>
      </div>

      {response && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">Previous Responses:</h3>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto">
            {JSON.stringify(response.responses, null, 2)}
          </pre>
        </div>
      )}

      {!isLocked && (
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="outline" disabled={isPending}>
            Save Progress
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Questionnaire"}
          </Button>
        </div>
      )}
    </div>
  )
}
