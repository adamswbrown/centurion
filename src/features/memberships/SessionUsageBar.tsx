"use client"

import { cn } from "@/lib/utils"

interface SessionUsageBarProps {
  type: "recurring" | "pack" | "prepaid"
  used?: number
  limit?: number
  remaining?: number
  total?: number
  daysRemaining?: number
  endDate?: string
}

function getPercentage(type: SessionUsageBarProps["type"], props: SessionUsageBarProps): number {
  switch (type) {
    case "recurring": {
      if (!props.limit || props.limit === 0) return 0
      return Math.min(((props.used ?? 0) / props.limit) * 100, 100)
    }
    case "pack": {
      if (!props.total || props.total === 0) return 0
      const used = props.total - (props.remaining ?? 0)
      return Math.min((used / props.total) * 100, 100)
    }
    case "prepaid": {
      if (!props.daysRemaining && props.daysRemaining !== 0) return 0
      // Estimate total from endDate if possible, otherwise show remaining as-is
      const totalDays = props.total ?? props.daysRemaining
      if (!totalDays || totalDays === 0) return 0
      const elapsed = totalDays - props.daysRemaining
      return Math.min((elapsed / totalDays) * 100, 100)
    }
    default:
      return 0
  }
}

function getBarColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-500"
  if (percentage >= 75) return "bg-amber-500"
  return "bg-primary"
}

export function SessionUsageBar({
  type,
  used,
  limit,
  remaining,
  total,
  daysRemaining,
  endDate,
}: SessionUsageBarProps) {
  const percentage = getPercentage(type, { type, used, limit, remaining, total, daysRemaining, endDate })
  const barColor = getBarColor(percentage)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        {type === "recurring" && (
          <>
            <span className="text-muted-foreground">Weekly sessions</span>
            <span className="font-medium">
              {used ?? 0} / {limit ?? 0} used
            </span>
          </>
        )}
        {type === "pack" && (
          <>
            <span className="text-muted-foreground">Sessions remaining</span>
            <span className="font-medium">
              {remaining ?? 0} / {total ?? 0} left
            </span>
          </>
        )}
        {type === "prepaid" && (
          <>
            <span className="text-muted-foreground">Days remaining</span>
            <span className="font-medium">
              {daysRemaining ?? 0} days
              {endDate && (
                <span className="text-muted-foreground ml-1">
                  (ends {endDate})
                </span>
              )}
            </span>
          </>
        )}
      </div>
      <div className="h-2.5 w-full rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
