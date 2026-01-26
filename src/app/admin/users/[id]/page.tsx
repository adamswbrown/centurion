import { notFound } from "next/navigation"
import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { getAdminUserById } from "@/app/actions/admin-users"
import { UserDetail } from "@/features/users/UserDetail"

interface AdminUserPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const userId = Number.parseInt(id, 10)

  if (Number.isNaN(userId)) {
    notFound()
  }

  const user = await getAdminUserById(userId)
  if (!user) {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <UserDetail user={user} />
    </AppLayout>
  )
}
