import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import { setupAuthMock, mockClientUser } from "../mocks/auth"
import "../mocks/stripe"
import { mockCreatePaymentLink } from "../mocks/stripe"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import {
  getMyInvoices,
  getMyInvoiceById,
  createMyInvoicePaymentLink,
} from "@/app/actions/client-invoices"

// Helper to create a mock invoice
function createMockInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 3,
    month: new Date("2025-01-01"),
    totalAmount: { toNumber: () => 150.0, toString: () => "150.00" } as unknown as number,
    status: "UNPAID",
    stripePaymentUrl: null,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-01-15"),
    ...overrides,
  }
}

describe("Client Invoices Actions", () => {
  beforeEach(() => {
    setupAuthMock(mockClientUser)
  })

  describe("getMyInvoices", () => {
    it("should return invoices with totalAmount as number", async () => {
      const mockInvoices = [
        createMockInvoice({ id: 1, totalAmount: 150.0 }),
        createMockInvoice({ id: 2, totalAmount: 200.5 }),
      ]
      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)

      const result = await getMyInvoices()

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 3 },
        orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      })
      expect(result).toHaveLength(2)
      expect(typeof result[0].totalAmount).toBe("number")
      expect(typeof result[1].totalAmount).toBe("number")
    })

    it("should return empty array when user has no invoices", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([])

      const result = await getMyInvoices()

      expect(result).toEqual([])
    })

    it("should throw when user is not authenticated", async () => {
      setupAuthMock(null)

      await expect(getMyInvoices()).rejects.toThrow("Must be logged in")
    })
  })

  describe("getMyInvoiceById", () => {
    it("should return invoice with appointments and decimal conversions", async () => {
      const mockInvoice = createMockInvoice({
        totalAmount: 250.0,
        appointments: [
          {
            id: 10,
            startTime: new Date("2025-01-10T09:00:00Z"),
            endTime: new Date("2025-01-10T10:00:00Z"),
            fee: 125.0,
            status: "COMPLETED",
          },
          {
            id: 11,
            startTime: new Date("2025-01-12T09:00:00Z"),
            endTime: new Date("2025-01-12T10:00:00Z"),
            fee: 125.0,
            status: "COMPLETED",
          },
        ],
      })
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice)

      const result = await getMyInvoiceById(1)

      expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          appointments: {
            select: { id: true, startTime: true, endTime: true, fee: true, status: true },
            orderBy: { startTime: "asc" },
          },
        },
      })
      expect(typeof result.totalAmount).toBe("number")
      expect(result.appointments).toHaveLength(2)
      expect(typeof result.appointments[0].fee).toBe("number")
      expect(typeof result.appointments[1].fee).toBe("number")
    })

    it("should throw when invoice is not found", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null)

      await expect(getMyInvoiceById(999)).rejects.toThrow("Invoice not found")
    })

    it("should throw when invoice belongs to a different user", async () => {
      const mockInvoice = createMockInvoice({ userId: 99 })
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice)

      await expect(getMyInvoiceById(1)).rejects.toThrow("Invoice not found")
    })

    it("should throw when user is not authenticated", async () => {
      setupAuthMock(null)

      await expect(getMyInvoiceById(1)).rejects.toThrow("Must be logged in")
    })
  })

  describe("createMyInvoicePaymentLink", () => {
    it("should create a new payment link via Stripe", async () => {
      const mockInvoice = createMockInvoice({
        totalAmount: 150.0,
        stripePaymentUrl: null,
      })
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice)
      mockCreatePaymentLink.mockResolvedValue({
        success: true,
        url: "https://checkout.stripe.com/pay/new-link",
      })
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        stripePaymentUrl: "https://checkout.stripe.com/pay/new-link",
      })

      const result = await createMyInvoicePaymentLink(1)

      expect(mockCreatePaymentLink).toHaveBeenCalledWith({
        amount: 15000,
        description: "Centurion invoice 1",
        metadata: { invoiceId: "1", userId: "3" },
      })
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stripePaymentUrl: "https://checkout.stripe.com/pay/new-link" },
      })
      expect(result).toEqual({ url: "https://checkout.stripe.com/pay/new-link" })
    })

    it("should return existing payment link without calling Stripe", async () => {
      const mockInvoice = createMockInvoice({
        stripePaymentUrl: "https://checkout.stripe.com/pay/existing-link",
      })
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice)

      const result = await createMyInvoicePaymentLink(1)

      expect(mockCreatePaymentLink).not.toHaveBeenCalled()
      expect(result).toEqual({ url: "https://checkout.stripe.com/pay/existing-link" })
    })

    it("should throw when invoice is not found", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null)

      await expect(createMyInvoicePaymentLink(999)).rejects.toThrow("Invoice not found")
    })

    it("should throw when Stripe returns an error", async () => {
      const mockInvoice = createMockInvoice({ stripePaymentUrl: null })
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice)
      mockCreatePaymentLink.mockResolvedValue({
        success: false,
        error: "Stripe API error",
      })

      await expect(createMyInvoicePaymentLink(1)).rejects.toThrow("Stripe API error")
    })

    it("should throw when user is not authenticated", async () => {
      setupAuthMock(null)

      await expect(createMyInvoicePaymentLink(1)).rejects.toThrow("Must be logged in")
    })
  })
})
