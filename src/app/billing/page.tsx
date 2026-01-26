import { auth } from "@/auth"
import { requireAdmin } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { InvoiceList } from "@/features/invoices/InvoiceList"
import { GenerateInvoiceDialog } from "@/features/invoices/GenerateInvoiceDialog"
import { RevenueChart } from "@/features/invoices/RevenueChart"

export default async function BillingPage() {
  await requireAdmin()
  const session = await auth()

  if (!session) {
    return null
  }

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
            <p className="text-muted-foreground">
              Manage invoices and track revenue
            </p>
          </div>
          <GenerateInvoiceDialog />
        </div>

        <RevenueChart />

        <div>
          <h2 className="text-xl font-semibold mb-4">Invoices</h2>
          <InvoiceList />
        </div>
      </div>
    </AppLayout>
  )
}
