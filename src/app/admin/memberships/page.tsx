import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { MembershipPlanManager } from "@/features/memberships/MembershipPlanManager"

export default async function AdminMembershipsPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Membership Plans</h1>
          <p className="text-muted-foreground">
            Create and manage membership plans for clients
          </p>
        </div>

        <MembershipPlanManager />
      </div>
    </AppLayout>
  )
}
