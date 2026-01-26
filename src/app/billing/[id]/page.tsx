import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { getInvoiceById } from "@/app/actions/invoices"
import { InvoiceDetail } from "@/features/invoices/InvoiceDetail"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  await requireAdmin()
  const session = await auth()

  if (!session) {
    return null
  }

  const { id } = await params
  const invoiceId = Number(id)

  if (isNaN(invoiceId)) {
    notFound()
  }

  let invoice
  try {
    invoice = await getInvoiceById(invoiceId)
  } catch {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/billing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Billing
            </Button>
          </Link>
        </div>

        <InvoiceDetail invoice={invoice} />
      </div>
    </AppLayout>
  )
}
