import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { ClientMembershipView } from "@/features/memberships/ClientMembershipView"

export default async function ClientMembershipPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Membership</h1>
          <p className="text-muted-foreground">
            View your current membership and history
          </p>
        </div>

        <ClientMembershipView userId={parseInt(session.user.id, 10)} />
      </div>
    </AppLayout>
  )
}
