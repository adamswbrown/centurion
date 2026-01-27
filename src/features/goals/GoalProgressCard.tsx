"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GoalProgressCardProps {
  title: string
  current: number | null
  target: number | null
  unit: string
  /** If true, lower is better (e.g., weight loss). Otherwise higher is better (e.g., steps). */
  lowerIsBetter?: boolean
}

export function GoalProgressCard({
  title,
  current,
  target,
  unit,
  lowerIsBetter = false,
}: GoalProgressCardProps) {
  if (target == null) return null

  const hasProgress = current != null && target != null && target > 0

  let percentage = 0
  if (hasProgress) {
    if (lowerIsBetter) {
      // For weight loss: percentage toward target (lower)
      // If start was higher, progress = how much we've reduced
      // Simple: show current / target ratio capped at 100
      percentage = Math.min(100, Math.max(0, (target / current!) * 100))
    } else {
      percentage = Math.min(100, Math.max(0, (current! / target) * 100))
    }
  }

  const progressColor =
    percentage >= 100
      ? "bg-emerald-500"
      : percentage >= 75
        ? "bg-emerald-400"
        : percentage >= 50
          ? "bg-yellow-400"
          : "bg-orange-400"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {current != null ? current.toLocaleString() : "--"}
          </span>
          <span className="text-sm text-muted-foreground">
            / {target.toLocaleString()} {unit}
          </span>
        </div>

        {hasProgress && (
          <>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(percentage)}% of goal
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
