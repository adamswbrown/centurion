"use client"

import { Badge } from "@/components/ui/badge"
import { Coins } from "lucide-react"

interface CreditBalanceWidgetProps {
  balance: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function CreditBalanceWidget({
  balance,
  showLabel = true,
  size = "md",
}: CreditBalanceWidgetProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const variant = balance <= 0 ? "destructive" : balance <= 5 ? "secondary" : "default"

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className={`text-muted-foreground ${sizeClasses[size]}`}>Credits:</span>
      )}
      <Badge variant={variant} className="flex items-center gap-1">
        <Coins className={iconSizes[size]} />
        <span className={sizeClasses[size]}>{balance}</span>
      </Badge>
    </div>
  )
}
