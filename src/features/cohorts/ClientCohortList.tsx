"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useMyCohorts } from "@/hooks/useClientCohorts"

export function ClientCohortList() {
  const { data: memberships, isLoading } = useMyCohorts()

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading cohorts...</div>
  }

  if (!memberships || memberships.length === 0) {
    return <div className="text-sm text-muted-foreground">No cohorts assigned yet.</div>
  }

  return (
    <div className="space-y-3">
      {memberships.map((membership) => (
        <div key={membership.id} className="rounded-md border p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{membership.cohort.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(membership.cohort.startDate), "MMM dd, yyyy")}
                {membership.cohort.endDate
                  ? ` - ${format(new Date(membership.cohort.endDate), "MMM dd, yyyy")}`
                  : ""}
              </p>
            </div>
            <Badge variant="outline">{membership.status}</Badge>
          </div>
          {membership.cohort.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {membership.cohort.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
