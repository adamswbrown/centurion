import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { getCohorts } from "@/app/actions/cohorts"
import { NewQuestionnaireForm } from "@/features/questionnaires/NewQuestionnaireForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface NewQuestionnairesPageProps {
  searchParams: Promise<{ cohort?: string }>
}

export default async function NewQuestionnairesPage({ searchParams }: NewQuestionnairesPageProps) {
  await requireAdmin()
  const session = await auth()

  if (!session) {
    return null
  }

  const params = await searchParams
  const cohorts = await getCohorts()
  const preselectedCohortId = params.cohort ? Number(params.cohort) : undefined

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/questionnaires">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Questionnaires
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Create Questionnaire Bundle</h1>
        </div>

        <NewQuestionnaireForm
          cohorts={cohorts}
          preselectedCohortId={preselectedCohortId}
        />
      </div>
    </AppLayout>
  )
}
