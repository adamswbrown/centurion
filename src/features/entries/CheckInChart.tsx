"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEntries } from "@/hooks/useEntries"
import { subDays, format } from "date-fns"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

/**
 * CheckInChart - Visualize client check-in data trends
 * Shows weight progress, steps, and stress levels over time
 */

interface CheckInChartProps {
  days?: number
}

export function CheckInChart({ days = 30 }: CheckInChartProps) {
  const from = subDays(new Date(), days)
  const { data: entries, isLoading } = useEntries({ from, limit: days })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>Start logging check-ins to see your trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No check-in data yet. Use the form above to log your first entry!
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform entries for charts - sorted by date ascending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const chartData = sortedEntries.map((entry) => ({
    date: entry.date,
    weight: entry.weight,
    steps: entry.steps,
    calories: entry.calories,
    stress: entry.perceivedStress,
    sleepQuality: entry.sleepQuality,
  }))

  // Calculate stats for reference lines
  const weightsWithData = chartData.filter((d) => d.weight !== null)
  const avgWeight =
    weightsWithData.length > 0
      ? weightsWithData.reduce((sum, d) => sum + (d.weight || 0), 0) / weightsWithData.length
      : null

  const stepsWithData = chartData.filter((d) => d.steps !== null)
  const avgSteps =
    stepsWithData.length > 0
      ? Math.round(stepsWithData.reduce((sum, d) => sum + (d.steps || 0), 0) / stepsWithData.length)
      : null

  // Calculate weight change
  const firstWeight = weightsWithData[0]?.weight
  const lastWeight = weightsWithData[weightsWithData.length - 1]?.weight
  const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Weight Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Weight Trend</span>
            {weightChange !== null && (
              <span
                className={`text-sm font-normal ${
                  weightChange < 0 ? "text-green-600" : weightChange > 0 ? "text-orange-600" : "text-muted-foreground"
                }`}
              >
                {weightChange > 0 ? "+" : ""}
                {weightChange.toFixed(1)} lbs
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {weightsWithData.length > 0
              ? `${weightsWithData.length} entries over ${days} days`
              : "No weight data recorded"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {weightsWithData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), "EEEE, MMM d")}
                    formatter={(value: number) => [`${value.toFixed(1)} lbs`, "Weight"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  {avgWeight && (
                    <ReferenceLine
                      y={avgWeight}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={{
                        value: `Avg: ${avgWeight.toFixed(1)}`,
                        position: "right",
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Log your weight to see the trend
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daily Steps</span>
            {avgSteps && (
              <span className="text-sm font-normal text-muted-foreground">
                Avg: {avgSteps.toLocaleString()}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {stepsWithData.length > 0
              ? `${stepsWithData.length} entries over ${days} days`
              : "No step data recorded"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {stepsWithData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), "EEEE, MMM d")}
                    formatter={(value: number) => [value.toLocaleString(), "Steps"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  {avgSteps && (
                    <ReferenceLine
                      y={avgSteps}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                    />
                  )}
                  <Bar
                    dataKey="steps"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Log your steps to see the trend
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stress & Sleep Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Stress & Sleep Quality</CardTitle>
          <CardDescription>Track your wellbeing over time (1-10 scale)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "MMM d")}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "EEEE, MMM d")}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 0, r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="sleepQuality"
                  name="Sleep Quality"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Stress (lower is better)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Sleep Quality (higher is better)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
