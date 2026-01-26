"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useQuestionnaires } from "@/hooks/useQuestionnaires"

/**
 * WeeklyQuestionnaireReport - Display questionnaire completion status
 * Generated with Claude Code
 */

interface WeeklyQuestionnaireReportProps {
  cohortId?: number
}

export function WeeklyQuestionnaireReport({ cohortId }: WeeklyQuestionnaireReportProps) {
  const { data: questionnaires, isLoading } = useQuestionnaires()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Questionnaires</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const filteredQuestionnaires = cohortId
    ? questionnaires?.filter((q) => q.cohortId === cohortId)
    : questionnaires

  const completionRate = filteredQuestionnaires && filteredQuestionnaires.length > 0
    ? (filteredQuestionnaires.filter((q) => q._count?.responses ?? 0 > 0).length /
        filteredQuestionnaires.length) *
      100
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weekly Questionnaires</CardTitle>
            <CardDescription>
              Track questionnaire completion across cohorts
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {completionRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Completion Rate</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredQuestionnaires || filteredQuestionnaires.length === 0 ? (
          <p className="text-sm text-gray-500">No active questionnaires</p>
        ) : (
          <div className="space-y-3">
            {filteredQuestionnaires.map((questionnaire) => {
              const responseCount = questionnaire._count?.responses ?? 0
              const isActive = questionnaire.isActive ?? false

              return (
                <div
                  key={questionnaire.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      Week {questionnaire.weekNumber}
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      <span className="text-sm text-gray-600">
                        {responseCount} responses
                      </span>
                    </div>
                  </div>

                  {questionnaire.cohort && (
                    <div className="text-sm text-gray-600">
                      Cohort: {questionnaire.cohort.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
