"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface WrappedStatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtext?: string
  color?: string
}

export function WrappedStatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = "text-primary",
}: WrappedStatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 text-center space-y-2">
        <Icon className={cn("h-8 w-8 mx-auto", color)} />
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        {subtext && (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  )
}
