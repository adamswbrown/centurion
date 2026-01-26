import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { getSystemSettings } from "@/app/actions/settings"
import { SystemSettingsForm } from "@/features/settings/SystemSettingsForm"

export default async function AdminSettingsPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  const settings = await getSystemSettings()

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure platform-wide settings and feature flags
          </p>
        </div>

        <SystemSettingsForm initialSettings={settings} />
      </div>
    </AppLayout>
  )
}
