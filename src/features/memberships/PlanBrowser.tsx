"use client"

import { useMembershipPlans, useCheckoutMembership } from "@/hooks/useMemberships"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const PLAN_TYPE_LABELS: Record<string, string> = {
  RECURRING: "Recurring",
  PACK: "Session Packs",
  PREPAID: "Prepaid",
}

const PLAN_TYPE_ORDER = ["RECURRING", "PACK", "PREPAID"]

function formatPlanPrice(plan: {
  type: string
  monthlyPrice?: unknown
  packPrice?: unknown
  prepaidPrice?: unknown
}): string {
  switch (plan.type) {
    case "RECURRING":
      return plan.monthlyPrice != null ? `$${(Number(plan.monthlyPrice) / 100).toFixed(2)}/mo` : "Contact"
    case "PACK":
      return plan.packPrice != null ? `$${(Number(plan.packPrice) / 100).toFixed(2)}` : "Contact"
    case "PREPAID":
      return plan.prepaidPrice != null ? `$${(Number(plan.prepaidPrice) / 100).toFixed(2)}` : "Contact"
    default:
      return "Contact"
  }
}

function PlanCard({
  plan,
  onSelect,
  isLoading,
}: {
  plan: {
    id: number
    name: string
    description?: string | null
    type: string
    monthlyPrice?: unknown
    packPrice?: unknown
    prepaidPrice?: unknown
    sessionsPerWeek?: number | null
    totalSessions?: number | null
    durationDays?: number | null
    [key: string]: unknown
  }
  onSelect: (planId: number) => void
  isLoading: boolean
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <Badge variant="outline">{PLAN_TYPE_LABELS[plan.type] ?? plan.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between space-y-4">
        <div>
          {plan.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {plan.description}
            </p>
          )}
          <div className="space-y-1 text-sm">
            {plan.sessionsPerWeek != null && (
              <p>
                <span className="text-muted-foreground">Sessions: </span>
                {plan.sessionsPerWeek}/week
              </p>
            )}
            {plan.totalSessions != null && (
              <p>
                <span className="text-muted-foreground">Sessions: </span>
                {plan.totalSessions} included
              </p>
            )}
            {plan.durationDays != null && (
              <p>
                <span className="text-muted-foreground">Duration: </span>
                {plan.durationDays} days
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-2xl font-bold">{formatPlanPrice(plan)}</p>
          <Button
            onClick={() => onSelect(plan.id)}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Select Plan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PlanBrowser() {
  const { data: plans, isLoading } = useMembershipPlans({ activeOnly: true })
  const checkoutMutation = useCheckoutMembership()

  const handleSelectPlan = (planId: number) => {
    checkoutMutation.mutate(planId, {
      onSuccess: (data) => {
        if (data?.url) {
          window.location.href = data.url
        }
      },
    })
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="space-y-3">
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted mt-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No membership plans are currently available. Please check back later.
        </CardContent>
      </Card>
    )
  }

  const groupedPlans: Record<string, typeof plans> = {}
  for (const plan of plans) {
    const type = plan.type ?? "OTHER"
    if (!groupedPlans[type]) {
      groupedPlans[type] = []
    }
    groupedPlans[type].push(plan)
  }

  const sortedTypes = Object.keys(groupedPlans).sort((a, b) => {
    const aIndex = PLAN_TYPE_ORDER.indexOf(a)
    const bIndex = PLAN_TYPE_ORDER.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return (
    <div className="space-y-8">
      {sortedTypes.map((type) => (
        <div key={type} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {PLAN_TYPE_LABELS[type] ?? type}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groupedPlans[type].map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={handleSelectPlan}
                isLoading={checkoutMutation.isPending}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
