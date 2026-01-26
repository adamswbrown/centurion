"use client"

import { useEntries } from "@/hooks/useEntries"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CheckInHistoryProps {
  userId?: number
  limit?: number
}

export function CheckInHistory({ userId, limit = 30 }: CheckInHistoryProps) {
  const { data: entries, isLoading } = useEntries({ userId, limit })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-muted-foreground">Loading check-in history...</p>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Check-In History</h2>
        <p className="text-muted-foreground">No check-ins recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Check-In History</h2>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Weight (lbs)</TableHead>
              <TableHead className="text-right">Steps</TableHead>
              <TableHead className="text-right">Calories</TableHead>
              <TableHead className="text-right">Sleep</TableHead>
              <TableHead className="text-right">Stress</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {format(new Date(entry.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  {entry.weight !== null ? entry.weight.toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {entry.steps !== null ? entry.steps.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {entry.calories !== null ? entry.calories.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {entry.sleepQuality !== null ? `${entry.sleepQuality}/10` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {entry.perceivedStress !== null ? `${entry.perceivedStress}/10` : "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={entry.notes || undefined}>
                  {entry.notes ? (
                    <span className="text-sm text-muted-foreground">{entry.notes}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
