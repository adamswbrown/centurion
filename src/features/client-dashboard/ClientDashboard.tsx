"use client"

import { useClientDashboard } from "@/hooks/useClientDashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CohortInfoCard } from "./CohortInfoCard"
import { QuickStats } from "./QuickStats"
import { QuestionnairePrompt } from "./QuestionnairePrompt"
import { RecentEntriesSidebar } from "./RecentEntriesSidebar"
import { UpcomingSessionsCard } from "./UpcomingSessionsCard"
import { CheckInForm } from "@/features/entries/CheckInForm"
import Link from "next/link"
import { format } from "date-fns"
import { Dumbbell, Heart, Clock, Sparkles } from "lucide-react"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function ClientDashboard() {
  const { data, isLoading, error } = useClientDashboard()

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            {hasCohort
              ? "Track your progress and stay on top of your goals"
              : "Book sessions and track your fitness journey"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/client/settings">Settings</Link>
          </Button>
        </div>
      </div>

      {/* Main Content - Adaptive Layout */}
      {hasCohort ? (
        // COHORT-CENTRIC VIEW
        <CohortCentricDashboard data={data} primaryCohort={primaryCohort} />
      ) : (
        // GYM-ONLY VIEW
        <GymOnlyDashboard data={data} />
      )}
    </div>
  )
}

// Dashboard for cohort members - focus on check-ins and coach communication
function CohortCentricDashboard({
  data,
  primaryCohort,
}: {
  data: Awaited<ReturnType<typeof import("@/app/actions/client-dashboard").getClientDashboardData>>
  primaryCohort: any
}) {
  return (
    <>
      {/* Cohort Info */}
      {primaryCohort && (
        <CohortInfoCard
          cohort={primaryCohort}
          lastCheckIn={data.stats.lastCheckIn}
          checkInOverdue={data.checkInOverdue}
        />
      )}

      {/* Quick Stats */}
      <QuickStats
        latestWeight={data.stats.latestWeight}
        avgSteps7d={data.stats.avgSteps7d}
        entriesLast7Days={data.stats.entriesLast7Days}
        currentStreak={data.stats.currentStreak}
      />

      {/* Questionnaire Prompt (if Sunday or incomplete) */}
      {data.questionnaireStatus.length > 0 && (
        <QuestionnairePrompt questionnaireStatus={data.questionnaireStatus} />
      )}

      {/* Two-column layout: Check-in form + Recent entries */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Check-In Form - Hero (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                {data.hasTodayEntry ? "Edit Today's Check-In" : "Log Today's Check-In"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CheckInForm />
            </CardContent>
          </Card>

          {/* Sessions card below check-in for cohort members */}
          <UpcomingSessionsCard />
        </div>

        {/* Sidebar - Recent Entries (1/3 width) */}
        <div className="space-y-4">
          <RecentEntriesSidebar entries={data.recentEntries} />

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/health">
                  <Heart className="h-4 w-4 mr-2" />
                  Health Data
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/cohorts">
                  <Sparkles className="h-4 w-4 mr-2" />
                  My Cohorts
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/sessions">
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Sessions
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/wrapped">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Wrapped
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

// Dashboard for gym-only members - focus on sessions and fitness
function GymOnlyDashboard({
  data,
}: {
  data: Awaited<ReturnType<typeof import("@/app/actions/client-dashboard").getClientDashboardData>>
}) {
  return (
    <>
      {/* Welcome Card for non-cohort members */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">Ready to train?</h2>
              <p className="text-muted-foreground">
                Browse available sessions and book your next workout
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/client/sessions">
                <Dumbbell className="h-5 w-5 mr-2" />
                Book a Session
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Sessions (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <UpcomingSessionsCard />

          {/* Optional: Health tracking for gym members */}
          {data.stats.totalEntries > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Health Tracking
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/client/health">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <QuickStats
                  latestWeight={data.stats.latestWeight}
                  avgSteps7d={data.stats.avgSteps7d}
                  entriesLast7Days={data.stats.entriesLast7Days}
                  currentStreak={data.stats.currentStreak}
                />
              </CardContent>
            </Card>
          )}

          {/* Invite to track health if they haven't started */}
          {data.stats.totalEntries === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Track Your Health</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Log your weight, steps, and more to track your fitness journey
                </p>
                <Button variant="outline" asChild>
                  <Link href="/client/health">Start Tracking</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Membership Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/client/membership">View Membership</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Entries (if any) */}
          {data.recentEntries.length > 0 && (
            <RecentEntriesSidebar entries={data.recentEntries} />
          )}

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/health">
                  <Heart className="h-4 w-4 mr-2" />
                  Health Data
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/appointments">
                  <Clock className="h-4 w-4 mr-2" />
                  Appointments
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="justify-start">
                <Link href="/client/wrapped">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Fitness Wrapped
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function ClientDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
