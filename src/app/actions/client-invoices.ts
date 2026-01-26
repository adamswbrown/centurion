"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { createPaymentLink } from "@/lib/stripe"

export async function getMyInvoices() {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  })

  return invoices.map((invoice) => ({
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
  }))
}

export async function getMyInvoiceById(id: number) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
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

  if (!invoice || invoice.userId !== userId) {
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

export async function createMyInvoicePaymentLink(id: number) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
  })

  if (!invoice || invoice.userId !== userId) {
    throw new Error("Invoice not found")
  }

  if (invoice.stripePaymentUrl) {
    return { url: invoice.stripePaymentUrl }
  }

  const result = await createPaymentLink({
    amount: Math.round(Number(invoice.totalAmount) * 100),
    description: `Centurion invoice ${invoice.id}`,
    metadata: {
      invoiceId: invoice.id.toString(),
      userId: invoice.userId.toString(),
    },
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripePaymentUrl: result.url },
  })

  return { url: result.url }
}
