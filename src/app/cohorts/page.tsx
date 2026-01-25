import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { CohortList } from "@/features/cohorts/CohortList"
import { CohortForm } from "@/features/cohorts/CohortForm"

export default async function CohortsPage() {
  await requireCoach()
  const session = await auth()

  if (!session) {
    return null
  }

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cohorts</h1>
            <p className="text-muted-foreground">
              Manage cohort programs and group training
            </p>
          </div>
          {session.user.role === "ADMIN" && <CohortForm />}
        </div>

        <CohortList />
      </div>
    </AppLayout>
  )
}
