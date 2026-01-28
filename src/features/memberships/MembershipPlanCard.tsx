"use client"

import { useState } from "react"
import { CreditCard, Repeat, Package, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useCheckoutMembership } from "@/hooks/useMemberships"

type MembershipPlanType = "RECURRING" | "PACK" | "PREPAID"

interface MembershipPlan {
  id: number
  name: string
  description: string | null
  type: MembershipPlanType
  monthlyPrice: unknown
  packPrice: unknown
  prepaidPrice: unknown
  sessionsPerWeek: number | null
  totalSessions: number | null
  commitmentMonths: number | null
  durationDays: number | null
  lateCancelCutoffHours: number | null
  features?: string[]
  [key: string]: unknown
}

function getTypeBadgeVariant(type: MembershipPlanType) {
  switch (type) {
    case "RECURRING":
      return "default"
    case "PACK":
      return "secondary"
    case "PREPAID":
      return "outline"
  }
}

function getTypeIcon(type: MembershipPlanType) {
  switch (type) {
    case "RECURRING":
      return <Repeat className="h-4 w-4" />
    case "PACK":
      return <Package className="h-4 w-4" />
    case "PREPAID":
      return <Clock className="h-4 w-4" />
  }
}

function formatPrice(plan: MembershipPlan): string {
  switch (plan.type) {
    case "RECURRING":
      return plan.monthlyPrice != null
        ? `$${(Number(plan.monthlyPrice) / 100).toFixed(2)}/mo`
        : "Contact for pricing"
    case "PACK":
      return plan.packPrice != null
        ? `$${(Number(plan.packPrice) / 100).toFixed(2)}`
        : "Contact for pricing"
    case "PREPAID":
      return plan.prepaidPrice != null
        ? `$${(Number(plan.prepaidPrice) / 100).toFixed(2)}`
        : "Contact for pricing"
  }
}

function getPlanDetails(plan: MembershipPlan): string[] {
  const details: string[] = []
  switch (plan.type) {
    case "RECURRING":
      if (plan.sessionsPerWeek) details.push(`${plan.sessionsPerWeek} sessions per week`)
      if (plan.commitmentMonths) details.push(`${plan.commitmentMonths} month commitment`)
      break
    case "PACK":
      if (plan.totalSessions) details.push(`${plan.totalSessions} sessions included`)
      break
    case "PREPAID":
      if (plan.durationDays) details.push(`${plan.durationDays} day access`)
      break
  }
  if (plan.lateCancelCutoffHours) {
    details.push(`${plan.lateCancelCutoffHours}h cancellation policy`)
  }
  return details
}

interface MembershipPlanCardProps {
  plan: MembershipPlan
}

export function MembershipPlanCard({ plan }: MembershipPlanCardProps) {
  const checkout = useCheckoutMembership()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleCheckout = async () => {
    setIsRedirecting(true)
    try {
      const result = await checkout.mutateAsync(plan.id)
      if (result?.url) {
        window.location.href = result.url
      }
    } catch {
      setIsRedirecting(false)
    }
  }

  const details = getPlanDetails(plan)
  const allFeatures = [...details, ...(plan.features ?? [])]
  const buttonLabel = plan.type === "RECURRING" ? "Subscribe" : "Buy"

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <Badge variant={getTypeBadgeVariant(plan.type)} className="flex items-center gap-1">
            {getTypeIcon(plan.type)}
            {plan.type}
          </Badge>
        </div>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-3xl font-bold mb-4">{formatPrice(plan)}</div>
        {allFeatures.length > 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {allFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">-</span>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleCheckout}
          disabled={isRedirecting || checkout.isPending}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {isRedirecting ? "Redirecting..." : buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
