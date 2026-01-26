"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { ExternalLink, Copy, Check } from "lucide-react"
import { PaymentStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  useUpdateInvoiceStatus,
  useCreatePaymentLink,
  useDeleteInvoice,
} from "@/hooks/useInvoices"

interface InvoiceDetailProps {
  invoice: {
    id: number
    month: Date
    totalAmount: number
    paymentStatus: PaymentStatus
    stripePaymentUrl: string | null
    paidAt: Date | null
    createdAt: Date
    user: {
      id: number
      name: string | null
      email: string
    }
    appointments: Array<{
      id: number
      startTime: Date
      endTime: Date
      fee: number
      status: string
    }>
  }
}

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

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const updateStatus = useUpdateInvoiceStatus()
  const createPaymentLink = useCreatePaymentLink()
  const deleteInvoice = useDeleteInvoice()
  const router = useRouter()

  const handleStatusChange = (newStatus: PaymentStatus) => {
    setError(null)
    setMessage(null)

    updateStatus.mutate(
      { id: invoice.id, status: newStatus },
      {
        onSuccess: () => {
          setMessage(`Payment status updated to ${newStatus}`)
          setTimeout(() => setMessage(null), 3000)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update status")
        },
      },
    )
  }

  const handleCreatePaymentLink = async () => {
    setError(null)
    setMessage(null)

    try {
      const result = await createPaymentLink.mutateAsync(invoice.id)
      if (result.success) {
        setMessage("Payment link created successfully")
        setTimeout(() => setMessage(null), 3000)
      } else {
        setError(
          ("error" in result ? result.error : "Failed to create payment link") as string
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment link")
    }
  }

  const handleCopyLink = async () => {
    if (invoice.stripePaymentUrl) {
      await navigator.clipboard.writeText(invoice.stripePaymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDelete = () => {
    deleteInvoice.mutate(invoice.id, {
      onSuccess: () => {
        router.push("/billing")
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to delete invoice")
      },
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Details</CardTitle>
            <Badge variant={getStatusBadgeVariant(invoice.paymentStatus)}>
              {invoice.paymentStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Member</Label>
              <p className="text-lg font-medium">
                {invoice.user.name || invoice.user.email}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Month</Label>
              <p className="text-lg font-medium">
                {format(new Date(invoice.month), "MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Total Amount</Label>
              <p className="text-2xl font-bold">
                ${(invoice.totalAmount / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Sessions</Label>
              <p className="text-2xl font-bold">{invoice.appointments.length}</p>
            </div>
          </div>

          {invoice.paidAt && (
            <div>
              <Label className="text-muted-foreground">Paid On</Label>
              <p className="text-lg">
                {format(new Date(invoice.paidAt), "PPP 'at' p")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Payment Status</Label>
            <Select
              value={invoice.paymentStatus}
              onValueChange={(value) => handleStatusChange(value as PaymentStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNPAID">UNPAID</SelectItem>
                <SelectItem value="PAID">PAID</SelectItem>
                <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t space-y-2">
            <Label>Stripe Payment Link</Label>
            {invoice.stripePaymentUrl ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(invoice.stripePaymentUrl!, "_blank")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleCreatePaymentLink}
                disabled={createPaymentLink.isPending}
                className="w-full"
              >
                {createPaymentLink.isPending
                  ? "Creating..."
                  : "Create Payment Link"}
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete Invoice
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the invoice and unlink all
                    appointments. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointments linked to this invoice
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      {format(new Date(appointment.startTime), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(appointment.startTime), "hh:mm a")} -{" "}
                      {format(new Date(appointment.endTime), "hh:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{appointment.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${(appointment.fee / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
