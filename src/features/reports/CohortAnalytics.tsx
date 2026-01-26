"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCohortReport } from "@/hooks/useReports"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

/**
 * CohortAnalytics - Cohort performance and status visualization
 * Generated with Claude Code
 */

export function CohortAnalytics() {
  const { data, isLoading } = useCohortReport()

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

  // Chart data for cohort engagement
  const chartData = data.cohortBreakdown.slice(0, 10).map((c) => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
    members: c.memberCount,
    engagement: c.avgEngagement,
  }))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "COMPLETED":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case "ARCHIVED":
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCohorts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.activeCohorts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.completedCohorts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Engagement</CardTitle>
          <CardDescription>Member count and engagement rate by cohort</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "engagement" ? `${value.toFixed(1)}%` : value,
                    name === "engagement" ? "Engagement Rate" : "Members",
                  ]}
                />
                <Bar dataKey="engagement" fill="hsl(var(--primary))" name="engagement" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Breakdown</CardTitle>
          <CardDescription>Detailed view of all cohorts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Cohort</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-right p-2 font-medium">Members</th>
                  <th className="text-right p-2 font-medium">Engagement</th>
                  <th className="text-left p-2 font-medium">Start Date</th>
                  <th className="text-left p-2 font-medium">End Date</th>
                </tr>
              </thead>
              <tbody>
                {data.cohortBreakdown.map((cohort) => (
                  <tr key={cohort.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{cohort.name}</td>
                    <td className="p-2">{getStatusBadge(cohort.status)}</td>
                    <td className="p-2 text-right">{cohort.memberCount}</td>
                    <td className="p-2 text-right">
                      <span
                        className={
                          cohort.avgEngagement >= 70
                            ? "text-green-600"
                            : cohort.avgEngagement >= 40
                            ? "text-amber-600"
                            : "text-red-600"
                        }
                      >
                        {cohort.avgEngagement.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2">{format(new Date(cohort.startDate), "MMM d, yyyy")}</td>
                    <td className="p-2">
                      {cohort.endDate ? format(new Date(cohort.endDate), "MMM d, yyyy") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
