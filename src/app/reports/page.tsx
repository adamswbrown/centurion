import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ReportsPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Reporting dashboards are coming soon.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Reports will be delivered as part of the Analytics phase.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
