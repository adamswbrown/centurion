"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { ExternalLink, Trash2 } from "lucide-react"
import { PaymentStatus } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeleteInvoice, useCreatePaymentLink, useInvoices } from "@/hooks/useInvoices"

function getStatusBadgeVariant(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "default"
    case "UNPAID":
      return "secondary"
    case "OVERDUE":
      return "destructive"
    case "CANCELLED":
      return "outline"
    default:
      return "secondary"
  }
}

export function InvoiceList() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [creatingLinkFor, setCreatingLinkFor] = useState<number | null>(null)

  const { data: invoices, isLoading } = useInvoices(
    statusFilter !== "ALL" ? { status: statusFilter } : undefined
  )
  const deleteInvoice = useDeleteInvoice()
  const createPaymentLink = useCreatePaymentLink()

  const handleCreatePaymentLink = async (invoiceId: number) => {
    setCreatingLinkFor(invoiceId)
    try {
      const result = await createPaymentLink.mutateAsync(invoiceId)
      if (result.success && result.url) {
        window.open(result.url, "_blank")
      }
    } finally {
      setCreatingLinkFor(null)
    }
  }

  if (isLoading) {
    return <div>Loading invoices...</div>
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No invoices yet. Generate an invoice from attended appointments.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter by status:</span>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as PaymentStatus | "ALL")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Invoices</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Month</TableHead>
            <TableHead>Sessions</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              <Link
                href={`/billing/${invoice.id}`}
                className="hover:underline"
              >
                {invoice.user.name || invoice.user.email}
              </Link>
            </TableCell>
            <TableCell>
              {format(new Date(invoice.month), "MMMM yyyy")}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{invoice._count.appointments}</Badge>
            </TableCell>
            <TableCell className="font-mono">
              ${(invoice.totalAmount / 100).toFixed(2)}
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(invoice.paymentStatus)}>
                {invoice.paymentStatus}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                {invoice.stripePaymentUrl ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(invoice.stripePaymentUrl!, "_blank")}
                    aria-label="Open payment link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCreatePaymentLink(invoice.id)}
                    disabled={creatingLinkFor === invoice.id}
                  >
                    {creatingLinkFor === invoice.id
                      ? "Creating..."
                      : "Create Link"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteInvoice.mutate(invoice.id)}
                  aria-label="Delete invoice"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  )
}
