"use server"

import { z } from "zod"
import { Prisma, PaymentStatus, AttendanceStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createPaymentLink } from "@/lib/stripe"
import { startOfMonth, endOfMonth } from "date-fns"

const generateInvoiceSchema = z.object({
  userId: z.number().int().positive(),
  month: z.string().min(1, "Month is required"), // Format: YYYY-MM
})

const createManualInvoiceSchema = z.object({
  userId: z.number().int().positive(),
  month: z.string().min(1, "Month is required"),
  amount: z.number().min(0, "Amount must be positive"),
  description: z.string().optional(),
})

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>
export type CreateManualInvoiceInput = z.infer<typeof createManualInvoiceSchema>

export async function getInvoices(params?: {
  userId?: number
  status?: PaymentStatus
  year?: number
}) {
  await requireAdmin()

  const where: Prisma.InvoiceWhereInput = {}

  if (params?.userId) {
    where.userId = params.userId
  }

  if (params?.status) {
    where.paymentStatus = params.status
  }

  if (params?.year) {
    where.month = {
      gte: new Date(`${params.year}-01-01`),
      lte: new Date(`${params.year}-12-31`),
    }
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          appointments: true,
        },
      },
    },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  })

  return invoices.map((invoice) => ({
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
  }))
}

export async function getInvoiceById(id: number) {
  await requireAdmin()

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      appointments: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          fee: true,
          status: true,
        },
        orderBy: { startTime: "asc" },
      },
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  return {
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
    appointments: invoice.appointments.map((apt) => ({
      ...apt,
      fee: Number(apt.fee),
    })),
  }
}

export async function generateInvoice(input: GenerateInvoiceInput) {
  await requireAdmin()

  const result = generateInvoiceSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { userId, month } = result.data

  // Parse month (format: YYYY-MM)
  const monthDate = new Date(month + "-01")
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)

  // Check if invoice already exists for this user/month
  const existing = await prisma.invoice.findFirst({
    where: {
      userId,
      month: monthDate,
    },
  })

  if (existing) {
    throw new Error("Invoice already exists for this user and month")
  }

  // Find all ATTENDED appointments for this user in this month
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: AttendanceStatus.ATTENDED,
      startTime: {
        gte: monthStart,
        lte: monthEnd,
      },
      invoiceId: null, // Only include appointments not already invoiced
    },
  })

  if (appointments.length === 0) {
    throw new Error("No attended appointments found for this month")
  }

  // Calculate total
  const totalAmount = appointments.reduce(
    (sum, apt) => sum.add(apt.fee),
    new Prisma.Decimal(0),
  )

  // Create invoice and link appointments in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        userId,
        month: monthDate,
        totalAmount,
        paymentStatus: PaymentStatus.UNPAID,
      },
    })

    // Link appointments to invoice
    await tx.appointment.updateMany({
      where: {
        id: { in: appointments.map((a) => a.id) },
      },
      data: {
        invoiceId: newInvoice.id,
      },
    })

    return newInvoice
  })

  return invoice
}

export async function createManualInvoice(input: CreateManualInvoiceInput) {
  await requireAdmin()

  const result = createManualInvoiceSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { userId, month, amount } = result.data

  // Parse month (format: YYYY-MM)
  const monthDate = new Date(month + "-01")

  // Check if invoice already exists
  const existing = await prisma.invoice.findFirst({
    where: {
      userId,
      month: monthDate,
    },
  })

  if (existing) {
    throw new Error("Invoice already exists for this user and month")
  }

  const invoice = await prisma.invoice.create({
    data: {
      userId,
      month: monthDate,
      totalAmount: new Prisma.Decimal(amount),
      paymentStatus: PaymentStatus.UNPAID,
    },
  })

  return invoice
}

export async function createStripePaymentLink(invoiceId: number) {
  await requireAdmin()

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  if (invoice.stripePaymentUrl) {
    return { success: true, url: invoice.stripePaymentUrl }
  }

  const monthYear = new Date(invoice.month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const result = await createPaymentLink({
    amount: Math.round(Number(invoice.totalAmount) * 100), // Convert to cents
    description: `Invoice for ${monthYear} - ${invoice.user.name || invoice.user.email}`,
    metadata: {
      invoiceId: String(invoice.id),
      userId: String(invoice.userId),
      month: invoice.month.toISOString(),
    },
  })

  if (!result.success) {
    throw new Error(result.error || "Failed to create payment link")
  }

  // Save payment link to invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { stripePaymentUrl: result.url },
  })

  return { success: true, url: result.url }
}

export async function updateInvoicePaymentStatus(
  id: number,
  status: PaymentStatus,
) {
  await requireAdmin()

  const data: Prisma.InvoiceUpdateInput = {
    paymentStatus: status,
  }

  if (status === PaymentStatus.PAID) {
    data.paidAt = new Date()
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data,
  })

  return updated
}

export async function deleteInvoice(id: number) {
  await requireAdmin()

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      appointments: true,
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  // Unlink appointments and delete invoice in transaction
  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: {
        invoiceId: id,
      },
      data: {
        invoiceId: null,
      },
    }),
    prisma.invoice.delete({
      where: { id },
    }),
  ])

  return { success: true }
}

export async function getRevenueStats(year: number) {
  await requireAdmin()

  const invoices = await prisma.invoice.findMany({
    where: {
      month: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
      paymentStatus: PaymentStatus.PAID,
    },
    select: {
      month: true,
      totalAmount: true,
    },
  })

  // Group by month
  const monthlyRevenue: Record<number, number> = {}
  for (let i = 0; i < 12; i++) {
    monthlyRevenue[i] = 0
  }

  invoices.forEach((invoice) => {
    const month = new Date(invoice.month).getMonth()
    monthlyRevenue[month] += Number(invoice.totalAmount)
  })

  const totalRevenue = Object.values(monthlyRevenue).reduce(
    (sum, amount) => sum + amount,
    0,
  )

  return {
    monthlyRevenue,
    totalRevenue,
    invoiceCount: invoices.length,
  }
}
