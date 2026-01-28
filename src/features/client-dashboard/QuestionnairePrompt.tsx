"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, CheckCircle, Circle, Clock } from "lucide-react"
import Link from "next/link"

interface QuestionnaireStatus {
  cohortId: number
  cohortName: string
  currentWeek: number
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  bundleId: number | null
}

interface QuestionnairePromptProps {
  questionnaireStatus: QuestionnaireStatus[]
}

export function QuestionnairePrompt({ questionnaireStatus }: QuestionnairePromptProps) {
  const incomplete = questionnaireStatus.filter((q) => q.status !== "COMPLETED")
  const completed = questionnaireStatus.filter((q) => q.status === "COMPLETED")

  if (questionnaireStatus.length === 0) {
    return null
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">Weekly Questionnaire</CardTitle>
        </div>
        <CardDescription>
          Complete your weekly check-in to help your coach track your progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {incomplete.map((q) => (
          <div
            key={q.cohortId}
            className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {q.status === "IN_PROGRESS" ? (
                <Clock className="h-5 w-5 text-amber-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{q.cohortName}</p>
                <p className="text-sm text-muted-foreground">
                  Week {q.currentWeek}
                  {q.status === "IN_PROGRESS" && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      In Progress
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href={`/client/questionnaires/${q.cohortId}/${q.currentWeek}`}>
                {q.status === "IN_PROGRESS" ? "Continue" : "Start"}
              </Link>
            </Button>
          </div>
        ))}

        {completed.length > 0 && (
          <div className="pt-2 border-t">
            {completed.map((q) => (
              <div
                key={q.cohortId}
                className="flex items-center gap-3 p-2 text-sm text-muted-foreground"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  {q.cohortName} Week {q.currentWeek} — Completed
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
