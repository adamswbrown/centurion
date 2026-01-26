"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useComplianceReport } from "@/hooks/useReports"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

/**
 * ComplianceReport - Questionnaire compliance visualization
 * Generated with Claude Code
 */

export function ComplianceReport() {
  const { data, isLoading } = useComplianceReport()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Transform data for stacked bar chart
  const chartData = data.responsesByWeek.map((w) => ({
    week: `Week ${w.weekNumber}`,
    completed: w.completed,
    pending: w.pending,
    total: w.total,
  }))

  const getComplianceBadge = (rate: number) => {
    if (rate >= 80) {
      return <Badge className="bg-green-100 text-green-800">{rate.toFixed(0)}%</Badge>
    }
    if (rate >= 50) {
      return <Badge className="bg-amber-100 text-amber-800">{rate.toFixed(0)}%</Badge>
    }
    return <Badge className="bg-red-100 text-red-800">{rate.toFixed(0)}%</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Questionnaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalQuestionnaires}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.completedResponses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.pendingResponses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.completionRate >= 80
                  ? "text-green-600"
                  : data.completionRate >= 50
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {data.completionRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Week Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Completion by Week</CardTitle>
          <CardDescription>Questionnaire completion status per week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Compliance</CardTitle>
          <CardDescription>Questionnaire completion rates by cohort</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Cohort</th>
                  <th className="text-right p-2 font-medium">Members</th>
                  <th className="text-right p-2 font-medium">Completion Rate</th>
                  <th className="text-right p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.cohortCompliance.map((cohort) => (
                  <tr key={cohort.cohortId} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{cohort.cohortName}</td>
                    <td className="p-2 text-right">{cohort.memberCount}</td>
                    <td className="p-2 text-right">{cohort.avgCompletionRate.toFixed(1)}%</td>
                    <td className="p-2 text-right">
                      {getComplianceBadge(cohort.avgCompletionRate)}
                    </td>
                  </tr>
                ))}
                {data.cohortCompliance.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No questionnaire data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Insights */}
      {data.cohortCompliance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Low compliance warning */}
              {data.cohortCompliance.filter((c) => c.avgCompletionRate < 50).length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-red-800">Low Compliance Alert</div>
                  <div className="text-sm text-red-600 mt-1">
                    {data.cohortCompliance.filter((c) => c.avgCompletionRate < 50).length} cohort(s)
                    have completion rates below 50%. Consider sending reminders.
                  </div>
                </div>
              )}

              {/* High performers */}
              {data.cohortCompliance.filter((c) => c.avgCompletionRate >= 80).length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-800">High Performers</div>
                  <div className="text-sm text-green-600 mt-1">
                    {data.cohortCompliance.filter((c) => c.avgCompletionRate >= 80).length} cohort(s)
                    are meeting the 80% completion target.
                  </div>
                </div>
              )}

              {/* Overall status */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-800">Overall Status</div>
                <div className="text-sm text-blue-600 mt-1">
                  {data.completedResponses} of {data.completedResponses + data.pendingResponses} expected
                  responses completed ({data.completionRate.toFixed(1)}%)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
