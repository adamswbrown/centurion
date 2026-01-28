"use client"

import { useState, useEffect, Fragment, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useWeeklySummaries,
  useWeeklyResponse,
  useSaveWeeklyResponse,
  useReviewQueueSummary,
  useCoachCohorts,
} from "@/hooks/useReviewQueue"
import type { ClientWeeklySummary } from "@/app/actions/review-queue"
import { generateWeeklyEmailDraft } from "@/lib/email-draft"
import { format, addDays, subDays } from "date-fns"
import { ChevronLeft, ChevronRight, RefreshCw, Copy, Check, ExternalLink, Save } from "lucide-react"

/**
 * ReviewQueueDashboard - Weekly review queue for coaches
 * Based on CoachFit weekly-review implementation
 * Generated with Claude Code
 */

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function ReviewQueueDashboard() {
  const [selectedWeekStart, setSelectedWeekStart] = useState(
    format(getMonday(new Date()), "yyyy-MM-dd")
  )
  const [selectedCohortId, setSelectedCohortId] = useState<number | undefined>(undefined)
  const [priorityFilter, setPriorityFilter] = useState<"all" | "red" | "amber" | "green">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedClient, setExpandedClient] = useState<number | null>(null)

  const { data: summaries, isLoading, refetch } = useWeeklySummaries(
    selectedWeekStart,
    selectedCohortId
  )
  const { data: queueSummary } = useReviewQueueSummary(selectedWeekStart)
  const { data: cohorts } = useCoachCohorts()

  // Week navigation
  const handleWeekChange = (direction: "prev" | "next") => {
    const current = new Date(selectedWeekStart)
    const newDate = direction === "prev"
      ? subDays(current, 7)
      : addDays(current, 7)
    setSelectedWeekStart(format(getMonday(newDate), "yyyy-MM-dd"))
  }

  // Filter clients
  const filteredClients = summaries?.clients.filter((client) => {
    // Priority filter
    if (priorityFilter !== "all") {
      const priority = client.attentionScore?.priority || "green"
      if (priority !== priorityFilter) return false
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const nameMatch = client.name?.toLowerCase().includes(search)
      const emailMatch = client.email.toLowerCase().includes(search)
      if (!nameMatch && !emailMatch) return false
    }

    return true
  }) || []

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "red":
        return <Badge className="bg-red-100 text-red-800">RED</Badge>
      case "amber":
        return <Badge className="bg-amber-100 text-amber-800">AMBER</Badge>
      case "green":
        return <Badge className="bg-green-100 text-green-800">GREEN</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Weekly Review Queue</h1>
        <p className="text-muted-foreground">
          Review your clients' weekly progress and send personalized feedback
        </p>
      </div>

      {/* Summary Cards */}
      {queueSummary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueSummary.totalClients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{queueSummary.redPriority}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Watch Closely</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{queueSummary.amberPriority}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">On Track</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{queueSummary.greenPriority}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queueSummary.completedReviews}/{queueSummary.totalClients}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Week Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleWeekChange("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <div className="text-sm text-muted-foreground">Week of</div>
                <div className="font-semibold">
                  {summaries ? `${summaries.weekStart} - ${summaries.weekEnd}` : selectedWeekStart}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleWeekChange("next")}
                disabled={selectedWeekStart >= format(getMonday(new Date()), "yyyy-MM-dd")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Cohort Filter */}
            {cohorts && cohorts.length > 0 && (
              <Select
                value={selectedCohortId?.toString() || "all"}
                onValueChange={(value) =>
                  setSelectedCohortId(value === "all" ? undefined : Number(value))
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cohorts</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id.toString()}>
                      {cohort.name} ({cohort.memberCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Search */}
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-[200px]"
            />
          </div>

          {/* Priority Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={priorityFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("all")}
            >
              All ({queueSummary?.totalClients || 0})
            </Button>
            <Button
              variant={priorityFilter === "red" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("red")}
              className={priorityFilter !== "red" ? "border-red-300 text-red-700 hover:bg-red-50" : ""}
            >
              Red ({queueSummary?.redPriority || 0})
            </Button>
            <Button
              variant={priorityFilter === "amber" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("amber")}
              className={priorityFilter === "amber" ? "bg-amber-600" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
            >
              Amber ({queueSummary?.amberPriority || 0})
            </Button>
            <Button
              variant={priorityFilter === "green" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("green")}
              className={priorityFilter === "green" ? "bg-green-600" : "border-green-300 text-green-700 hover:bg-green-50"}
            >
              Green ({queueSummary?.greenPriority || 0})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No clients found for this week.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-right p-3 font-medium">Check-ins</th>
                    <th className="text-left p-3 font-medium">Last Check-in</th>
                    <th className="text-left p-3 font-medium">Reasons</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <Fragment key={client.clientId}>
                      <ClientRow
                        client={client}
                        weekStart={selectedWeekStart}
                        isExpanded={expandedClient === client.clientId}
                        onToggle={() =>
                          setExpandedClient(
                            expandedClient === client.clientId ? null : client.clientId
                          )
                        }
                        getPriorityBadge={getPriorityBadge}
                      />
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Client Row Component
interface ClientRowProps {
  client: ClientWeeklySummary
  weekStart: string
  isExpanded: boolean
  onToggle: () => void
  getPriorityBadge: (priority: string) => ReactNode
}

function ClientRow({ client, weekStart, isExpanded, onToggle, getPriorityBadge }: ClientRowProps) {
  const { data: response } = useWeeklyResponse(client.clientId, weekStart)
  const saveMutation = useSaveWeeklyResponse()
  const [loomUrl, setLoomUrl] = useState("")
  const [note, setNote] = useState("")
  const [copied, setCopied] = useState(false)

  // Sync local state with fetched data
  useEffect(() => {
    if (response) {
      setLoomUrl(response.loomUrl || "")
      setNote(response.note || "")
    }
  }, [response])

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      clientId: client.clientId,
      weekStart,
      loomUrl: loomUrl || null,
      note: note || null,
    })
  }

  const handleCopyEmail = () => {
    const emailDraft = generateWeeklyEmailDraft({
      clientName: client.name,
      weekStart,
      stats: client.stats,
      loomUrl: loomUrl || undefined,
    })
    navigator.clipboard.writeText(emailDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const priority = client.attentionScore?.priority || "green"
  const rowClass = priority === "red"
    ? "bg-red-50/50"
    : priority === "amber"
    ? "bg-amber-50/50"
    : ""

  return (
    <>
      <tr className={`border-b hover:bg-muted/30 ${rowClass}`}>
        <td className="p-3">
          <div className="font-medium">{client.name || "Unknown"}</div>
          <div className="text-sm text-muted-foreground">{client.email}</div>
          <div className="text-xs text-muted-foreground">{client.cohortName}</div>
        </td>
        <td className="p-3">{getPriorityBadge(priority)}</td>
        <td className="p-3 text-right">
          <span className={
            client.stats.checkInRate >= 0.7
              ? "text-green-600"
              : client.stats.checkInRate >= 0.4
              ? "text-amber-600"
              : "text-red-600"
          }>
            {client.stats.checkInCount}/{client.stats.expectedCheckIns}
          </span>
          <div className="text-xs text-muted-foreground">
            ({Math.round(client.stats.checkInRate * 100)}%)
          </div>
        </td>
        <td className="p-3">
          {client.lastCheckInDate
            ? format(new Date(client.lastCheckInDate), "MMM d, yyyy")
            : "Never"}
        </td>
        <td className="p-3 max-w-[200px]">
          <div className="text-sm text-muted-foreground truncate">
            {client.attentionScore?.reasons.join(", ") || "On track"}
          </div>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
            >
              {isExpanded ? "Hide" : "Review"}
            </Button>
            {(response?.loomUrl || response?.note) && (
              <Badge className="bg-blue-100 text-blue-800">Reviewed</Badge>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Review Panel */}
      {isExpanded && (
        <tr className="border-b">
          <td colSpan={6} className="p-4 bg-muted/20">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Stats Summary */}
              <div className="space-y-4">
                <h4 className="font-semibold">Weekly Stats</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Check-ins</div>
                    <div className="font-medium">
                      {client.stats.checkInCount}/{client.stats.expectedCheckIns}
                    </div>
                  </div>
                  {client.stats.avgWeight && (
                    <div>
                      <div className="text-muted-foreground">Avg Weight</div>
                      <div className="font-medium">
                        {client.stats.avgWeight.toFixed(1)} lbs
                        {client.stats.weightTrend && (
                          <span className={client.stats.weightTrend > 0 ? "text-red-600" : "text-green-600"}>
                            {" "}({client.stats.weightTrend > 0 ? "+" : ""}{client.stats.weightTrend.toFixed(1)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {client.stats.avgSteps && (
                    <div>
                      <div className="text-muted-foreground">Avg Steps</div>
                      <div className="font-medium">{client.stats.avgSteps.toLocaleString()}</div>
                    </div>
                  )}
                  {client.stats.avgStress && (
                    <div>
                      <div className="text-muted-foreground">Avg Stress</div>
                      <div className="font-medium">{client.stats.avgStress.toFixed(1)}/10</div>
                    </div>
                  )}
                </div>

                {/* Suggested Actions */}
                {client.attentionScore?.suggestedActions && client.attentionScore.suggestedActions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Suggested Actions</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {client.attentionScore.suggestedActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Response Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Loom Video URL (optional)
                  </label>
                  <Input
                    value={loomUrl}
                    onChange={(e) => setLoomUrl(e.target.value)}
                    placeholder="https://www.loom.com/share/..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Coach Notes
                  </label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add private notes for this week..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopyEmail}
                    className="flex-1"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Email"}
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
