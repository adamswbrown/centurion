import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { ReviewQueueDashboard } from "@/features/review-queue"

export default async function ReviewQueuePage() {
  await requireCoach()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <ReviewQueueDashboard />
    </AppLayout>
  )
}
