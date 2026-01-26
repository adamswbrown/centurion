"use client"

import { useCheckInStats } from "@/hooks/useEntries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

export function CheckInStats() {
  const { data, isLoading } = useCheckInStats()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check-In Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-In Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Streak</span>
          <span className="font-semibold">{data.currentStreak} days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Check-In</span>
          <span className="font-semibold">
            {data.lastCheckIn ? format(new Date(data.lastCheckIn), "MMM d, yyyy") : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Check-Ins</span>
          <span className="font-semibold">{data.totalEntries}</span>
        </div>
      </CardContent>
    </Card>
  )
}
