"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format, differenceInDays, differenceInWeeks } from "date-fns"
import { Calendar, Clock, Users } from "lucide-react"

interface CohortInfoCardProps {
  cohort: {
    id: number
    name: string
    type: string | null
    startDate: Date | null
    endDate: Date | null
    checkInFrequencyDays: number | null
    coaches: Array<{
      id: number
      name: string | null
      email: string
      image: string | null
    }>
  }
  lastCheckIn: Date | null
  checkInOverdue: boolean
}

export function CohortInfoCard({ cohort, lastCheckIn, checkInOverdue }: CohortInfoCardProps) {
  const frequency = cohort.checkInFrequencyDays || 1
  const frequencyLabel =
    frequency === 1
      ? "Daily"
      : frequency === 7
        ? "Weekly"
        : `Every ${frequency} days`

  // Calculate program progress
  let weekNumber: number | null = null
  let totalWeeks: number | null = null

  if (cohort.startDate) {
    const now = new Date()
    weekNumber = Math.max(1, differenceInWeeks(now, cohort.startDate) + 1)

    if (cohort.endDate) {
      totalWeeks = differenceInWeeks(cohort.endDate, cohort.startDate) + 1
    }
  }

  const typeLabel = cohort.type
    ? cohort.type.charAt(0) + cohort.type.slice(1).toLowerCase()
    : "Program"

  const coach = cohort.coaches[0]

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{cohort.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {typeLabel}
              </Badge>
              {weekNumber && totalWeeks && (
                <Badge variant="outline" className="text-xs">
                  Week {weekNumber} of {totalWeeks}
                </Badge>
              )}
            </div>
          </div>
          {coach && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={coach.image || undefined} />
                <AvatarFallback className="text-xs">
                  {coach.name?.charAt(0) || coach.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium">{coach.name || "Coach"}</p>
                <p className="text-xs text-muted-foreground">Your Coach</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Check-in</p>
              <p className="font-medium">{frequencyLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Last Check-in</p>
              <p className={`font-medium ${checkInOverdue ? "text-red-600" : ""}`}>
                {lastCheckIn ? format(new Date(lastCheckIn), "MMM d") : "None yet"}
                {checkInOverdue && " ⚠"}
              </p>
            </div>
          </div>
        </div>

        {cohort.startDate && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            Started {format(new Date(cohort.startDate), "MMMM d, yyyy")}
            {cohort.endDate && ` • Ends ${format(new Date(cohort.endDate), "MMMM d, yyyy")}`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
