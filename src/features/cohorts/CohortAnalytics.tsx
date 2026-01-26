"use client"

import { useQuery } from "@tanstack/react-query"
import { getCohortCheckInAnalytics } from "@/app/actions/cohort-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

interface CohortAnalyticsProps {
  cohortId: number
}

export function CohortAnalytics({ cohortId }: CohortAnalyticsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cohortAnalytics", cohortId],
    queryFn: () => getCohortCheckInAnalytics({ cohortId }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-In Compliance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Loading analytics...</p>}
        {error && <p className="text-destructive">Error loading analytics</p>}
        {data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Check-Ins</TableHead>
                <TableHead className="text-right">Current Streak</TableHead>
                <TableHead className="text-right">Last Check-In</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.memberId}>
                  <TableCell>
                    <span className="font-medium">{row.name || row.email}</span>
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{row.totalCheckIns}</TableCell>
                  <TableCell className="text-right">{row.currentStreak}</TableCell>
                  <TableCell className="text-right">
                    {row.lastCheckIn ? format(new Date(row.lastCheckIn), "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
