import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { SessionDetail } from "@/features/sessions/SessionDetail"

interface SessionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  await requireCoach()
  const session = await auth()
  const { id } = await params

  if (!session) return null

  return (
    <AppLayout session={session}>
      <SessionDetail sessionId={parseInt(id, 10)} />
    </AppLayout>
  )
}
