import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { getCohortById } from "@/app/actions/cohorts"
import { CohortDetail } from "@/features/cohorts/CohortDetail"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface CohortPageProps {
  params: Promise<{ id: string }>
}

export default async function CohortPage({ params }: CohortPageProps) {
  await requireCoach()
  const session = await auth()

  if (!session) {
    return null
  }

  const { id } = await params
  const cohortId = Number(id)

  if (isNaN(cohortId)) {
    notFound()
  }

  let cohort
  try {
    cohort = await getCohortById(cohortId)
  } catch {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/cohorts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cohorts
            </Button>
          </Link>
        </div>

        <CohortDetail cohort={cohort} />
      </div>
    </AppLayout>
  )
}
