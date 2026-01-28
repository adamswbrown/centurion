"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, isToday, isYesterday } from "date-fns"
import { Activity } from "lucide-react"

interface Entry {
  id: number
  date: Date
  weight: number | null
  steps: number | null
  calories: number | null
  sleepQuality: number | null
  perceivedStress: number | null
  notes: string | null
  dataSources?: any
}

interface RecentEntriesSidebarProps {
  entries: Entry[]
}

export function RecentEntriesSidebar({ entries }: RecentEntriesSidebarProps) {
  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return "Today"
    if (isYesterday(date)) return "Yesterday"
    return format(date, "MMM d")
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No check-ins yet. Start tracking today!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Entries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry, idx) => {
          const dataSources = entry.dataSources as Record<string, string> | null

          return (
            <div
              key={entry.id}
              className={`p-3 rounded-lg border ${
                idx === 0 ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
              } transition-colors`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {formatDateLabel(new Date(entry.date))}
                </span>
                {idx === 0 && (
                  <Badge variant="outline" className="text-xs">
                    Latest
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                {entry.weight !== null && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{entry.weight}</span> lbs
                    {dataSources?.weight === "healthkit" && (
                      <span className="text-purple-600">⌚</span>
                    )}
                  </div>
                )}
                {entry.steps !== null && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{entry.steps.toLocaleString()}</span> steps
                    {dataSources?.steps === "healthkit" && (
                      <span className="text-purple-600">⌚</span>
                    )}
                  </div>
                )}
                {entry.calories !== null && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{entry.calories.toLocaleString()}</span> cal
                  </div>
                )}
                {entry.perceivedStress !== null && (
                  <div className={`flex items-center gap-1 ${entry.perceivedStress >= 8 ? "text-red-600" : ""}`}>
                    Stress: <span className="font-medium">{entry.perceivedStress}/10</span>
                    {entry.perceivedStress >= 8 && " ⚠"}
                  </div>
                )}
              </div>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {entry.notes}
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
