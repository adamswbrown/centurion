"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format, subDays } from "date-fns"
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
 * MemberMetricsCharts - Visualize member health metrics for coaches
 * Shows weight trend, steps, and stress/sleep patterns
 */

interface Entry {
  id: number
  date: Date
  weight: number | null
  steps: number | null
  calories: number | null
  sleepQuality: number | null
  perceivedStress: number | null
  notes: string | null
}

interface MemberMetricsChartsProps {
  entries: Entry[]
  days?: number
}

export function MemberMetricsCharts({ entries, days = 14 }: MemberMetricsChartsProps) {
  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Trends</CardTitle>
          <CardDescription>No check-in data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Member has not logged any check-ins yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter to last N days and sort ascending
  const cutoffDate = subDays(new Date(), days)
  const recentEntries = entries
    .filter((e) => new Date(e.date) >= cutoffDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const chartData = recentEntries.map((entry) => ({
    date: entry.date,
    weight: entry.weight,
    steps: entry.steps,
    calories: entry.calories,
    stress: entry.perceivedStress,
    sleepQuality: entry.sleepQuality,
  }))

  // Calculate stats
  const weightsWithData = chartData.filter((d) => d.weight !== null)
  const firstWeight = weightsWithData[0]?.weight
  const lastWeight = weightsWithData[weightsWithData.length - 1]?.weight
  const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null
  const avgWeight =
    weightsWithData.length > 0
      ? weightsWithData.reduce((sum, d) => sum + (d.weight || 0), 0) / weightsWithData.length
      : null

  const stepsWithData = chartData.filter((d) => d.steps !== null)
  const avgSteps =
    stepsWithData.length > 0
      ? Math.round(stepsWithData.reduce((sum, d) => sum + (d.steps || 0), 0) / stepsWithData.length)
      : null

  const stressWithData = chartData.filter((d) => d.stress !== null)
  const avgStress =
    stressWithData.length > 0
      ? (stressWithData.reduce((sum, d) => sum + (d.stress || 0), 0) / stressWithData.length).toFixed(1)
      : null
  const highStressCount = stressWithData.filter((d) => (d.stress || 0) >= 8).length

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Entries ({days}d)</div>
            <div className="text-2xl font-bold">{recentEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Avg Steps</div>
            <div className="text-2xl font-bold">
              {avgSteps ? avgSteps.toLocaleString() : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Avg Stress</div>
            <div className={`text-2xl font-bold ${parseFloat(avgStress || "0") >= 7 ? "text-orange-600" : ""}`}>
              {avgStress || "—"}
              {avgStress && <span className="text-sm font-normal">/10</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">Weight Change</div>
            <div
              className={`text-2xl font-bold ${
                weightChange !== null
                  ? weightChange < 0
                    ? "text-green-600"
                    : weightChange > 0
                      ? "text-orange-600"
                      : ""
                  : ""
              }`}
            >
              {weightChange !== null ? (
                <>
                  {weightChange > 0 ? "+" : ""}
                  {weightChange.toFixed(1)}
                  <span className="text-sm font-normal"> lbs</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Weight Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weight Trend</CardTitle>
            <CardDescription>
              {weightsWithData.length} entries • Last {days} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {weightsWithData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={40}
                    />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), "EEE, MMM d")}
                      formatter={(value: number) => [`${value.toFixed(1)} lbs`, "Weight"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    {avgWeight && (
                      <ReferenceLine
                        y={avgWeight}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 2 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No weight data recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Steps Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Steps</CardTitle>
            <CardDescription>
              {stepsWithData.length} entries • Avg: {avgSteps ? avgSteps.toLocaleString() : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {stepsWithData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      width={35}
                    />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), "EEE, MMM d")}
                      formatter={(value: number) => [value.toLocaleString(), "Steps"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    {avgSteps && (
                      <ReferenceLine
                        y={avgSteps}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Bar dataKey="steps" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No step data recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stress & Sleep Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Stress & Sleep Quality
              {highStressCount > 0 && (
                <span className="text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {highStressCount} high stress day{highStressCount > 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
            <CardDescription>1-10 scale • Lower stress is better, higher sleep quality is better</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 5, 10]}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={25}
                  />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), "EEE, MMM d")}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={8}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: "High", position: "right", fontSize: 9, fill: "#ef4444" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stress"
                    name="Stress"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", strokeWidth: 0, r: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sleepQuality"
                    name="Sleep"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 0, r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Stress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Sleep Quality</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
