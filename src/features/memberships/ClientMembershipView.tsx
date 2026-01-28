"use client"

import {
  useUserActiveMembership,
  useUserMembershipHistory,
} from "@/hooks/useMemberships"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"

interface ClientMembershipViewProps {
  userId: number
}

export function ClientMembershipView({ userId }: ClientMembershipViewProps) {
  const { data: activeMembership, isLoading: activeLoading } =
    useUserActiveMembership(userId)
  const { data: history, isLoading: historyLoading } =
    useUserMembershipHistory(userId)

  if (activeLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-2">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {activeMembership ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              <Badge>{activeMembership.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold">
                {activeMembership.plan?.name ?? "Membership Plan"}
              </p>
              {activeMembership.plan?.description && (
                <p className="text-sm text-muted-foreground">
                  {activeMembership.plan.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {activeMembership.startDate && (
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(activeMembership.startDate), "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {activeMembership.endDate && (
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {format(new Date(activeMembership.endDate), "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {activeMembership.sessionsRemaining != null && (
                <div>
                  <p className="text-muted-foreground">Sessions Remaining</p>
                  <p className="font-medium">
                    {activeMembership.sessionsRemaining}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have an active membership.
            </p>
            <Button asChild>
              <Link href="/client/membership/plans">Browse Plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Membership History</h2>
        {activeMembership && (
          <Button variant="outline" asChild>
            <Link href="/client/membership/plans">Browse Plans</Link>
          </Button>
        )}
      </div>

      {historyLoading ? (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : history && history.length > 0 ? (
        <div className="space-y-3">
          {history.map((membership) => (
            <Card key={membership.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    {membership.plan?.name ?? "Plan"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {membership.startDate
                      ? format(new Date(membership.startDate), "MMM d, yyyy")
                      : "N/A"}
                    {membership.endDate &&
                      ` - ${format(new Date(membership.endDate), "MMM d, yyyy")}`}
                  </p>
                </div>
                <Badge variant="outline">{membership.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No membership history found.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
