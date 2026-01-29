"use client"

import { useState } from "react"
import Link from "next/link"
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CoachMembersTable } from "./CoachMembersTable"
import { CoachQuestionnaireStatus } from "./CoachQuestionnaireStatus"
import { ReviewQueueDashboard } from "@/features/review-queue/ReviewQueueDashboard"
import { useCoachMembersOverview } from "@/hooks/useCoachAnalytics"
import { useAppointments } from "@/hooks/useAppointments"
import { useSessions } from "@/hooks/useSessions"
import { useReviewQueueSummary } from "@/hooks/useReviewQueue"
import {
  Users,
  Calendar,
  AlertTriangle,
  Activity,
  ClipboardCheck,
  Clock,
  Dumbbell,
  Plus,
  LayoutDashboard,
  UserCheck,
  Eye,
  ChevronRight,
  CalendarDays,
  Timer,
  UserPlus,
  FileText,
} from "lucide-react"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function CoachDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const { data: members, isLoading: loadingMembers } = useCoachMembersOverview()
  const { data: reviewSummary } = useReviewQueueSummary(
    format(getMonday(new Date()), "yyyy-MM-dd")
  )

  // Get today's appointments and sessions
  const today = new Date()
  const todayStart = startOfDay(today)
  const weekEnd = endOfDay(addDays(today, 7))

  const { data: appointments, isLoading: loadingAppointments } = useAppointments({
    from: todayStart,
    to: weekEnd,
  })

  const { data: sessions, isLoading: loadingSessions } = useSessions({
    startDate: todayStart.toISOString(),
    endDate: weekEnd.toISOString(),
    status: "SCHEDULED",
  })

  const isLoading = loadingMembers || loadingAppointments || loadingSessions

  if (isLoading) {
    return <CoachDashboardSkeleton />
  }

  // Calculate stats
  const totalClients = members?.length || 0
  const redPriority = members?.filter((m) => m.priority === "red").length || 0
  const amberPriority = members?.filter((m) => m.priority === "amber").length || 0
  const activeThisWeek = members?.filter((m) => m.checkInsThisWeek > 0).length || 0

  // Today's schedule
  const todayAppointments = appointments?.filter((a) =>
    isToday(new Date(a.startTime))
  ) || []
  const todaySessions = sessions?.filter((s) =>
    isToday(new Date(s.startTime))
  ) || []

  // Upcoming (next 7 days, excluding today)
  const upcomingAppointments = appointments?.filter((a) => {
    const date = new Date(a.startTime)
    return !isToday(date) && date <= weekEnd
  }).slice(0, 5) || []

  const upcomingSessions = sessions?.filter((s) => {
    const date = new Date(s.startTime)
    return !isToday(date) && date <= weekEnd
  }).slice(0, 5) || []

  // Clients needing attention (RED priority)
  const attentionNeeded = members?.filter((m) => m.priority === "red").slice(0, 5) || []

  return (
    <div className="space-y-6">
      {/* Header with greeting and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{getGreeting()}</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your clients today
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/sessions?new=true">
              <Dumbbell className="h-4 w-4 mr-2" />
              Create Session
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/timer">
              <Timer className="h-4 w-4 mr-2" />
              Timer
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Today at a Glance */}
      <TodayAtAGlance
        appointments={todayAppointments}
        sessions={todaySessions}
        attentionCount={redPriority}
      />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <LayoutDashboard className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Clients</span>
            {redPriority > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {redPriority}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs sm:text-sm">
            <ClipboardCheck className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reviews</span>
            {reviewSummary && reviewSummary.totalClients - reviewSummary.completedReviews > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {reviewSummary.totalClients - reviewSummary.completedReviews}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("clients")}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Clients</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totalClients}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("clients")}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Active This Week</span>
                </div>
                <p className="text-2xl font-bold mt-1">{activeThisWeek}</p>
                <p className="text-xs text-muted-foreground">
                  {totalClients > 0 ? Math.round((activeThisWeek / totalClients) * 100) : 0}% checked in
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${redPriority > 0 ? "border-red-200 bg-red-50/30" : ""}`}
              onClick={() => setActiveTab("clients")}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-600">Needs Attention</span>
                </div>
                <p className="text-2xl font-bold text-red-600 mt-1">{redPriority}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("clients")}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-amber-600">Watch Closely</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 mt-1">{amberPriority}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickActionButton
              icon={<Dumbbell className="h-5 w-5" />}
              label="Create Session"
              href="/sessions?new=true"
              variant="primary"
            />
            <QuickActionButton
              icon={<ClipboardCheck className="h-5 w-5" />}
              label="Weekly Reviews"
              onClick={() => setActiveTab("reviews")}
              badge={reviewSummary && reviewSummary.totalClients - reviewSummary.completedReviews > 0
                ? String(reviewSummary.totalClients - reviewSummary.completedReviews)
                : undefined}
            />
            <QuickActionButton
              icon={<Users className="h-5 w-5" />}
              label="View Clients"
              onClick={() => setActiveTab("clients")}
              badge={redPriority > 0 ? String(redPriority) : undefined}
            />
            <QuickActionButton
              icon={<Timer className="h-5 w-5" />}
              label="Workout Timer"
              href="/timer"
            />
          </div>

          {/* Two column layout: Attention Needed + Upcoming */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Clients Needing Attention */}
            <Card className={attentionNeeded.length > 0 ? "border-red-200" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Needs Your Attention
                  </CardTitle>
                  {attentionNeeded.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("clients")}>
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {attentionNeeded.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All clients are on track!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attentionNeeded.map((client) => (
                      <Link
                        key={client.memberId}
                        href={`/members/${client.memberId}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">{client.memberName || client.memberEmail}</p>
                          <p className="text-xs text-muted-foreground">{client.cohortName}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            {client.checkInsThisWeek}/{client.expectedCheckIns} check-ins
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Schedule Preview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-primary" />
                    Upcoming This Week
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("schedule")}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 && upcomingSessions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No upcoming sessions this week</p>
                    <Button variant="link" size="sm" asChild>
                      <Link href="/sessions?new=true">Create a session</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-8 rounded-full bg-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{apt.user?.name || "Client"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatScheduleDate(new Date(apt.startTime))} at {format(new Date(apt.startTime), "h:mm a")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">Appointment</Badge>
                      </div>
                    ))}
                    {upcomingSessions.slice(0, 3 - upcomingAppointments.slice(0, 3).length).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1 h-8 rounded-full"
                            style={{ backgroundColor: session.classType?.color || "#6366f1" }}
                          />
                          <div>
                            <p className="font-medium text-sm">{session.classType?.name || session.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatScheduleDate(new Date(session.startTime))} at {format(new Date(session.startTime), "h:mm a")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">Session</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Questionnaire Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Questionnaire Status
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/questionnaires">
                    Manage
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CoachQuestionnaireStatus />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENTS TAB */}
        <TabsContent value="clients" className="space-y-4 mt-4">
          <CoachMembersTable />
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Schedule</h2>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/sessions?new=true">
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/timer">
                  <Timer className="h-4 w-4 mr-2" />
                  Timer
                </Link>
              </Button>
            </div>
          </div>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
              <CardDescription>
                {format(today, "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 && todaySessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No sessions scheduled for today</p>
                  <Button variant="link" asChild>
                    <Link href="/sessions?new=true">Create a session</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Combine and sort by time */}
                  {[...todayAppointments.map(a => ({ ...a, type: 'appointment' as const })),
                    ...todaySessions.map(s => ({ ...s, type: 'session' as const }))]
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1 h-12 rounded-full"
                            style={{
                              backgroundColor: item.type === 'session'
                                ? (item as typeof todaySessions[0]).classType?.color || "#6366f1"
                                : "#3b82f6"
                            }}
                          />
                          <div>
                            <p className="font-medium">
                              {item.type === 'session'
                                ? (item as typeof todaySessions[0]).classType?.name || (item as typeof todaySessions[0]).title
                                : (item as typeof todayAppointments[0]).user?.name || "Client"}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(item.startTime), "h:mm a")} - {format(new Date(item.endTime), "h:mm a")}
                            </div>
                          </div>
                        </div>
                        <Badge variant={item.type === 'session' ? 'default' : 'secondary'}>
                          {item.type === 'session' ? 'Session' : 'Appointment'}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming This Week */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 && upcomingSessions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No upcoming sessions this week</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...upcomingAppointments.map(a => ({ ...a, type: 'appointment' as const })),
                    ...upcomingSessions.map(s => ({ ...s, type: 'session' as const }))]
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1 h-10 rounded-full"
                            style={{
                              backgroundColor: item.type === 'session'
                                ? (item as typeof upcomingSessions[0]).classType?.color || "#6366f1"
                                : "#3b82f6"
                            }}
                          />
                          <div>
                            <p className="font-medium">
                              {item.type === 'session'
                                ? (item as typeof upcomingSessions[0]).classType?.name || (item as typeof upcomingSessions[0]).title
                                : (item as typeof upcomingAppointments[0]).user?.name || "Client"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatScheduleDate(new Date(item.startTime))} at {format(new Date(item.startTime), "h:mm a")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {item.type === 'session' ? 'Session' : 'Appointment'}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Full Calendar
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVIEWS TAB */}
        <TabsContent value="reviews" className="space-y-4 mt-4">
          <ReviewQueueDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper functions
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatScheduleDate(date: Date): string {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  return format(date, "EEE, MMM d")
}

// Today at a Glance Component
interface TodayAtAGlanceProps {
  appointments: Array<{
    id: number
    startTime: Date | string
    endTime: Date | string
    user?: { name: string | null } | null
  }>
  sessions: Array<{
    id: number
    startTime: Date | string
    title: string
    classType?: { name: string; color: string | null } | null
  }>
  attentionCount: number
}

function TodayAtAGlance({ appointments, sessions, attentionCount }: TodayAtAGlanceProps) {
  const totalToday = appointments.length + sessions.length
  const hasAttention = attentionCount > 0

  // Find next upcoming item
  const now = new Date()
  const allItems = [
    ...appointments.map(a => ({ time: new Date(a.startTime), name: a.user?.name || "Appointment" })),
    ...sessions.map(s => ({ time: new Date(s.startTime), name: s.classType?.name || s.title })),
  ].filter(item => item.time > now).sort((a, b) => a.time.getTime() - b.time.getTime())

  const nextItem = allItems[0]

  return (
    <Card className={hasAttention ? "border-amber-300 bg-amber-50/50" : "bg-primary/5"}>
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${totalToday > 0 ? "bg-primary/10" : "bg-muted"}`}>
              <Calendar className={`h-5 w-5 ${totalToday > 0 ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">
                {totalToday === 0
                  ? "No sessions scheduled today"
                  : `${totalToday} ${totalToday === 1 ? "session" : "sessions"} on your schedule today`}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {nextItem && (
                  <span className="text-muted-foreground">
                    Next: {nextItem.name} at {format(nextItem.time, "h:mm a")}
                  </span>
                )}
                {hasAttention && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {attentionCount} client{attentionCount !== 1 ? "s" : ""} need attention
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAttention && (
              <Badge variant="destructive">
                {attentionCount} Alert{attentionCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href="/calendar">
                <Calendar className="h-4 w-4 mr-1" />
                Calendar
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  href?: string
  onClick?: () => void
  variant?: "primary" | "default"
  badge?: string
}

function QuickActionButton({ icon, label, href, onClick, variant = "default", badge }: QuickActionButtonProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors relative ${
      variant === "primary"
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "bg-background hover:bg-muted"
    }`}>
      {badge && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
        >
          {badge}
        </Badge>
      )}
      {icon}
      <span className="text-xs mt-2 font-medium">{label}</span>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return (
    <button onClick={onClick} className="w-full">
      {content}
    </button>
  )
}

// Loading Skeleton
function CoachDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <Skeleton className="h-20 w-full" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
