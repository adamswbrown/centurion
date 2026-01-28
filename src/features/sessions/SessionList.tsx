"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Filter } from "lucide-react"
import { useSessions } from "@/hooks/useSessions"
import { useClassTypes } from "@/hooks/useClassTypes"
import Link from "next/link"

const STATUS_OPTIONS = ["ALL", "SCHEDULED", "CANCELLED", "COMPLETED"] as const

function statusBadgeVariant(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "secondary"
    case "CANCELLED":
      return "destructive"
    case "COMPLETED":
      return "default"
    default:
      return "outline"
  }
}

interface SessionListProps {
  onSelectSession?: (sessionId: number) => void
}

export function SessionList({ onSelectSession }: SessionListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [classTypeFilter, setClassTypeFilter] = useState<string>("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const { data: classTypes } = useClassTypes({ activeOnly: true })

  const { data: sessions, isLoading } = useSessions({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    classTypeId:
      classTypeFilter !== "ALL" ? Number(classTypeFilter) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const sessionList = sessions ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Class Type</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={classTypeFilter}
              onChange={(e) => setClassTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {(classTypes ?? []).map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sessions...</p>
      ) : sessionList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class Type</TableHead>
              <TableHead>Date / Time</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionList.map((session) => {
              const regCount = session._count?.registrations ?? 0

              return (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {onSelectSession ? (
                      <button
                        className="text-left hover:underline"
                        onClick={() => onSelectSession(session.id)}
                      >
                        {session.title}
                      </button>
                    ) : (
                      <Link
                        href={`/sessions/${session.id}`}
                        className="hover:underline"
                      >
                        {session.title}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    {session.classType ? (
                      <Badge
                        style={{
                          backgroundColor: session.classType.color ?? undefined,
                          color: "#fff",
                        }}
                      >
                        {session.classType.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(session.startTime), "MMM dd, yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(session.startTime), "h:mm a")} -{" "}
                      {format(new Date(session.endTime), "h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.coach?.name || session.coach?.email || "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        regCount >= session.maxOccupancy
                          ? "font-semibold text-orange-600"
                          : ""
                      }
                    >
                      {regCount}/{session.maxOccupancy}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(session.status)}>
                      {session.status.charAt(0) +
                        session.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
