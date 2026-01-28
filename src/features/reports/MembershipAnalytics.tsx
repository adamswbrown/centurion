"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMembershipReport } from "@/hooks/useReports"
import {
  BarChart,
  Bar,
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

const TYPE_COLORS: Record<string, string> = {
  RECURRING: "#3b82f6",
  PACK: "#8b5cf6",
  PREPAID: "#22c55e",
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"]

export function MembershipAnalytics() {
  const { data, isLoading } = useMembershipReport()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-5 w-40 bg-muted animate-pulse rounded" />
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

  const totalMemberships = data.totalActiveMemberships + data.totalPausedMemberships + data.totalCancelledMemberships

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "RECURRING":
        return <Badge className="bg-blue-100 text-blue-800">Recurring</Badge>
      case "PACK":
        return <Badge className="bg-purple-100 text-purple-800">Pack</Badge>
      case "PREPAID":
        return <Badge className="bg-green-100 text-green-800">Prepaid</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.totalActiveMemberships}</div>
            <p className="text-xs text-muted-foreground">
              {totalMemberships} total memberships
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paused Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.totalPausedMemberships}</div>
            <p className="text-xs text-muted-foreground">
              May reactivate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.churnRate > 10 ? "text-red-600" : data.churnRate > 5 ? "text-amber-600" : "text-green-600"}`}>
              {data.churnRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Sessions/Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageSessionsPerMember.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Memberships by Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Memberships by Type</CardTitle>
            <CardDescription>Distribution of membership plan types</CardDescription>
          </CardHeader>
          <CardContent>
            {data.membershipsByType.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.membershipsByType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {data.membershipsByType.map((entry, index) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] || PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No membership data</p>
            )}
          </CardContent>
        </Card>

        {/* Plan Popularity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Popularity</CardTitle>
            <CardDescription>Active memberships by plan</CardDescription>
          </CardHeader>
          <CardContent>
            {data.planPopularity.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.planPopularity.slice(0, 8)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="planName"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + "..." : val}
                    />
                    <Tooltip />
                    <Bar dataKey="activeCount" name="Active Members" fill="hsl(var(--primary))">
                      {data.planPopularity.map((entry, index) => (
                        <Cell
                          key={entry.planName}
                          fill={TYPE_COLORS[entry.type] || PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No plans found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Breakdown</CardTitle>
          <CardDescription>Detailed view of all membership plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Plan Name</th>
                  <th className="text-left p-2 font-medium">Type</th>
                  <th className="text-right p-2 font-medium">Active Members</th>
                </tr>
              </thead>
              <tbody>
                {data.planPopularity.length > 0 ? (
                  data.planPopularity.map((plan) => (
                    <tr key={plan.planName} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{plan.planName}</td>
                      <td className="p-2">{getTypeBadge(plan.type)}</td>
                      <td className="p-2 text-right">{plan.activeCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">
                      No membership plans available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
