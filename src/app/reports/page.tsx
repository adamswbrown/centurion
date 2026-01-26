import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { ReportsDashboard } from "@/features/reports/ReportsDashboard"

export default async function ReportsPage() {
  // Allow both COACH and ADMIN roles (with different data visibility)
  const session = await auth()

  if (!session?.user) {
    return null
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "COACH") {
    return (
      <AppLayout session={session}>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to view reports.
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout session={session}>
      <ReportsDashboard userRole={role} />
    </AppLayout>
  )
}
