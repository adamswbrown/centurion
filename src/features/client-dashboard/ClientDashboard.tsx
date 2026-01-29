"use client"

import { useState } from "react"
import { useClientDashboard } from "@/hooks/useClientDashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CohortInfoCard } from "./CohortInfoCard"
import { QuickStats } from "./QuickStats"
import { QuestionnairePrompt } from "./QuestionnairePrompt"
import { RecentEntriesSidebar } from "./RecentEntriesSidebar"
import { UpcomingSessionsCard } from "./UpcomingSessionsCard"
import { CheckInForm } from "@/features/entries/CheckInForm"
import { useMyRegistrations } from "@/hooks/useSessions"
import Link from "next/link"
import { format, isToday, isTomorrow } from "date-fns"
import {
  Dumbbell,
  Heart,
  Settings,
  ChevronRight,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LayoutDashboard,
  Activity,
  Calendar,
  User,
  Bell,
  ClipboardList,
} from "lucide-react"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function ClientDashboard() {
  const { data, isLoading, error } = useClientDashboard()
  const [activeTab, setActiveTab] = useState("overview")

  if (isLoading) {
    return <ClientDashboardSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading dashboard</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Something went wrong"}
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  const firstName = data.user.name?.split(" ")[0] || "there"
  const hasCohort = data.hasActiveCohort
  const primaryCohort = data.memberships[0]?.cohort

  // Determine if user has pending actions
  const pendingQuestionnaire = data.questionnaireStatus.length > 0
  const checkInOverdue = data.checkInOverdue
  const hasActionNeeded = pendingQuestionnaire || checkInOverdue

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {firstName}!
          </h1>
          {hasActionNeeded && (
            <p className="text-sm text-amber-600 flex items-center gap-1 mt-0.5">
              <AlertCircle className="h-4 w-4" />
              {checkInOverdue ? "Check-in overdue" : "Questionnaire waiting"}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/client/settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Today at a Glance Card */}
      <TodayAtAGlance
        hasTodayEntry={data.hasTodayEntry}
        checkInOverdue={checkInOverdue}
        questionnaireStatus={data.questionnaireStatus}
        onCheckInClick={() => setActiveTab("health")}
      />

      {/* Tab Navigation - Everything accessible from here */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <LayoutDashboard className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs sm:text-sm">
            <Dumbbell className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="text-xs sm:text-sm">
            <Heart className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="text-xs sm:text-sm">
            <Activity className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Quick Stats */}
          <QuickStats
            latestWeight={data.stats.latestWeight}
            avgSteps7d={data.stats.avgSteps7d}
            entriesLast7Days={data.stats.entriesLast7Days}
            currentStreak={data.stats.currentStreak}
          />

          {/* Cohort Info (if member) */}
          {hasCohort && primaryCohort && (
            <CohortInfoCard
              cohort={primaryCohort}
              lastCheckIn={data.stats.lastCheckIn}
              checkInOverdue={checkInOverdue}
            />
          )}

          {/* Questionnaire Alert */}
          {pendingQuestionnaire && (
            <QuestionnairePrompt questionnaireStatus={data.questionnaireStatus} />
          )}

          {/* Two Column Layout */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Upcoming Sessions Preview */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    Upcoming Sessions
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setActiveTab("sessions")}
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <UpcomingSessionsCompact onViewAll={() => setActiveTab("sessions")} />
              </CardContent>
            </Card>

            {/* Recent Activity Preview */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Recent Check-ins
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setActiveTab("health")}
                  >
                    Log Now
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <RecentEntriesCompact entries={data.recentEntries} />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <QuickActionButton
              icon={<Plus className="h-5 w-5" />}
              label="Book Session"
              onClick={() => setActiveTab("sessions")}
              variant="primary"
            />
            <QuickActionButton
              icon={<Heart className="h-5 w-5" />}
              label="Log Check-in"
              onClick={() => setActiveTab("health")}
              badge={checkInOverdue ? "!" : undefined}
            />
            {pendingQuestionnaire ? (
              <QuickActionButton
                icon={<ClipboardList className="h-5 w-5" />}
                label="Questionnaire"
                href={`/client/questionnaires/${data.questionnaireStatus[0]?.cohortId}/${data.questionnaireStatus[0]?.currentWeek}`}
                badge="!"
              />
            ) : (
              <QuickActionButton
                icon={<Calendar className="h-5 w-5" />}
                label="My Schedule"
                href="/client/sessions"
              />
            )}
            <QuickActionButton
              icon={<Sparkles className="h-5 w-5" />}
              label="My Wrapped"
              href="/client/wrapped"
            />
          </div>
        </TabsContent>

        {/* SESSIONS TAB */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <UpcomingSessionsCard />
        </TabsContent>

        {/* HEALTH TAB */}
        <TabsContent value="health" className="space-y-4 mt-4">
          {/* Questionnaire Alert in Health Tab */}
          {pendingQuestionnaire && (
            <QuestionnairePrompt questionnaireStatus={data.questionnaireStatus} />
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    {data.hasTodayEntry ? "Edit Today's Check-In" : "Log Today's Check-In"}
                  </CardTitle>
                  <CardDescription>
                    Track your weight, sleep, energy, and more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CheckInForm />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <RecentEntriesSidebar entries={data.recentEntries} />

              {/* Quick link to questionnaire if pending */}
              {pendingQuestionnaire && (
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Weekly Questionnaire</p>
                        <p className="text-xs text-muted-foreground">
                          Week {data.questionnaireStatus[0]?.currentWeek} waiting
                        </p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/client/questionnaires/${data.questionnaireStatus[0]?.cohortId}/${data.questionnaireStatus[0]?.currentWeek}`}>
                          Start
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-4 mt-4">
          <QuickStats
            latestWeight={data.stats.latestWeight}
            avgSteps7d={data.stats.avgSteps7d}
            entriesLast7Days={data.stats.entriesLast7Days}
            currentStreak={data.stats.currentStreak}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Entries List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentEntriesSidebar entries={data.recentEntries} />
              </CardContent>
            </Card>

            {/* Links to More Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Explore Your Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/client/health">
                    <Activity className="h-4 w-4 mr-2" />
                    Detailed Health Charts
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/client/wrapped">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Your Fitness Wrapped
                  </Link>
                </Button>
                {hasCohort && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/client/cohorts">
                      <User className="h-4 w-4 mr-2" />
                      Cohort Progress
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/client/membership">
                    <Clock className="h-4 w-4 mr-2" />
                    Membership Status
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Today at a Glance Component
interface QuestionnaireStatusItem {
  cohortId: number
  cohortName: string
  currentWeek: number
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  bundleId: number | null
}

function TodayAtAGlance({
  hasTodayEntry,
  checkInOverdue,
  questionnaireStatus,
  onCheckInClick,
}: {
  hasTodayEntry: boolean
  checkInOverdue: boolean
  questionnaireStatus: QuestionnaireStatusItem[]
  onCheckInClick: () => void
}) {
  const { data: registrations } = useMyRegistrations()

  const todaySessions = registrations?.filter(
    (r) => r.status === "REGISTERED" && isToday(new Date(r.session.startTime))
  ) || []

  const hasSessionToday = todaySessions.length > 0
  const nextSession = todaySessions[0]
  const pendingQuestionnaire = questionnaireStatus.find(q => q.status !== "COMPLETED")
  const hasNeedsAttention = checkInOverdue || pendingQuestionnaire

  return (
    <Card className={hasNeedsAttention ? "border-amber-300 bg-amber-50/50" : ""}>
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Session info */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${hasSessionToday ? "bg-primary/10" : "bg-muted"}`}>
              <Calendar className={`h-5 w-5 ${hasSessionToday ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">
                {hasSessionToday
                  ? `${nextSession?.session.classType?.name || nextSession?.session.title} at ${format(new Date(nextSession.session.startTime), "h:mm a")}`
                  : "No sessions today"}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {hasTodayEntry ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Checked in
                  </span>
                ) : checkInOverdue ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Bell className="h-3 w-3" />
                    Check-in needed
                  </span>
                ) : (
                  <span className="text-muted-foreground">No check-in yet</span>
                )}
                {pendingQuestionnaire && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <ClipboardList className="h-3 w-3" />
                    Questionnaire waiting
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!hasTodayEntry && (
              <Button size="sm" variant={checkInOverdue ? "default" : "outline"} onClick={onCheckInClick}>
                <Heart className="h-4 w-4 mr-1" />
                Check In
              </Button>
            )}
            {pendingQuestionnaire && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/client/questionnaires/${pendingQuestionnaire.cohortId}/${pendingQuestionnaire.currentWeek}`}>
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Questionnaire
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact Sessions Preview for Overview Tab
function UpcomingSessionsCompact({ onViewAll }: { onViewAll: () => void }) {
  const { data: registrations, isLoading } = useMyRegistrations()

  if (isLoading) {
    return <div className="h-24 bg-muted animate-pulse rounded-lg" />
  }

  const upcoming = registrations?.filter(
    (r) => r.status === "REGISTERED" && new Date(r.session.startTime) > new Date()
  ).slice(0, 2) || []

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-2">No sessions booked</p>
        <Button size="sm" onClick={onViewAll}>
          <Plus className="h-4 w-4 mr-1" />
          Book Now
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {upcoming.map((reg) => (
        <div
          key={reg.id}
          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
        >
          <div
            className="w-1.5 h-8 rounded-full flex-shrink-0"
            style={{ backgroundColor: reg.session.classType?.color || "#6366f1" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {reg.session.classType?.name || reg.session.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {isToday(new Date(reg.session.startTime))
                ? "Today"
                : isTomorrow(new Date(reg.session.startTime))
                ? "Tomorrow"
                : format(new Date(reg.session.startTime), "EEE")}
              {" at "}
              {format(new Date(reg.session.startTime), "h:mm a")}
            </p>
          </div>
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

// Compact Recent Entries for Overview Tab
function RecentEntriesCompact({ entries }: { entries: Array<{ id: number; date: Date | string; weight?: number | null; steps?: number | null }> }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No recent check-ins</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 3).map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div>
            <p className="text-sm font-medium">
              {format(new Date(entry.date), "EEE, MMM d")}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.weight && `${entry.weight} lbs`}
              {entry.weight && entry.steps && " • "}
              {entry.steps && `${entry.steps.toLocaleString()} steps`}
              {!entry.weight && !entry.steps && "Logged"}
            </p>
          </div>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </div>
      ))}
    </div>
  )
}

// Quick Action Button Component
function QuickActionButton({
  icon,
  label,
  onClick,
  href,
  variant = "default",
  badge,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
  variant?: "default" | "primary"
  badge?: string
}) {
  const baseClass = "transition-colors cursor-pointer"
  const variantClass = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : "hover:bg-muted/80"

  const content = (
    <CardContent className="flex flex-col items-center gap-1 py-3 relative p-3">
      {badge && (
        <span className="absolute top-1 right-1 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
      {icon}
      <span className="text-xs font-medium text-center">{label}</span>
    </CardContent>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className={`${baseClass} ${variantClass}`}>
          {content}
        </Card>
      </Link>
    )
  }

  return (
    <Card
      className={`${baseClass} ${variantClass}`}
      onClick={onClick}
    >
      {content}
    </Card>
  )
}

function ClientDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}
