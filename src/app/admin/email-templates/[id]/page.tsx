import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { getEmailTemplateById } from "@/app/actions/email-templates"
import { EmailTemplateEditor } from "@/features/email-templates/EmailTemplateEditor"

export default async function AdminEmailTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const template = await getEmailTemplateById(Number(id))

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit: {template.name}</h1>
          <p className="text-muted-foreground">
            Customize the email template content and settings
          </p>
        </div>

        <EmailTemplateEditor template={template} />
      </div>
    </AppLayout>
  )
}
