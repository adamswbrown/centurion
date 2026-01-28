"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, subDays } from "date-fns"
import {
  LineChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import { AlertTriangle, Eye, EyeOff, TrendingDown, TrendingUp, Minus, ZoomIn, X } from "lucide-react"

/**
 * MemberMetricsCharts - Interactive health metrics visualization for coaches
 * Features: Time range selection, metric toggles, anomaly detection, date highlighting
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
  targetWeight?: number | null
}

type TimeRange = 7 | 14 | 30 | 90

interface Anomaly {
  date: string
  metric: string
  value: number
  type: "high" | "low" | "spike" | "drop"
  description: string
}

export function MemberMetricsCharts({ entries, days = 14, targetWeight }: MemberMetricsChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(days as TimeRange)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set())

  // Toggle metric visibility
  const toggleMetric = (metric: string) => {
    setHiddenMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(metric)) {
        next.delete(metric)
      } else {
        next.add(metric)
      }
      return next
    })
  }

  // Process chart data
  const { chartData, anomalies, stats } = useMemo(() => {
    if (!entries || entries.length === 0) {
      return { chartData: [], anomalies: [], stats: null }
    }

    const cutoffDate = subDays(new Date(), timeRange)
    const recentEntries = entries
      .filter((e) => new Date(e.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const data = recentEntries.map((entry) => ({
      date: format(new Date(entry.date), "yyyy-MM-dd"),
      dateDisplay: format(new Date(entry.date), "MMM d"),
      weight: entry.weight,
      steps: entry.steps,
      calories: entry.calories,
      stress: entry.perceivedStress,
      sleepQuality: entry.sleepQuality,
      notes: entry.notes,
    }))

    // Calculate statistics for anomaly detection
    const weightsWithData = data.filter((d) => d.weight !== null)
    const stepsWithData = data.filter((d) => d.steps !== null)
    const stressWithData = data.filter((d) => d.stress !== null)

    const avgWeight =
      weightsWithData.length > 0
        ? weightsWithData.reduce((sum, d) => sum + (d.weight || 0), 0) / weightsWithData.length
        : null
    const avgSteps =
      stepsWithData.length > 0
        ? Math.round(stepsWithData.reduce((sum, d) => sum + (d.steps || 0), 0) / stepsWithData.length)
        : null
    const avgStress =
      stressWithData.length > 0
        ? stressWithData.reduce((sum, d) => sum + (d.stress || 0), 0) / stressWithData.length
        : null

    // Weight trend
    const firstWeight = weightsWithData[0]?.weight
    const lastWeight = weightsWithData[weightsWithData.length - 1]?.weight
    const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null
    let weightTrend: "up" | "down" | "stable" | null = null
    if (weightChange !== null) {
      if (Math.abs(weightChange) < 0.5) {
        weightTrend = "stable"
      } else if (weightChange > 0) {
        weightTrend = "up"
      } else {
        weightTrend = "down"
      }
    }

    // Detect anomalies
    const detectedAnomalies: Anomaly[] = []

    // High stress days (8+)
    data.forEach((d) => {
      if (d.stress !== null && d.stress >= 8) {
        detectedAnomalies.push({
          date: d.date,
          metric: "stress",
          value: d.stress,
          type: "high",
          description: `High stress (${d.stress}/10)`,
        })
      }
    })

    // Weight spikes/drops (>2 lbs change in a day)
    for (let i = 1; i < weightsWithData.length; i++) {
      const prev = weightsWithData[i - 1].weight!
      const curr = weightsWithData[i].weight!
      const change = curr - prev
      if (Math.abs(change) > 2) {
        detectedAnomalies.push({
          date: weightsWithData[i].date,
          metric: "weight",
          value: curr,
          type: change > 0 ? "spike" : "drop",
          description: `Weight ${change > 0 ? "spike" : "drop"} (${change > 0 ? "+" : ""}${change.toFixed(1)} lbs)`,
        })
      }
    }

    // Low step days (<3000 when avg is higher)
    if (avgSteps && avgSteps > 5000) {
      data.forEach((d) => {
        if (d.steps !== null && d.steps < 3000) {
          detectedAnomalies.push({
            date: d.date,
            metric: "steps",
            value: d.steps,
            type: "low",
            description: `Low activity (${d.steps.toLocaleString()} steps)`,
          })
        }
      })
    }

    // Poor sleep quality (<5)
    data.forEach((d) => {
      if (d.sleepQuality !== null && d.sleepQuality < 5) {
        detectedAnomalies.push({
          date: d.date,
          metric: "sleep",
          value: d.sleepQuality,
          type: "low",
          description: `Poor sleep quality (${d.sleepQuality}/10)`,
        })
      }
    })

    const highStressCount = stressWithData.filter((d) => (d.stress || 0) >= 8).length

    return {
      chartData: data,
      anomalies: detectedAnomalies,
      stats: {
        entries: recentEntries.length,
        avgWeight,
        avgSteps,
        avgStress,
        weightChange,
        weightTrend,
        highStressCount,
        firstWeight,
        lastWeight,
      },
    }
  }, [entries, timeRange])

  // Get selected entry data for highlighting
  const selectedEntry = selectedDate ? chartData.find((d) => d.date === selectedDate) : null

  // Handle chart click to select date
  const handleChartClick = (data: { activeLabel?: string }) => {
    if (data.activeLabel) {
      setSelectedDate(data.activeLabel === selectedDate ? null : data.activeLabel)
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Controls: Time Range & Metric Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Time Range:</span>
          {([7, 14, 30, 90] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="h-7 px-2 text-xs"
            >
              {range}d
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Show:</span>
          {[
            { key: "weight", label: "Weight", color: "#2563eb" },
            { key: "steps", label: "Steps", color: "#10b981" },
            { key: "stress", label: "Stress", color: "#ef4444" },
            { key: "sleep", label: "Sleep", color: "#3b82f6" },
          ].map(({ key, label, color }) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => toggleMetric(key)}
              className={cn(
                "h-7 px-2 text-xs gap-1",
                hiddenMetrics.has(key) && "opacity-50"
              )}
            >
              {hiddenMetrics.has(key) ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Selected Date Info */}
      {selectedDate && selectedEntry && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ZoomIn className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                </span>
                <div className="flex items-center gap-3 text-sm">
                  {selectedEntry.weight && (
                    <span>Weight: <strong>{selectedEntry.weight.toFixed(1)} lbs</strong></span>
                  )}
                  {selectedEntry.steps && (
                    <span>Steps: <strong>{selectedEntry.steps.toLocaleString()}</strong></span>
                  )}
                  {selectedEntry.stress && (
                    <span>Stress: <strong>{selectedEntry.stress}/10</strong></span>
                  )}
                  {selectedEntry.sleepQuality && (
                    <span>Sleep: <strong>{selectedEntry.sleepQuality}/10</strong></span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="h-7 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {selectedEntry.notes && (
              <p className="text-sm text-muted-foreground mt-2 pl-8">
                Notes: {selectedEntry.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <span className="font-medium text-amber-800">
                  {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"} detected
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {anomalies.slice(0, 5).map((a, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        "text-xs cursor-pointer hover:bg-amber-100",
                        selectedDate === a.date && "ring-2 ring-amber-500"
                      )}
                      onClick={() => setSelectedDate(a.date)}
                    >
                      {format(new Date(a.date), "MMM d")}: {a.description}
                    </Badge>
                  ))}
                  {anomalies.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{anomalies.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Entries ({timeRange}d)</div>
              <div className="text-2xl font-bold">{stats.entries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Avg Steps</div>
              <div className="text-2xl font-bold">
                {stats.avgSteps ? stats.avgSteps.toLocaleString() : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Avg Stress</div>
              <div className={cn(
                "text-2xl font-bold",
                stats.avgStress && stats.avgStress >= 7 && "text-orange-600"
              )}>
                {stats.avgStress ? stats.avgStress.toFixed(1) : "—"}
                {stats.avgStress && <span className="text-sm font-normal">/10</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                Weight Change
                {stats.weightTrend === "up" && <TrendingUp className="h-3 w-3 text-amber-500" />}
                {stats.weightTrend === "down" && <TrendingDown className="h-3 w-3 text-green-500" />}
                {stats.weightTrend === "stable" && <Minus className="h-3 w-3 text-blue-500" />}
              </div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  stats.weightChange !== null
                    ? stats.weightChange < 0
                      ? "text-green-600"
                      : stats.weightChange > 0
                        ? "text-orange-600"
                        : ""
                    : ""
                )}
              >
                {stats.weightChange !== null ? (
                  <>
                    {stats.weightChange > 0 ? "+" : ""}
                    {stats.weightChange.toFixed(1)}
                    <span className="text-sm font-normal"> lbs</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Weight Trend */}
        {!hiddenMetrics.has("weight") && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Weight Trend
                {targetWeight && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Goal: {targetWeight} lbs
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {chartData.filter((d) => d.weight !== null).length} entries • Last {timeRange} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {chartData.filter((d) => d.weight !== null).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      onClick={handleChartClick}
                      style={{ cursor: "pointer" }}
                    >
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
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
                      {selectedDate && (
                        <ReferenceLine
                          x={selectedDate}
                          stroke="#111827"
                          strokeDasharray="3 3"
                        />
                      )}
                      {stats?.avgWeight && (
                        <ReferenceLine
                          y={stats.avgWeight}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="3 3"
                          label={{ value: "Avg", position: "right", fontSize: 9 }}
                        />
                      )}
                      {targetWeight && (
                        <ReferenceLine
                          y={targetWeight}
                          stroke="#10b981"
                          strokeDasharray="5 5"
                          label={{ value: "Goal", position: "right", fontSize: 9, fill: "#10b981" }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="weight"
                        fill="url(#weightGradient)"
                        stroke="none"
                        fillOpacity={1}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ fill: "#2563eb", strokeWidth: 0, r: 2 }}
                        activeDot={{ r: 5, fill: "#2563eb", stroke: "#1f2937" }}
                        connectNulls
                      />
                      {selectedDate && selectedEntry?.weight && (
                        <ReferenceDot
                          x={selectedDate}
                          y={selectedEntry.weight}
                          r={6}
                          fill="#2563eb"
                          stroke="#1f2937"
                          strokeWidth={2}
                        />
                      )}
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
        )}

        {/* Steps Chart */}
        {!hiddenMetrics.has("steps") && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Steps</CardTitle>
              <CardDescription>
                {chartData.filter((d) => d.steps !== null).length} entries • Avg: {stats?.avgSteps ? stats.avgSteps.toLocaleString() : "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {chartData.filter((d) => d.steps !== null).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      onClick={handleChartClick}
                      style={{ cursor: "pointer" }}
                    >
                      <defs>
                        <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
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
                      {selectedDate && (
                        <ReferenceLine
                          x={selectedDate}
                          stroke="#111827"
                          strokeDasharray="3 3"
                        />
                      )}
                      {stats?.avgSteps && (
                        <ReferenceLine
                          y={stats.avgSteps}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="3 3"
                        />
                      )}
                      <Bar
                        dataKey="steps"
                        fill="url(#stepsGradient)"
                        radius={[2, 2, 0, 0]}
                      />
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
        )}

        {/* Stress & Sleep Chart */}
        {(!hiddenMetrics.has("stress") || !hiddenMetrics.has("sleep")) && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Stress & Sleep Quality
                {stats?.highStressCount && stats.highStressCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {stats.highStressCount} high stress day{stats.highStressCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                1-10 scale • Click chart to highlight date across all charts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    onClick={handleChartClick}
                    style={{ cursor: "pointer" }}
                  >
                    <defs>
                      <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Legend
                      verticalAlign="top"
                      height={24}
                      formatter={(value) => (
                        <span className="text-xs">{value}</span>
                      )}
                    />
                    {selectedDate && (
                      <ReferenceLine
                        x={selectedDate}
                        stroke="#111827"
                        strokeDasharray="3 3"
                      />
                    )}
                    <ReferenceLine
                      y={8}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    {!hiddenMetrics.has("stress") && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="stress"
                          name="Stress"
                          fill="url(#stressGradient)"
                          stroke="none"
                          fillOpacity={1}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="stress"
                          name="Stress"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: "#ef4444", strokeWidth: 0, r: 2 }}
                          activeDot={{ r: 5, fill: "#ef4444", stroke: "#1f2937" }}
                          connectNulls
                        />
                      </>
                    )}
                    {!hiddenMetrics.has("sleep") && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="sleepQuality"
                          name="Sleep"
                          fill="url(#sleepGradient)"
                          stroke="none"
                          fillOpacity={1}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="sleepQuality"
                          name="Sleep"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", strokeWidth: 0, r: 2 }}
                          activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1f2937" }}
                          connectNulls
                        />
                      </>
                    )}
                    {selectedDate && selectedEntry?.stress && !hiddenMetrics.has("stress") && (
                      <ReferenceDot
                        x={selectedDate}
                        y={selectedEntry.stress}
                        r={6}
                        fill="#ef4444"
                        stroke="#1f2937"
                        strokeWidth={2}
                      />
                    )}
                    {selectedDate && selectedEntry?.sleepQuality && !hiddenMetrics.has("sleep") && (
                      <ReferenceDot
                        x={selectedDate}
                        y={selectedEntry.sleepQuality}
                        r={6}
                        fill="#3b82f6"
                        stroke="#1f2937"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
