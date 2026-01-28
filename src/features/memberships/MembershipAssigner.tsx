"use client"

import { useState } from "react"
import { UserPlus, Pause, Play, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useMembershipPlans,
  useUserActiveMembership,
  useAssignMembership,
  usePauseMembership,
  useResumeMembership,
  useCancelMembership,
} from "@/hooks/useMemberships"

type MembershipTierStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED"

function getStatusBadgeVariant(status: MembershipTierStatus) {
  switch (status) {
    case "ACTIVE":
      return "default" as const
    case "PAUSED":
      return "secondary" as const
    case "EXPIRED":
      return "outline" as const
    case "CANCELLED":
      return "destructive" as const
  }
}

interface MembershipAssignerProps {
  userId: number
}

export function MembershipAssigner({ userId }: MembershipAssignerProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")

  const { data: plans, isLoading: plansLoading } = useMembershipPlans({ activeOnly: true })
  const { data: activeMembership, isLoading: membershipLoading } = useUserActiveMembership(userId)
  const assignMembership = useAssignMembership()
  const pauseMembership = usePauseMembership()
  const resumeMembership = useResumeMembership()
  const cancelMembership = useCancelMembership()

  const isLoading = plansLoading || membershipLoading

  const handleAssign = async () => {
    if (!selectedPlanId) return
    await assignMembership.mutateAsync({ userId, planId: parseInt(selectedPlanId, 10) })
    setSelectedPlanId("")
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading membership data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Current Membership */}
      {activeMembership ? (
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Current Membership</h4>
            <Badge variant={getStatusBadgeVariant(activeMembership.status)}>
              {activeMembership.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{activeMembership.plan?.name}</p>
            {activeMembership.plan?.type && (
              <p>Type: {activeMembership.plan.type}</p>
            )}
          </div>
          <div className="flex gap-2">
            {activeMembership.status === "ACTIVE" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pauseMembership.mutate(activeMembership.id)}
                  disabled={pauseMembership.isPending}
                >
                  <Pause className="h-3.5 w-3.5 mr-1" />
                  {pauseMembership.isPending ? "Pausing..." : "Pause"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelMembership.mutate(activeMembership.id)}
                  disabled={cancelMembership.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  {cancelMembership.isPending ? "Cancelling..." : "Cancel"}
                </Button>
              </>
            )}
            {activeMembership.status === "PAUSED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resumeMembership.mutate(activeMembership.id)}
                  disabled={resumeMembership.isPending}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {resumeMembership.isPending ? "Resuming..." : "Resume"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelMembership.mutate(activeMembership.id)}
                  disabled={cancelMembership.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  {cancelMembership.isPending ? "Cancelling..." : "Cancel"}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No active membership
        </div>
      )}

      {/* Assign New Plan */}
      <div className="space-y-3">
        <Label>Assign Membership Plan</Label>
        <div className="flex gap-2">
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a plan..." />
            </SelectTrigger>
            <SelectContent>
              {plans && plans.length > 0 ? (
                plans.map((plan: { id: number; name: string; type: string }) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.name} ({plan.type})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__none" disabled>
                  No active plans available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={!selectedPlanId || assignMembership.isPending}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            {assignMembership.isPending ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  )
}
