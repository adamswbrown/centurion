import { notFound } from "next/navigation"
import { AppLayout } from "@/components/layouts/AppLayout"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth"
import { getMyInvoiceById } from "@/app/actions/client-invoices"
import { ClientInvoiceDetail } from "@/features/invoices/ClientInvoiceDetail"

interface ClientInvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function ClientInvoicePage({ params }: ClientInvoicePageProps) {
  await requireAuth()
  const session = await auth()

  if (!session) return null

  const { id } = await params
  const invoiceId = Number.parseInt(id, 10)

  if (Number.isNaN(invoiceId)) {
    notFound()
  }

  const invoice = await getMyInvoiceById(invoiceId)

  if (!invoice) {
    notFound()
  }

  return (
    <AppLayout session={session}>
      <ClientInvoiceDetail invoice={invoice} />
    </AppLayout>
  )
}
