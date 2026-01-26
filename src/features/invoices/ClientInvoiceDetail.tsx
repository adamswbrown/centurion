"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCreateMyInvoicePaymentLink } from "@/hooks/useClientInvoices"

interface ClientInvoiceDetailProps {
  invoice: {
    id: number
    month: Date
    totalAmount: number
    paymentStatus: string
    stripePaymentUrl: string | null
    appointments: Array<{
      id: number
      startTime: Date
      endTime: Date
      fee: number
      status: string
    }>
  }
}

export function ClientInvoiceDetail({ invoice }: ClientInvoiceDetailProps) {
  const createPaymentLink = useCreateMyInvoicePaymentLink()
  const [error, setError] = useState<string | null>(null)

  const handlePayNow = async () => {
    setError(null)
    try {
      const result = await createPaymentLink.mutateAsync(invoice.id)
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment link")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Invoice · {format(new Date(invoice.month), "MMM yyyy")}
          </h1>
          <p className="text-muted-foreground">Total: ${invoice.totalAmount.toFixed(2)}</p>
        </div>
        <Badge variant="outline">{invoice.paymentStatus}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => window.print()} variant="outline">
          Print / Download
        </Button>
        <Button onClick={handlePayNow} disabled={createPaymentLink.isPending}>
          {invoice.stripePaymentUrl ? "Pay Now" : "Generate Payment Link"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <div className="grid grid-cols-4 gap-2 border-b bg-muted px-4 py-2 text-xs font-medium">
          <span>Date</span>
          <span>Time</span>
          <span>Status</span>
          <span className="text-right">Fee</span>
        </div>
        {invoice.appointments.map((appt) => (
          <div key={appt.id} className="grid grid-cols-4 gap-2 px-4 py-2 text-sm">
            <span>{format(new Date(appt.startTime), "MMM dd, yyyy")}</span>
            <span>
              {format(new Date(appt.startTime), "hh:mm a")} - {format(new Date(appt.endTime), "hh:mm a")}
            </span>
            <span>{appt.status}</span>
            <span className="text-right">${appt.fee.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
