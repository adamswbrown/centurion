import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminUsers } from "@/app/actions/admin-users"
import { UserTable } from "@/features/users/UserTable"
import { CreateUserDialog } from "@/features/users/CreateUserDialog"
import { UserSearchForm } from "@/features/users/UserSearchForm"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  const { q } = await searchParams
  const users = await getAdminUsers({ query: q })

  return (
    <AppLayout session={session}>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Users</h1>
              <p className="text-muted-foreground">
                Manage all platform users and access roles
              </p>
            </div>
            <CreateUserDialog />
          </div>

          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>User Directory</CardTitle>
              <UserSearchForm />
            </CardHeader>
            <CardContent>
              <UserTable users={users} />
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    </AppLayout>
  )
}
