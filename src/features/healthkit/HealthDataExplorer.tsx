"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Moon, Footprints } from "lucide-react"

interface HealthKitWorkout {
  id: number
  workoutType: string
  startTime: Date
  endTime: Date
  duration: number
  calories: number | null
  distance: number | null
  heartRate: { avg?: number; max?: number } | null
}

interface SleepRecord {
  id: number
  startTime: Date
  endTime: Date
  totalSleep: number
  inBedTime: number
  deepSleep: number | null
  remSleep: number | null
  coreSleep: number | null
}

interface Entry {
  id: number
  date: Date
  steps: number | null
  dataSources: Record<string, string> | null
}

interface HealthDataExplorerProps {
  clientId: number
  clientName: string | null
  workouts: HealthKitWorkout[]
  sleepRecords: SleepRecord[]
  entries: Entry[]
}

export function HealthDataExplorer({
  clientId,
  clientName,
  workouts,
  sleepRecords,
  entries,
}: HealthDataExplorerProps) {
  const [activeTab, setActiveTab] = useState("workouts")

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatSleepDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Filter entries that have HealthKit step data
  const stepsFromHealthKit = entries.filter(
    (e) => e.steps && e.dataSources?.steps === "healthkit"
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          HealthKit Data - {clientName || `Client ${clientId}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workouts" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Workouts ({workouts.length})
            </TabsTrigger>
            <TabsTrigger value="sleep" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Sleep ({sleepRecords.length})
            </TabsTrigger>
            <TabsTrigger value="steps" className="flex items-center gap-2">
              <Footprints className="h-4 w-4" />
              Steps ({stepsFromHealthKit.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-4">
            {workouts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No workout data synced yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {workouts.slice(0, 50).map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{workout.workoutType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(workout.startTime), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{formatDuration(workout.duration)}</span>
                        {workout.calories && (
                          <span>{Math.round(workout.calories)} cal</span>
                        )}
                        {workout.distance && (
                          <span>{(workout.distance / 1000).toFixed(2)} km</span>
                        )}
                        {workout.heartRate?.avg && (
                          <span>{Math.round(workout.heartRate.avg)} bpm avg</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sleep" className="mt-4">
            {sleepRecords.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No sleep data synced yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sleepRecords.slice(0, 50).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(new Date(record.startTime), "MMM d, yyyy")}
                        </span>
                        <Badge variant="secondary">
                          {formatSleepDuration(record.totalSleep)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>In bed: {formatSleepDuration(record.inBedTime)}</span>
                        {record.deepSleep && (
                          <span>Deep: {formatSleepDuration(record.deepSleep)}</span>
                        )}
                        {record.remSleep && (
                          <span>REM: {formatSleepDuration(record.remSleep)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="steps" className="mt-4">
            {stepsFromHealthKit.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No step data synced from HealthKit yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stepsFromHealthKit.slice(0, 50).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="font-medium">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </span>
                    <Badge variant="secondary">
                      {entry.steps?.toLocaleString()} steps
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
