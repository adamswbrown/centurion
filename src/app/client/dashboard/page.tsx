import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { ClientDashboard } from "@/features/client-dashboard"

export default async function ClientDashboardPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <ClientDashboard />
    </AppLayout>
  )
}
