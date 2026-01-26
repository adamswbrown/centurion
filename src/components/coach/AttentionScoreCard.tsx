"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MemberAttentionScore } from "@/app/actions/coach-analytics"
import { format } from "date-fns"

/**
 * AttentionScoreCard - Display member attention score and insights
 * Based on CoachFit AttentionCard pattern
 * Generated with Claude Code
 */

interface AttentionScoreCardProps {
  score: MemberAttentionScore
  onClick?: () => void
}

export function AttentionScoreCard({ score, onClick }: AttentionScoreCardProps) {
  const priorityColors = {
    red: "border-red-300 bg-red-50",
    amber: "border-amber-300 bg-amber-50",
    green: "border-green-300 bg-green-50",
  }

  const priorityBadgeColors = {
    red: "bg-red-600 hover:bg-red-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    green: "bg-green-600 hover:bg-green-700",
  }

  const priorityLabels = {
    red: "Needs Attention",
    amber: "Watch Closely",
    green: "Stable",
  }

  return (
    <Card
      className={`${priorityColors[score.priority]} hover:shadow-md transition-shadow ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={`${priorityBadgeColors[score.priority]} text-white`}
            >
              {priorityLabels[score.priority]}
            </Badge>
            <span className="text-xs font-semibold text-gray-700">
              Score: {score.score}
            </span>
          </div>
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900 mt-2">
          {score.memberName || score.memberEmail}
        </CardTitle>
        {score.memberName && (
          <p className="text-sm text-gray-600">{score.memberEmail}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/50 rounded p-2">
            <div className="text-xs text-gray-600">Last Check-in</div>
            <div className="text-sm font-semibold">
              {score.lastCheckIn
                ? format(new Date(score.lastCheckIn), "MMM d")
                : "Never"}
            </div>
          </div>
          <div className="bg-white/50 rounded p-2">
            <div className="text-xs text-gray-600">Total</div>
            <div className="text-sm font-semibold">{score.totalCheckIns}</div>
          </div>
          <div className="bg-white/50 rounded p-2">
            <div className="text-xs text-gray-600">Streak</div>
            <div className="text-sm font-semibold">{score.currentStreak}d</div>
          </div>
        </div>

        {/* Reasons */}
        {score.reasons.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Reasons:</p>
            <ul className="list-disc list-inside space-y-1">
              {score.reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-gray-600">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Actions */}
        {score.suggestedActions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">
              Suggested Actions:
            </p>
            <div className="flex flex-wrap gap-1">
              {score.suggestedActions.map((action, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-white border border-gray-300 rounded"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
