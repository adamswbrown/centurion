"use client"

import { useWeeklyResponses } from "@/hooks/useQuestionnaires"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface QuestionnaireResponseListProps {
  cohortId: number
  weekNumber: number
}

export function QuestionnaireResponseList({ cohortId, weekNumber }: QuestionnaireResponseListProps) {
  const { data: bundle, isLoading } = useWeeklyResponses(cohortId, weekNumber)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-muted-foreground">Loading responses...</p>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Week {weekNumber} Responses</h2>
        <p className="text-muted-foreground">
          No questionnaire bundle found for this week.
        </p>
      </div>
    )
  }

  const responses = bundle.responses || []

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">
        Week {weekNumber} Responses ({responses.length})
      </h2>

      {responses.length === 0 ? (
        <p className="text-muted-foreground">No responses submitted yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">
                    {response.user.name || response.user.email}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        response.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {response.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {response.updatedAt
                      ? format(new Date(response.updatedAt), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      View Details
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
