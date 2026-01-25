import { requireAuth } from "@/lib/auth"
import { auth } from "@/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { BootcampRegistration } from "@/features/bootcamps/BootcampRegistration"

export default async function ClientBootcampsPage() {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  return (
    <AppLayout session={session}>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Bootcamps</h1>
          <p className="text-muted-foreground">
            Browse and register for upcoming bootcamps
          </p>
        </div>

        <BootcampRegistration session={session} />
      </div>
    </AppLayout>
  )
}
