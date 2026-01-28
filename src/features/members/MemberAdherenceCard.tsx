"use client"

import { useMemo } from "react"
import { format, subDays, differenceInDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { CheckInFrequencyOverride } from "./CheckInFrequencyOverride"

interface MemberAdherenceCardProps {
  memberId: number
  entries: Array<{
    id: number
    date: Date
    weight: number | null
  }>
  attentionScore?: {
    priority: "red" | "amber" | "green"
    score: number
    reasons: string[]
    suggestedActions: string[]
  } | null
  checkInFrequencyDays?: number | null
  cohortCheckInFrequency?: number | null
}

export function MemberAdherenceCard({
  memberId,
  entries,
  attentionScore,
  checkInFrequencyDays = 1,
  cohortCheckInFrequency,
}: MemberAdherenceCardProps) {
  const adherenceMetrics = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const fourteenDaysAgo = subDays(now, 14)

    // Get entries from last 7 and 14 days
    const entriesLast7Days = entries.filter(
      (e) => new Date(e.date) >= sevenDaysAgo
    ).length
    const entriesLast14Days = entries.filter(
      (e) => new Date(e.date) >= fourteenDaysAgo
    ).length

    // Calculate expected check-ins based on frequency
    const frequency = checkInFrequencyDays || 1
    const expected7Days = Math.ceil(7 / frequency)
    const expected14Days = Math.ceil(14 / frequency)

    // Calculate adherence rates
    const adherenceRate7Days = expected7Days > 0 ? (entriesLast7Days / expected7Days) * 100 : 0
    const adherenceRate14Days = expected14Days > 0 ? (entriesLast14Days / expected14Days) * 100 : 0

    // Get last check-in date
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const lastCheckIn = sortedEntries[0]?.date ? new Date(sortedEntries[0].date) : null
    const daysSinceLastCheckIn = lastCheckIn
      ? differenceInDays(now, lastCheckIn)
      : null

    // Calculate weight trend
    const recentWeights = sortedEntries
      .slice(0, 14)
      .filter((e) => e.weight !== null)
      .map((e) => ({ date: new Date(e.date), weight: e.weight as number }))
      .reverse()

    let weightTrend: "up" | "down" | "stable" | null = null
    let weightChange = 0

    if (recentWeights.length >= 2) {
      const firstWeight = recentWeights[0].weight
      const lastWeight = recentWeights[recentWeights.length - 1].weight
      weightChange = lastWeight - firstWeight

      if (Math.abs(weightChange) < 0.5) {
        weightTrend = "stable"
      } else if (weightChange > 0) {
        weightTrend = "up"
      } else {
        weightTrend = "down"
      }
    }

    return {
      entriesLast7Days,
      entriesLast14Days,
      expected7Days,
      expected14Days,
      adherenceRate7Days: Math.min(100, adherenceRate7Days),
      adherenceRate14Days: Math.min(100, adherenceRate14Days),
      lastCheckIn,
      daysSinceLastCheckIn,
      weightTrend,
      weightChange,
      totalEntries: entries.length,
    }
  }, [entries, checkInFrequencyDays])

  const priorityColors = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
  }

  const priorityBgColors = {
    red: "bg-red-50 border-red-200",
    amber: "bg-amber-50 border-amber-200",
    green: "bg-green-50 border-green-200",
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Adherence & Engagement</span>
          {attentionScore && (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1",
                priorityBgColors[attentionScore.priority]
              )}
            >
              <span
                className={cn("w-2 h-2 rounded-full", priorityColors[attentionScore.priority])}
              />
              Score: {attentionScore.score}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Check-in frequency override */}
        <div className="pb-2 border-b">
          <CheckInFrequencyOverride
            memberId={memberId}
            currentOverride={checkInFrequencyDays ?? null}
            cohortDefault={cohortCheckInFrequency}
          />
        </div>

        {/* Check-in adherence */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Last 7 Days</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {adherenceMetrics.entriesLast7Days}/{adherenceMetrics.expected7Days}
              </span>
              <span className="text-sm text-muted-foreground">
                ({Math.round(adherenceMetrics.adherenceRate7Days)}%)
              </span>
            </div>
            <Progress
              value={adherenceMetrics.adherenceRate7Days}
              className={cn(
                "h-2 mt-1",
                adherenceMetrics.adherenceRate7Days >= 70
                  ? "[&>div]:bg-green-500"
                  : adherenceMetrics.adherenceRate7Days >= 40
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-red-500"
              )}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Last 14 Days</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {adherenceMetrics.entriesLast14Days}/{adherenceMetrics.expected14Days}
              </span>
              <span className="text-sm text-muted-foreground">
                ({Math.round(adherenceMetrics.adherenceRate14Days)}%)
              </span>
            </div>
            <Progress
              value={adherenceMetrics.adherenceRate14Days}
              className={cn(
                "h-2 mt-1",
                adherenceMetrics.adherenceRate14Days >= 70
                  ? "[&>div]:bg-green-500"
                  : adherenceMetrics.adherenceRate14Days >= 40
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-red-500"
              )}
            />
          </div>
        </div>

        {/* Last check-in and weight trend */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Last Check-in</p>
              {adherenceMetrics.lastCheckIn ? (
                <p className="text-sm font-medium">
                  {format(adherenceMetrics.lastCheckIn, "MMM d")}
                  {adherenceMetrics.daysSinceLastCheckIn !== null && (
                    <span className="text-muted-foreground ml-1">
                      ({adherenceMetrics.daysSinceLastCheckIn === 0
                        ? "today"
                        : adherenceMetrics.daysSinceLastCheckIn === 1
                        ? "yesterday"
                        : `${adherenceMetrics.daysSinceLastCheckIn} days ago`})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Never</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {adherenceMetrics.weightTrend === "up" && (
              <TrendingUp className="h-4 w-4 text-amber-500" />
            )}
            {adherenceMetrics.weightTrend === "down" && (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            {adherenceMetrics.weightTrend === "stable" && (
              <Minus className="h-4 w-4 text-blue-500" />
            )}
            {!adherenceMetrics.weightTrend && (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Weight Trend</p>
              {adherenceMetrics.weightTrend ? (
                <p className="text-sm font-medium">
                  {adherenceMetrics.weightTrend === "stable"
                    ? "Stable"
                    : adherenceMetrics.weightTrend === "up"
                    ? `↑ ${adherenceMetrics.weightChange.toFixed(1)} lbs`
                    : `↓ ${Math.abs(adherenceMetrics.weightChange).toFixed(1)} lbs`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Attention score reasons */}
        {attentionScore && attentionScore.reasons.length > 0 && (
          <div
            className={cn(
              "p-3 rounded-lg border mt-2",
              priorityBgColors[attentionScore.priority]
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {attentionScore.priority === "red" && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              {attentionScore.priority === "amber" && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              {attentionScore.priority === "green" && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {attentionScore.priority === "red"
                  ? "Needs Attention"
                  : attentionScore.priority === "amber"
                  ? "Monitor Closely"
                  : "On Track"}
              </span>
            </div>
            <ul className="text-sm space-y-1">
              {attentionScore.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-muted-foreground">•</span>
                  {reason}
                </li>
              ))}
            </ul>
            {attentionScore.suggestedActions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-current/10">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Suggested Actions:
                </p>
                <div className="flex flex-wrap gap-1">
                  {attentionScore.suggestedActions.map((action, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
