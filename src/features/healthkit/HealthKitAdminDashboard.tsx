"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Activity, Moon, Users, Key, RefreshCw, Copy, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface Client {
  id: number
  name: string | null
  email: string
  _count: {
    healthKitWorkouts: number
    sleepRecords: number
    entries: number
  }
  pairingCodesAsUser: Array<{ usedAt: Date | null }>
}

interface PairingCode {
  id: number
  code: string
  expiresAt: Date
  user: { id: number; name: string | null; email: string }
  creator: { id: number; name: string | null }
}

interface Workout {
  id: number
  workoutType: string
  startTime: Date
  duration: number
  user: { id: number; name: string | null }
}

interface SleepRecord {
  id: number
  startTime: Date
  totalSleep: number
  user: { id: number; name: string | null }
}

interface HealthKitAdminDashboardProps {
  clients: Client[]
  activePairingCodes: PairingCode[]
  recentWorkouts: Workout[]
  recentSleepRecords: SleepRecord[]
}

export function HealthKitAdminDashboard({
  clients,
  activePairingCodes,
  recentWorkouts,
  recentSleepRecords,
}: HealthKitAdminDashboardProps) {
  const router = useRouter()
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [generatingCode, setGeneratingCode] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stats
  const pairedClients = clients.filter(
    (c) => c.pairingCodesAsUser.length > 0 && c.pairingCodesAsUser[0].usedAt
  ).length
  const totalWorkouts = clients.reduce((sum, c) => sum + c._count.healthKitWorkouts, 0)
  const totalSleepRecords = clients.reduce((sum, c) => sum + c._count.sleepRecords, 0)

  const handleGenerateCode = async () => {
    if (!selectedClientId) return

    setGeneratingCode(true)
    setError(null)
    setGeneratedCode(null)

    try {
      // This would normally be a server action, but we're calling the lib function directly
      // In production, you'd want to create a server action wrapper
      const result = await fetch("/api/admin/healthkit/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(selectedClientId) }),
      })

      if (!result.ok) {
        const data = await result.json()
        throw new Error(data.error || "Failed to generate code")
      }

      const data = await result.json()
      setGeneratedCode(data.code)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate code")
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement("textarea")
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const formatSleepDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paired Clients</p>
                <p className="text-2xl font-bold">{pairedClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-emerald-100 p-3">
                <Key className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Codes</p>
                <p className="text-2xl font-bold">{activePairingCodes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Workouts</p>
                <p className="text-2xl font-bold">{totalWorkouts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-100 p-3">
                <Moon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sleep Records</p>
                <p className="text-2xl font-bold">{totalSleepRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generate Pairing Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Generate Pairing Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleGenerateCode}
                disabled={!selectedClientId || generatingCode}
              >
                {generatingCode ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            </div>

            {generatedCode && (
              <div className="flex items-center justify-center gap-4 rounded-lg border bg-muted/50 p-4">
                <span className="font-mono text-2xl font-bold tracking-widest">
                  {generatedCode}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(generatedCode)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Give this code to the client to enter in their iOS app. Codes expire after 24 hours.
            </p>
          </CardContent>
        </Card>

        {/* Active Pairing Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Active Pairing Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {activePairingCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active pairing codes</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activePairingCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{code.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopy(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For: {code.user.name || code.user.email}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      Expires {format(new Date(code.expiresAt), "MMM d, h:mm a")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Workouts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workouts synced yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <Badge variant="secondary">{workout.workoutType}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {workout.user.name || `User ${workout.user.id}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{formatDuration(workout.duration)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(workout.startTime), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sleep Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Recent Sleep Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSleepRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sleep data synced yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentSleepRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {formatSleepDuration(record.totalSleep)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.user.name || `User ${record.user.id}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(record.startTime), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
