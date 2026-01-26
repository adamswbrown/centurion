import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientCohortList } from "@/features/cohorts/ClientCohortList"

export default async function MyCohortsPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Cohorts</h1>
          <p className="text-muted-foreground">
            View the programs you are enrolled in
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientCohortList />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
