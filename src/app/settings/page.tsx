import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { getUserSettings } from "@/app/actions/settings"
import { UserSettingsForm } from "@/features/settings/UserSettingsForm"

export default async function SettingsPage() {
  const session = await requireAuth()
  const authSession = await auth()

  if (!authSession) return null

  const userId = Number.parseInt(session.id, 10)
  const userSettings = await getUserSettings(userId)

  return (
    <AppLayout session={authSession}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and account preferences
          </p>
        </div>

        <UserSettingsForm initialValues={userSettings} />
      </div>
    </AppLayout>
  )
}
