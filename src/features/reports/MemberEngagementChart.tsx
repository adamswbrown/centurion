"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMemberEngagementReport } from "@/hooks/useReports"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

/**
 * MemberEngagementChart - Visualize member engagement metrics
 * Generated with Claude Code
 */

const STATUS_COLORS = {
  ACTIVE: "#22c55e",
  PAUSED: "#f59e0b",
  INACTIVE: "#ef4444",
}

export function MemberEngagementChart() {
  const { data, isLoading } = useMemberEngagementReport()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Check-in Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in Trend</CardTitle>
          <CardDescription>Daily check-ins over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.checkInTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  formatter={(value: number) => [value, "Check-ins"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Member Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Member Status</CardTitle>
          <CardDescription>
            {data.activeMembers} active, {data.inactiveMembers} inactive of {data.totalMembers} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.membersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                  label={({ status, count, percent }) =>
                    `${status}: ${count} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {data.membersByStatus.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || "#8884d8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Engagement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{data.totalMembers}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{data.activeMembers}</div>
              <div className="text-sm text-muted-foreground">Active (7 days)</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{data.newMembersThisMonth}</div>
              <div className="text-sm text-muted-foreground">New This Month</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {data.avgCheckInsPerMember.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Check-ins/Member</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
