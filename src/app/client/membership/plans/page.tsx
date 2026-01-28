import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { PlanBrowser } from "@/features/memberships/PlanBrowser"

export default async function ClientMembershipPlansPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Membership Plans</h1>
          <p className="text-muted-foreground">
            Browse available plans and subscribe
          </p>
        </div>

        <PlanBrowser />
      </div>
    </AppLayout>
  )
}
