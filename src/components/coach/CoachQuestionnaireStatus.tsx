"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuestionnaireStatusForCoach } from "@/hooks/useQuestionnaires"
import { useCoachCohorts } from "@/hooks/useReviewQueue"
import { format } from "date-fns"

export function CoachQuestionnaireStatus() {
  const { data: cohorts } = useCoachCohorts()
  const [selectedCohortId, setSelectedCohortId] = useState<number | undefined>(undefined)
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined)

  const { data: statusRows, isLoading } = useQuestionnaireStatusForCoach(
    selectedCohortId,
    selectedWeek
  )

  const statusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="default">Completed</Badge>
      case "IN_PROGRESS":
        return <Badge variant="outline" className="border-amber-300 text-amber-700">In Progress</Badge>
      case "NOT_STARTED":
        return <Badge variant="outline" className="border-red-300 text-red-700">Not Started</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Summary counts
  const completed = statusRows?.filter((r) => r.status === "COMPLETED").length || 0
  const inProgress = statusRows?.filter((r) => r.status === "IN_PROGRESS").length || 0
  const notStarted = statusRows?.filter((r) => r.status === "NOT_STARTED").length || 0
  const total = statusRows?.length || 0

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {cohorts && cohorts.length > 0 && (
          <Select
            value={selectedCohortId?.toString() || "all"}
            onValueChange={(v) => setSelectedCohortId(v === "all" ? undefined : Number(v))}
          >
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="All cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cohorts</SelectItem>
              {cohorts.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name} ({c.memberCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={selectedWeek?.toString() || "all"}
          onValueChange={(v) => setSelectedWeek(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder="All weeks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All weeks</SelectItem>
            {[1, 2, 3, 4, 5, 6].map((w) => (
              <SelectItem key={w} value={w.toString()}>
                Week {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {total > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completed}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((completed / total) * 100)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Not Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{notStarted}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : !statusRows || statusRows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active questionnaires found. Create questionnaire bundles in the admin panel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Member</th>
                    <th className="text-left p-3 font-medium">Cohort</th>
                    <th className="text-right p-3 font-medium">Week</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Submitted</th>
                    <th className="text-right p-3 font-medium">Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {statusRows.map((row, idx) => (
                    <tr key={`${row.memberId}-${row.weekNumber}-${idx}`} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{row.memberName || row.memberEmail}</div>
                        {row.memberName && (
                          <div className="text-xs text-muted-foreground">{row.memberEmail}</div>
                        )}
                      </td>
                      <td className="p-3 text-sm">{row.cohortName}</td>
                      <td className="p-3 text-right text-sm">Week {row.weekNumber}</td>
                      <td className="p-3">{statusBadge(row.status)}</td>
                      <td className="p-3 text-sm">
                        {row.submittedAt
                          ? format(new Date(row.submittedAt), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="p-3 text-right text-sm">{row.responseCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
