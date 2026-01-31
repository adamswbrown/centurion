"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useUserActiveMembership,
  useUserMembershipHistory,
} from "@/hooks/useMemberships"
import { SessionUsageBar } from "./SessionUsageBar"

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

interface UserMembershipDetailProps {
  userId: number
}

export function UserMembershipDetail({ userId }: UserMembershipDetailProps) {
  const { data: activeMembership, isLoading: activeLoading } = useUserActiveMembership(userId)
  const { data: history, isLoading: historyLoading } = useUserMembershipHistory(userId)

  if (activeLoading) {
    return <div className="text-sm text-muted-foreground">Loading membership details...</div>
  }

  return (
    <div className="space-y-6">
      {/* Active Membership */}
      {activeMembership ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {activeMembership.plan?.name ?? "Membership"}
              </CardTitle>
              <Badge variant={getStatusBadgeVariant(activeMembership.status)}>
                {activeMembership.status}
              </Badge>
            </div>
            {activeMembership.plan?.type && (
              <CardDescription>
                {activeMembership.plan.type} plan
                {activeMembership.startDate && (
                  <> &middot; Started {format(new Date(activeMembership.startDate), "MMM d, yyyy")}</>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Usage Stats */}
            {activeMembership.plan?.type === "RECURRING" && (
              <SessionUsageBar
                type="recurring"
                used={0}
                limit={activeMembership.plan.sessionsPerWeek ?? 0}
              />
            )}
            {activeMembership.plan?.type === "PACK" && (
              <SessionUsageBar
                type="pack"
                remaining={activeMembership.sessionsRemaining ?? 0}
                total={activeMembership.plan.totalSessions ?? 0}
              />
            )}
            {activeMembership.plan?.type === "PREPAID" && activeMembership.endDate && (
              <SessionUsageBar
                type="prepaid"
                daysRemaining={Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                total={activeMembership.plan.durationDays ?? undefined}
                endDate={format(new Date(activeMembership.endDate), "MMM d, yyyy")}
              />
            )}

            {/* Plan Details */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
              {activeMembership.plan?.type === "RECURRING" && (
                <>
                  <div>
                    <span className="text-muted-foreground">Sessions/Week</span>
                    <p className="font-medium">{activeMembership.plan.sessionsPerWeek ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly Price</span>
                    <p className="font-medium">
                      {activeMembership.plan.monthlyPrice != null
                        ? `$${(Number(activeMembership.plan.monthlyPrice) / 100).toFixed(2)}`
                        : "-"}
                    </p>
                  </div>
                </>
              )}
              {activeMembership.plan?.type === "PACK" && (
                <>
                  <div>
                    <span className="text-muted-foreground">Total Sessions</span>
                    <p className="font-medium">{activeMembership.plan.totalSessions ?? "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining</span>
                    <p className="font-medium">{activeMembership.sessionsRemaining ?? "-"}</p>
                  </div>
                </>
              )}
              {activeMembership.plan?.type === "PREPAID" && (
                <>
                  <div>
                    <span className="text-muted-foreground">Duration</span>
                    <p className="font-medium">
                      {activeMembership.plan.durationDays
                        ? `${activeMembership.plan.durationDays} days`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days Left</span>
                    <p className="font-medium">
                      {activeMembership.endDate
                        ? Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                        : "-"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No active membership for this user.
          </CardContent>
        </Card>
      )}

      {/* Membership History */}
      <div className="space-y-3">
        <h3 className="font-semibold">Membership History</h3>
        {historyLoading ? (
          <div className="text-sm text-muted-foreground">Loading history...</div>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No membership history.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.plan?.name ?? "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.plan?.type ?? "-"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(entry.status)}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.startDate
                      ? format(new Date(entry.startDate), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {entry.endDate
                      ? format(new Date(entry.endDate), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
