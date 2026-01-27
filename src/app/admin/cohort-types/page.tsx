import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { getCustomCohortTypes } from "@/app/actions/cohort-types"
import { CustomCohortTypeManager } from "@/features/cohorts/CustomCohortTypeManager"

export default async function AdminCohortTypesPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  const customTypes = await getCustomCohortTypes()

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Custom Cohort Types</h1>
          <p className="text-muted-foreground">
            Manage custom cohort types. Built-in types (Timed, Ongoing, Challenge) are always available. Custom types can be created here and assigned to cohorts.
          </p>
        </div>

        <CustomCohortTypeManager initialTypes={customTypes} />
      </div>
    </AppLayout>
  )
}
