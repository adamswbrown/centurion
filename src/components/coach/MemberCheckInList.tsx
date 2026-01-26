"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMemberCheckInData } from "@/hooks/useCoachAnalytics"
import { format } from "date-fns"

/**
 * MemberCheckInList - Display member's check-in history
 * Generated with Claude Code
 */

interface MemberCheckInListProps {
  memberId: number
}

export function MemberCheckInList({ memberId }: MemberCheckInListProps) {
  const { data: checkInData, isLoading } = useMemberCheckInData(memberId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check-In History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!checkInData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check-In History</CardTitle>
          <CardDescription>Member not found</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Check-In History</CardTitle>
            <CardDescription>
              {checkInData.memberName || checkInData.memberEmail}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total: {checkInData.totalCheckIns}</div>
            <div className="text-sm text-gray-600">Streak: {checkInData.currentStreak} days</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {checkInData.checkIns.length === 0 ? (
          <p className="text-sm text-gray-500">No check-ins in the last 30 days</p>
        ) : (
          <div className="space-y-2">
            {checkInData.checkIns.map((checkIn, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {format(new Date(checkIn.date), "EEEE, MMMM d, yyyy")}
                  </div>
                  {idx === 0 && (
                    <Badge variant="outline" className="text-xs">
                      Latest
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {checkIn.weight && (
                    <div>
                      <span className="text-gray-600">Weight:</span>{" "}
                      <span className="font-medium">{checkIn.weight} lbs</span>
                    </div>
                  )}
                  {checkIn.steps && (
                    <div>
                      <span className="text-gray-600">Steps:</span>{" "}
                      <span className="font-medium">{checkIn.steps.toLocaleString()}</span>
                    </div>
                  )}
                  {checkIn.calories && (
                    <div>
                      <span className="text-gray-600">Calories:</span>{" "}
                      <span className="font-medium">{checkIn.calories}</span>
                    </div>
                  )}
                  {checkIn.sleepQuality && (
                    <div>
                      <span className="text-gray-600">Sleep:</span>{" "}
                      <span className="font-medium">{checkIn.sleepQuality}/10</span>
                    </div>
                  )}
                  {checkIn.perceivedStress && (
                    <div>
                      <span className="text-gray-600">Stress:</span>{" "}
                      <span className="font-medium">
                        {checkIn.perceivedStress}/10
                      </span>
                      {checkIn.perceivedStress >= 8 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          High
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {checkIn.notes && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Notes:</span> {checkIn.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
