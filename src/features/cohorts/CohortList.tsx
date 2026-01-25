"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCohorts } from "@/hooks/useCohorts"
import { CohortStatus } from "@prisma/client"

const statusColors = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
}

export function CohortList() {
  const [statusFilter, setStatusFilter] = useState<CohortStatus | "ALL">("ALL")
  const { data: cohorts, isLoading } = useCohorts(
    statusFilter !== "ALL" ? { status: statusFilter } : undefined,
  )

  if (isLoading) {
    return <div>Loading cohorts...</div>
  }

  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No cohorts found. Create one to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by status:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as CohortStatus | "ALL")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Cohorts</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((cohort) => (
          <Card key={cohort.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{cohort.name}</CardTitle>
                <Badge className={statusColors[cohort.status]} variant="secondary">
                  {cohort.status}
                </Badge>
              </div>
              <CardDescription>
                {format(new Date(cohort.startDate), "MMM dd, yyyy")}
                {cohort.endDate && (
                  <>
                    {" "}- {format(new Date(cohort.endDate), "MMM dd, yyyy")}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cohort.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {cohort.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{cohort._count.members} members</span>
                <span>{cohort._count.coaches} coaches</span>
              </div>

              <Link href={`/cohorts/${cohort.id}`}>
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
