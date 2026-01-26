import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { getOrCreateQuestionnaireBundle } from "@/app/actions/questionnaires"
import { getCohortById } from "@/app/actions/cohorts"
import { EditQuestionnaireForm } from "@/features/questionnaires/EditQuestionnaireForm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface EditQuestionnairesPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}

export default async function EditQuestionnairesPage({
  params,
  searchParams,
}: EditQuestionnairesPageProps) {
  await requireAdmin()
  const session = await auth()

  if (!session) {
    return null
  }

  const { id } = await params
  const { week } = await searchParams
  const cohortId = Number(id)
  const weekNumber = week ? Number(week) : 1

  if (isNaN(cohortId) || isNaN(weekNumber)) {
    notFound()
  }

  let cohort
  try {
    cohort = await getCohortById(cohortId)
  } catch {
    notFound()
  }

  const bundle = await getOrCreateQuestionnaireBundle(cohortId, weekNumber)

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
          <h1 className="text-2xl font-bold">
            Edit Questionnaire - {cohort.name}
          </h1>
        </div>

        <EditQuestionnaireForm
          cohortId={cohortId}
          cohortName={cohort.name}
          weekNumber={weekNumber}
          initialQuestions={bundle.questions}
        />
      </div>
    </AppLayout>
  )
}
