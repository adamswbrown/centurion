"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Scale, Footprints, CalendarCheck } from "lucide-react"

interface QuickStatsProps {
  latestWeight: number | null
  avgSteps7d: number | null
  entriesLast7Days: number
  currentStreak: number
}

export function QuickStats({
  latestWeight,
  avgSteps7d,
  entriesLast7Days,
  currentStreak,
}: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Latest Weight</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {latestWeight !== null ? (
              <>
                {latestWeight}
                <span className="text-sm font-normal text-muted-foreground"> lbs</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Avg Steps (7d)</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {avgSteps7d !== null ? (
              avgSteps7d.toLocaleString()
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Entries (7d)</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {entriesLast7Days}
            <span className="text-sm font-normal text-muted-foreground"> / 7</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="text-xs text-muted-foreground">Current Streak</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {currentStreak}
            <span className="text-sm font-normal text-muted-foreground"> day{currentStreak !== 1 ? "s" : ""}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
