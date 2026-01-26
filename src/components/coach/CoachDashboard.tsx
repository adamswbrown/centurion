"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCoachInsights } from "@/hooks/useCoachAnalytics"
import { AttentionScoreCard } from "./AttentionScoreCard"
import { MemberCheckInList } from "./MemberCheckInList"
import { WeeklyQuestionnaireReport } from "./WeeklyQuestionnaireReport"

/**
 * CoachDashboard - Main coach analytics dashboard
 * Displays attention scores, member insights, and analytics
 * Generated with Claude Code
 */

export function CoachDashboard() {
  const { data: insights, isLoading } = useCoachInsights()
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Coach Dashboard</h1>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Coach Dashboard</h1>
          <p className="text-muted-foreground">Unable to load insights</p>
        </div>
      </div>
    )
  }

  const redScores = insights.attentionScores.filter((s) => s.priority === "red")
  const amberScores = insights.attentionScores.filter((s) => s.priority === "amber")
  const greenScores = insights.attentionScores.filter((s) => s.priority === "green")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor member engagement and prioritize outreach
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {insights.activeMembersCount} active, {insights.inactiveMembersCount} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Check-Ins/Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.avgCheckInsPerWeek.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Per member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{redScores.length}</div>
            <p className="text-xs text-muted-foreground">High priority members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Closely</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {amberScores.length}
            </div>
            <p className="text-xs text-muted-foreground">Medium priority members</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Detail View */}
      {selectedMemberId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Member Details</h2>
            <button
              onClick={() => setSelectedMemberId(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              Back to overview
            </button>
          </div>
          <MemberCheckInList memberId={selectedMemberId} />
        </div>
      )}

      {/* Attention Queue */}
      {!selectedMemberId && (
        <>
          {/* High Priority (Red) */}
          {redScores.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Needs Attention</h2>
                <Badge variant="destructive">{redScores.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {redScores.map((score) => (
                  <AttentionScoreCard
                    key={score.memberId}
                    score={score}
                    onClick={() => setSelectedMemberId(score.memberId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority (Amber) */}
          {amberScores.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Watch Closely</h2>
                <Badge variant="outline" className="bg-amber-100">
                  {amberScores.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {amberScores.map((score) => (
                  <AttentionScoreCard
                    key={score.memberId}
                    score={score}
                    onClick={() => setSelectedMemberId(score.memberId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low Priority (Green) */}
          {greenScores.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Stable Members</h2>
                <Badge variant="outline" className="bg-green-100">
                  {greenScores.length}
                </Badge>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-sm text-blue-600 hover:underline list-none">
                  Show {greenScores.length} stable members
                </summary>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {greenScores.map((score) => (
                    <AttentionScoreCard
                      key={score.memberId}
                      score={score}
                      onClick={() => setSelectedMemberId(score.memberId)}
                    />
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Questionnaire Report */}
          <WeeklyQuestionnaireReport />
        </>
      )}

      {/* Empty State */}
      {insights.totalMembers === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Members Yet</CardTitle>
            <CardDescription>
              Start by inviting members to your cohorts
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
