import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { getEmailTemplates } from "@/app/actions/email-templates"
import { EmailTemplateList } from "@/features/email-templates/EmailTemplateList"

export default async function AdminEmailTemplatesPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  const templates = await getEmailTemplates()

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage email templates used throughout the platform. System templates cannot be deleted but can be customized.
          </p>
        </div>

        <EmailTemplateList templates={templates} />
      </div>
    </AppLayout>
  )
}
