"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EditMemberDialog } from "./EditMemberDialog"

interface MemberDetailProps {
  member: {
    id: number
    name: string | null
    email: string
    image: string | null
    createdAt: Date
    emailVerified: boolean
    appointmentsAsClient: Array<{
      id: number
      title: string | null
      startTime: Date
      endTime: Date
      status: string
      fee: any
      notes: string | null
      coach: { id: number; name: string | null }
    }>
    cohortMemberships: Array<{
      id: number
      joinedAt: Date
      status: string
      cohort: {
        id: number
        name: string
      }
    }>
    invoices: Array<{
      id: number
      month: Date
      totalAmount: any
      emailSent: boolean
    }>
    entries: Array<{
      id: number
      date: Date
      weight: number | null
      steps: number | null
      calories: number | null
      sleepQuality: number | null
      perceivedStress: number | null
      notes: string | null
    }>
    questionnaireResponses: Array<{
      id: number
      weekNumber: number
      status: string
      responses: any
      updatedAt: Date
      bundle: {
        id: number
        weekNumber: number
        cohort: { id: number; name: string }
      }
    }>
  }
}

// Human-readable labels for questionnaire response keys
const RESPONSE_LABELS: Record<string, string> = {
  wins: "What went well this week?",
  challenges: "Biggest challenge this week?",
  days_trained: "Days trained in studio",
  days_hit_steps: "Days hit step target",
  days_on_calories: "Days within calorie target",
  nutrition_help: "Nutrition help needed",
  behavior_goal: "Behaviour goal for next week",
  behavior_goal_review: "Behaviour goal review",
  monthly_reflection: "Monthly reflection",
  program_reflection: "Program reflection",
  next_steps: "Goals moving forward",
}

function formatResponseKey(key: string): string {
  return RESPONSE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function MemberDetail({ member }: MemberDetailProps) {
  const [selectedResponse, setSelectedResponse] = useState<{
    weekNumber: number
    cohortName: string
    responses: Record<string, unknown>
    updatedAt: Date
  } | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{member.name}</h1>
          <p className="text-muted-foreground">{member.email}</p>
        </div>
        <EditMemberDialog member={member} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">{member.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Joined</Label>
            <p className="text-sm font-medium">
              {format(new Date(member.createdAt), "MMM dd, yyyy")}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email Verified</Label>
            <Badge variant={member.emailVerified ? "default" : "outline"}>
              {member.emailVerified ? "Verified" : "Pending"}
            </Badge>
          </div>
          <div>
            <Label className="text-muted-foreground">Cohorts</Label>
            <p className="text-sm font-medium">{member.cohortMemberships.length} active</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="checkins">
            Check-Ins ({member.entries?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="questionnaires">
            Questionnaires ({member.questionnaireResponses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="appointments">
            Appointments ({member.appointmentsAsClient.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab (Cohorts & Invoices) */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Cohorts</CardTitle>
                <CardDescription>
                  {member.cohortMemberships.length} cohort(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {member.cohortMemberships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not part of any cohorts
                  </p>
                ) : (
                  <div className="space-y-2">
                    {member.cohortMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <p className="font-medium">{membership.cohort.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {format(new Date(membership.joinedAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <Badge variant="outline">{membership.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>
                  {member.invoices.length} invoice(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {member.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No invoices yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {member.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            {format(new Date(invoice.month), "MMM yyyy")}
                          </TableCell>
                          <TableCell>${invoice.totalAmount}</TableCell>
                          <TableCell>
                            <Badge
                              variant={invoice.emailSent ? "default" : "outline"}
                            >
                              {invoice.emailSent ? "Sent" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Check-In History Tab */}
        <TabsContent value="checkins">
          <Card>
            <CardHeader>
              <CardTitle>Check-In History</CardTitle>
              <CardDescription>
                {member.entries?.length || 0} check-in(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!member.entries || member.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No check-in data yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Sleep</TableHead>
                      <TableHead>Stress</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.entries.map((entry, idx) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(entry.date), "MMM dd, yyyy")}
                            {idx === 0 && (
                              <Badge variant="outline" className="text-xs">Latest</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{entry.weight != null ? `${entry.weight} lbs` : "—"}</TableCell>
                        <TableCell>{entry.steps != null ? entry.steps.toLocaleString() : "—"}</TableCell>
                        <TableCell>{entry.calories != null ? entry.calories.toLocaleString() : "—"}</TableCell>
                        <TableCell>{entry.sleepQuality != null ? `${entry.sleepQuality}/10` : "—"}</TableCell>
                        <TableCell>
                          {entry.perceivedStress != null ? (
                            <span className={entry.perceivedStress >= 8 ? "text-red-600 font-medium" : ""}>
                              {entry.perceivedStress}/10
                              {entry.perceivedStress >= 8 && " ⚠"}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questionnaire Responses Tab */}
        <TabsContent value="questionnaires">
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Responses</CardTitle>
              <CardDescription>
                {member.questionnaireResponses?.length || 0} response(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!member.questionnaireResponses || member.questionnaireResponses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No questionnaire responses yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cohort</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.questionnaireResponses.map((qr) => {
                      const responseData = qr.responses as Record<string, unknown> | null
                      const answerCount = responseData ? Object.keys(responseData).length : 0
                      return (
                        <TableRow key={qr.id}>
                          <TableCell>{qr.bundle?.cohort?.name || "—"}</TableCell>
                          <TableCell>Week {qr.weekNumber}</TableCell>
                          <TableCell>
                            <Badge variant={qr.status === "COMPLETED" ? "default" : "outline"}>
                              {qr.status === "COMPLETED" ? "Completed" : "In Progress"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(qr.updatedAt), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{answerCount} answer(s)</TableCell>
                          <TableCell>
                            {responseData && answerCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedResponse({
                                  weekNumber: qr.weekNumber,
                                  cohortName: qr.bundle?.cohort?.name || "Unknown",
                                  responses: responseData,
                                  updatedAt: qr.updatedAt,
                                })}
                              >
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Response Detail Dialog */}
          <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Week {selectedResponse?.weekNumber} - {selectedResponse?.cohortName}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Submitted {selectedResponse ? format(new Date(selectedResponse.updatedAt), "MMM dd, yyyy") : ""}
                </p>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {selectedResponse && Object.entries(selectedResponse.responses).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                      {formatResponseKey(key)}
                    </Label>
                    <div className="text-sm bg-muted/50 rounded-md p-3">
                      {typeof value === "number" ? (
                        <span className="text-lg font-semibold">{value} / 7 days</span>
                      ) : (
                        <p className="whitespace-pre-wrap">{String(value)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
              <CardDescription>
                {member.appointmentsAsClient.length} appointment(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {member.appointmentsAsClient.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No appointments yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.appointmentsAsClient.map((apt) => {
                      const isPast = new Date(apt.endTime) < new Date()
                      const statusLabel = apt.status === "ATTENDED"
                        ? "Attended"
                        : isPast
                          ? "Not Attended"
                          : "Scheduled"
                      const statusVariant = apt.status === "ATTENDED"
                        ? "default"
                        : isPast
                          ? "secondary"
                          : "outline"
                      return (
                        <TableRow key={apt.id}>
                          <TableCell>
                            {format(new Date(apt.startTime), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(apt.startTime), "h:mm a")} – {format(new Date(apt.endTime), "h:mm a")}
                          </TableCell>
                          <TableCell>{apt.title || "—"}</TableCell>
                          <TableCell>{apt.coach?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant as "default" | "secondary" | "outline"}>
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>${Number(apt.fee || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
