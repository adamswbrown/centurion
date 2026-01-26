"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useMyInvoices } from "@/hooks/useClientInvoices"

export function ClientInvoiceList() {
  const { data: invoices, isLoading } = useMyInvoices()

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading invoices...</div>
  }

  if (!invoices || invoices.length === 0) {
    return <div className="text-sm text-muted-foreground">No invoices yet.</div>
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <div key={invoice.id} className="rounded-md border p-3">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/invoices/me/${invoice.id}`} className="font-medium hover:underline">
                {format(new Date(invoice.month), "MMM yyyy")}
              </Link>
              <p className="text-sm text-muted-foreground">
                Total: ${invoice.totalAmount.toFixed(2)}
              </p>
            </div>
            <Badge variant="outline">{invoice.paymentStatus}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
