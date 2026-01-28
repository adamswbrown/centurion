import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { ClientSessionBrowser } from "@/features/sessions/ClientSessionBrowser"

export default async function ClientSessionsPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            Browse and book sessions
          </p>
        </div>

        <ClientSessionBrowser />
      </div>
    </AppLayout>
  )
}
