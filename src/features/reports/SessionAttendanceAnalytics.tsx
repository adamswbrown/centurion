"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSessionAttendanceReport } from "@/hooks/useReports"
import {
  BarChart,
  Bar,
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

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "hsl(210, 80%, 55%)",
  COMPLETED: "hsl(145, 60%, 45%)",
  CANCELLED: "hsl(0, 65%, 55%)",
  IN_PROGRESS: "hsl(45, 80%, 50%)",
}

const PIE_COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6"]

export function SessionAttendanceAnalytics() {
  const { data, isLoading } = useSessionAttendanceReport()

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

  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 50) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {data.completedSessions} completed, {data.upcomingSessions} upcoming
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRateColor(data.attendanceRate)}`}>
              {data.attendanceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.totalRegistrations} total registrations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.noShowRate > 20 ? "text-red-600" : data.noShowRate > 10 ? "text-amber-600" : "text-green-600"}`}>
              {data.noShowRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Late cancel: {data.lateCancelRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRateColor(data.averageOccupancy)}`}>
              {data.averageOccupancy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.cancelledSessions} sessions cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Trend Area Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Trend (12 Weeks)</CardTitle>
            <CardDescription>Weekly attendance, no-shows, and total registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {data.attendanceTrend.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => {
                        const d = new Date(val)
                        return `${d.getMonth() + 1}/${d.getDate()}`
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(val) => {
                        const d = new Date(val as string)
                        return `Week of ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      fill="#8b5cf680"
                      name="Total"
                    />
                    <Area
                      type="monotone"
                      dataKey="attended"
                      stroke="#22c55e"
                      fill="#22c55e80"
                      name="Attended"
                    />
                    <Area
                      type="monotone"
                      dataKey="noShow"
                      stroke="#ef4444"
                      fill="#ef444480"
                      name="No-Show"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">
                No attendance data available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Session Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions by Status</CardTitle>
            <CardDescription>Distribution of session statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {data.sessionsByStatus.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sessionsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {data.sessionsByStatus.map((entry, index) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No sessions recorded</p>
            )}
          </CardContent>
        </Card>

        {/* Popular Class Types */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Class Types</CardTitle>
            <CardDescription>Classes ranked by session count</CardDescription>
          </CardHeader>
          <CardContent>
            {data.popularClassTypes.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.popularClassTypes.slice(0, 8)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + "..." : val}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "avgAttendance" ? value.toFixed(1) : value,
                        name === "avgAttendance" ? "Avg Attendance" : "Sessions",
                      ]}
                    />
                    <Bar dataKey="sessionCount" fill="hsl(var(--primary))" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No class types found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
