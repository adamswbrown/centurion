import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { QuestionnaireViewer } from "@/features/questionnaires/QuestionnaireViewer"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{
    cohortId: string
    weekNumber: string
  }>
}

export default async function QuestionnairePage({ params }: PageProps) {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  const { cohortId, weekNumber } = await params
  const cohortIdNum = parseInt(cohortId)
  const weekNum = parseInt(weekNumber)

  if (isNaN(cohortIdNum) || isNaN(weekNum) || weekNum < 1 || weekNum > 12) {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Weekly Questionnaire</h1>
          <p className="text-muted-foreground">
            Complete your weekly check-in questionnaire.
          </p>
        </div>

        <QuestionnaireViewer cohortId={cohortIdNum} weekNumber={weekNum} />
      </div>
    </AppLayout>
  )
}
