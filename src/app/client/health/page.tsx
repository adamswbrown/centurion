import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { CheckInForm } from "@/features/entries/CheckInForm"
import { CheckInHistory } from "@/features/entries/CheckInHistory"
import { useCheckInStats } from "@/hooks/useEntries"

export default async function ClientHealthPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Daily Check-In</h1>
          <p className="text-muted-foreground">
            Track your weight, steps, calories, sleep, and stress levels.
          </p>
        </div>

        <CheckInForm />

        <CheckInHistory limit={30} />
      </div>
    </AppLayout>
  )
}
