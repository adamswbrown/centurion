import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { getAllQuestionnaireBundlesAdmin } from "@/app/actions/questionnaires"
import { getCohorts } from "@/app/actions/cohorts"
import { QuestionnaireList } from "@/features/questionnaires/QuestionnaireList"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function AdminQuestionnairesPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) {
    return null
  }

  const [bundles, cohorts] = await Promise.all([
    getAllQuestionnaireBundlesAdmin(),
    getCohorts(),
  ])

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Questionnaire Bundles</h1>
          </div>
          <Link href="/admin/questionnaires/new">
            <Button>Create New Bundle</Button>
          </Link>
        </div>

        <QuestionnaireList bundles={bundles} cohorts={cohorts} />
      </div>
    </AppLayout>
  )
}
