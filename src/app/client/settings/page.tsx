import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataExportButton } from "@/features/settings/DataExportButton"
import { DeleteAccountDialog } from "@/features/settings/DeleteAccountDialog"
import { UserGoalsForm } from "@/features/goals/UserGoalsForm"
import { UserPreferencesForm } from "@/features/settings/UserPreferencesForm"

export default async function ClientSettingsPage() {
  const sessionUser = await requireAuth()
  const session = await auth()

  if (!session) return null

  const userId = Number.parseInt(sessionUser.id, 10)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })

  const hasPassword = !!user?.password

  // Load goals and preferences
  const goals = await prisma.userGoals.findUnique({
    where: { userId },
  })

  const preferences = await prisma.userPreference.findUnique({
    where: { userId },
  })

  const prefsData = {
    weightUnit: preferences?.weightUnit ?? "lbs",
    measurementUnit: preferences?.measurementUnit ?? "inches",
    dateFormat: preferences?.dateFormat ?? "MM/dd/yyyy",
  }

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account, goals, preferences, and privacy settings.
          </p>
        </div>

        <UserPreferencesForm initialValues={prefsData} />

        <UserGoalsForm
          initialValues={
            goals
              ? {
                  currentWeightKg: goals.currentWeightKg,
                  targetWeightKg: goals.targetWeightKg,
                  heightCm: goals.heightCm,
                  dailyCaloriesKcal: goals.dailyCaloriesKcal,
                  proteinGrams: goals.proteinGrams,
                  carbGrams: goals.carbGrams,
                  fatGrams: goals.fatGrams,
                  waterIntakeMl: goals.waterIntakeMl,
                  dailyStepsTarget: goals.dailyStepsTarget,
                  weeklyWorkoutMinutes: goals.weeklyWorkoutMinutes,
                }
              : null
          }
          weightUnit={prefsData.weightUnit as "lbs" | "kg"}
          measurementUnit={prefsData.measurementUnit as "inches" | "cm"}
        />

        <Card>
          <CardHeader>
            <CardTitle>Data &amp; Privacy</CardTitle>
            <CardDescription>
              Export your data or delete your account. We take your privacy seriously.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Export your data</h3>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your data including your profile, entries,
                workouts, sleep records, and more.
              </p>
              <DataExportButton />
            </div>

            <div className="border-t pt-6 space-y-2">
              <h3 className="text-sm font-medium text-destructive">Delete account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <DeleteAccountDialog hasPassword={hasPassword} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
