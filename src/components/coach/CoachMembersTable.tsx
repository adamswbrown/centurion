"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCoachMembersOverview } from "@/hooks/useCoachAnalytics"
import type { CoachMemberOverview } from "@/app/actions/coach-analytics"
import { format } from "date-fns"
import { Users, AlertTriangle, Eye, Activity } from "lucide-react"

export function CoachMembersTable() {
  const { data: members, isLoading } = useCoachMembersOverview()
  const [search, setSearch] = useState("")
  const [cohortFilter, setCohortFilter] = useState<string>("all")

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 sm:w-[250px]" />
          <Skeleton className="h-10 sm:w-[200px]" />
        </div>

        {/* Loading Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No members found. Members will appear here once they are added to your cohorts.
        </CardContent>
      </Card>
    )
  }

  // Extract unique cohort names for filter
  const cohortNames = Array.from(new Set(members.map((m) => m.cohortName)))

  // Apply filters
  const filtered = members.filter((m) => {
    if (cohortFilter !== "all" && m.cohortName !== cohortFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (
        !m.memberName?.toLowerCase().includes(s) &&
        !m.memberEmail.toLowerCase().includes(s)
      )
        return false
    }
    return true
  })

  // Summary stats
  const total = members.length
  const activeThisWeek = members.filter((m) => m.checkInsThisWeek > 0).length
  const redCount = members.filter((m) => m.priority === "red").length
  const amberCount = members.filter((m) => m.priority === "amber").length

  const priorityBadge = (priority: CoachMemberOverview["priority"]) => {
    switch (priority) {
      case "red":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Needs Attention</Badge>
      case "amber":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Watch</Badge>
      case "green":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Stable</Badge>
    }
  }

  const questionnaireBadge = (status: CoachMemberOverview["questionnaireStatus"]) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="default">Completed</Badge>
      case "IN_PROGRESS":
        return <Badge variant="outline" className="border-amber-300 text-amber-700">In Progress</Badge>
      case "NOT_STARTED":
        return <Badge variant="outline" className="border-red-300 text-red-700">Not Started</Badge>
      case "N/A":
        return <span className="text-sm text-muted-foreground">N/A</span>
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Week</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? Math.round((activeThisWeek / total) * 100) : 0}% checked in
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{redCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Watch Closely</CardTitle>
            <Eye className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{amberCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-[250px]"
        />
        {cohortNames.length > 1 && (
          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="All cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cohorts</SelectItem>
              {cohortNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Member</th>
                  <th className="text-left p-3 font-medium">Cohort</th>
                  <th className="text-left p-3 font-medium">Priority</th>
                  <th className="text-right p-3 font-medium">Check-ins</th>
                  <th className="text-left p-3 font-medium">Last Check-in</th>
                  <th className="text-left p-3 font-medium">Questionnaire</th>
                  <th className="text-right p-3 font-medium">Streak</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const rowBg =
                    m.priority === "red"
                      ? "bg-red-50/50"
                      : m.priority === "amber"
                      ? "bg-amber-50/50"
                      : ""
                  const checkInColor =
                    m.expectedCheckIns > 0 && m.checkInsThisWeek / m.expectedCheckIns >= 0.7
                      ? "text-green-600"
                      : m.expectedCheckIns > 0 && m.checkInsThisWeek / m.expectedCheckIns >= 0.4
                      ? "text-amber-600"
                      : "text-red-600"

                  return (
                    <tr
                      key={m.memberId}
                      className={`border-b hover:bg-muted/30 ${rowBg}`}
                    >
                      <td className="p-3">
                        <Link
                          href={`/members/${m.memberId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {m.memberName || m.memberEmail}
                        </Link>
                        {m.memberName && (
                          <div className="text-xs text-muted-foreground">
                            {m.memberEmail}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-sm">{m.cohortName}</td>
                      <td className="p-3">{priorityBadge(m.priority)}</td>
                      <td className="p-3 text-right">
                        <span className={checkInColor}>
                          {m.checkInsThisWeek}/{m.expectedCheckIns}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {m.lastCheckIn
                          ? format(new Date(m.lastCheckIn), "MMM d, yyyy")
                          : "Never"}
                      </td>
                      <td className="p-3">{questionnaireBadge(m.questionnaireStatus)}</td>
                      <td className="p-3 text-right text-sm">
                        {m.currentStreak > 0 ? `${m.currentStreak}d` : "—"}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No members match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
