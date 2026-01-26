/**
 * Invoices Server Actions Tests
 *
 * Tests for invoice-related server actions including
 * generation, payment links, and status updates.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { Prisma, PaymentStatus, AttendanceStatus } from "@prisma/client"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  resetAuthMocks,
  resetStripeMocks,
  mockCreatePaymentLink,
  resetEmailMocks,
  sentEmails,
} from "../mocks"

import {
  createMockUser,
  createMockInvoice,
  createMockAppointment,
  resetIdCounters,
} from "../utils/test-data"

// Now import the functions to test
import {
  getInvoices,
  getInvoiceById,
  generateInvoice,
  createManualInvoice,
  createStripePaymentLink,
  updateInvoicePaymentStatus,
  deleteInvoice,
  getRevenueStats,
} from "@/app/actions/invoices"

describe("Invoices Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetStripeMocks()
    resetEmailMocks()
    resetIdCounters()

    // Default: authenticated as admin
    setupAuthMock(mockAdminUser)
  })

  describe("getInvoices", () => {
    it("should return all invoices with user info", async () => {
      const invoices = [
        {
          ...createMockInvoice({ id: 1, userId: 10, totalAmount: 200 }),
          user: { id: 10, name: "User One", email: "user1@test.com" },
          _count: { appointments: 4 },
        },
        {
          ...createMockInvoice({ id: 2, userId: 20, totalAmount: 150 }),
          user: { id: 20, name: "User Two", email: "user2@test.com" },
          _count: { appointments: 3 },
        },
      ]

      mockPrisma.invoice.findMany.mockResolvedValue(invoices)

      const result = await getInvoices()

      expect(result).toHaveLength(2)
      expect(result[0].totalAmount).toBe(200) // Should be converted to number
      expect(result[0].user).toBeDefined()
    })

    it("should filter by userId", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([])

      await getInvoices({ userId: 10 })

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 10 }),
        })
      )
    })

    it("should filter by payment status", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([])

      await getInvoices({ status: PaymentStatus.UNPAID })

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ paymentStatus: PaymentStatus.UNPAID }),
        })
      )
    })

    it("should filter by year", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([])

      await getInvoices({ year: 2024 })

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            month: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      )
    })

    it("should reject non-admin users", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getInvoices()).rejects.toThrow()
    })
  })

  describe("getInvoiceById", () => {
    it("should return invoice with user and appointments", async () => {
      const invoice = {
        ...createMockInvoice({ id: 1, userId: 10 }),
        user: { id: 10, name: "User", email: "user@test.com" },
        appointments: [
          createMockAppointment({ id: 1, fee: 50 }),
          createMockAppointment({ id: 2, fee: 50 }),
        ],
      }

      mockPrisma.invoice.findUnique.mockResolvedValue(invoice)

      const result = await getInvoiceById(1)

      expect(result.id).toBe(1)
      expect(result.totalAmount).toBe(Number(invoice.totalAmount))
      expect(result.appointments).toHaveLength(2)
      expect(result.appointments[0].fee).toBe(50) // Converted to number
    })

    it("should throw error when invoice not found", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null)

      await expect(getInvoiceById(999)).rejects.toThrow("Invoice not found")
    })
  })

  describe("generateInvoice", () => {
    it("should generate invoice from attended appointments", async () => {
      const user = createMockUser({ id: 10, email: "user@test.com" })
      const appointments = [
        createMockAppointment({
          id: 1,
          userId: 10,
          fee: 50,
          status: AttendanceStatus.ATTENDED,
        }),
        createMockAppointment({
          id: 2,
          userId: 10,
          fee: 75,
          status: AttendanceStatus.ATTENDED,
        }),
      ]

      mockPrisma.invoice.findFirst.mockResolvedValue(null) // No existing invoice
      mockPrisma.appointment.findMany.mockResolvedValue(appointments)
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma)
      })
      mockPrisma.invoice.create.mockResolvedValue(
        createMockInvoice({ id: 1, userId: 10, totalAmount: 125 })
      )
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.user.findUnique.mockResolvedValue(user)

      const result = await generateInvoice({
        userId: 10,
        month: "2024-01",
      })

      expect(result).toBeDefined()
      expect(mockPrisma.invoice.create).toHaveBeenCalled()
    })

    it("should prevent duplicate invoices for same month", async () => {
      const existingInvoice = createMockInvoice({ id: 1, userId: 10 })
      mockPrisma.invoice.findFirst.mockResolvedValue(existingInvoice)

      await expect(
        generateInvoice({ userId: 10, month: "2024-01" })
      ).rejects.toThrow("Invoice already exists for this user and month")
    })

    it("should throw error when no attended appointments exist", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null)
      mockPrisma.appointment.findMany.mockResolvedValue([])

      await expect(
        generateInvoice({ userId: 10, month: "2024-01" })
      ).rejects.toThrow("No attended appointments found for this month")
    })

    it("should send invoice email after generation", async () => {
      const user = createMockUser({
        id: 10,
        email: "user@test.com",
        isTestUser: true,
      })
      const appointments = [
        createMockAppointment({
          id: 1,
          userId: 10,
          fee: 100,
          status: AttendanceStatus.ATTENDED,
        }),
      ]

      mockPrisma.invoice.findFirst.mockResolvedValue(null)
      mockPrisma.appointment.findMany.mockResolvedValue(appointments)
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma)
      })
      mockPrisma.invoice.create.mockResolvedValue(
        createMockInvoice({ id: 1, userId: 10, totalAmount: 100 })
      )
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await generateInvoice({ userId: 10, month: "2024-01" })

      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].templateKey).toBe("invoice-sent")
    })

    it("should validate required fields", async () => {
      await expect(
        generateInvoice({ userId: 0, month: "2024-01" })
      ).rejects.toThrow()

      await expect(
        generateInvoice({ userId: 10, month: "" })
      ).rejects.toThrow()
    })
  })

  describe("createManualInvoice", () => {
    it("should create a manual invoice", async () => {
      const invoice = createMockInvoice({ id: 1, userId: 10, totalAmount: 500 })

      mockPrisma.invoice.findFirst.mockResolvedValue(null)
      mockPrisma.invoice.create.mockResolvedValue(invoice)

      const result = await createManualInvoice({
        userId: 10,
        month: "2024-01",
        amount: 500,
        description: "Custom package",
      })

      expect(result.id).toBe(1)
      expect(mockPrisma.invoice.create).toHaveBeenCalled()
    })

    it("should prevent duplicate invoices", async () => {
      const existingInvoice = createMockInvoice({ id: 1, userId: 10 })
      mockPrisma.invoice.findFirst.mockResolvedValue(existingInvoice)

      await expect(
        createManualInvoice({
          userId: 10,
          month: "2024-01",
          amount: 500,
        })
      ).rejects.toThrow("Invoice already exists for this user and month")
    })

    it("should validate amount is positive", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null)

      await expect(
        createManualInvoice({
          userId: 10,
          month: "2024-01",
          amount: -50, // Negative amount
        })
      ).rejects.toThrow()
    })
  })

  describe("createStripePaymentLink", () => {
    it("should create a new payment link", async () => {
      const invoice = {
        ...createMockInvoice({ id: 1, userId: 10, totalAmount: 200 }),
        stripePaymentUrl: null,
        user: { name: "User", email: "user@test.com" },
      }

      mockPrisma.invoice.findUnique.mockResolvedValue(invoice)
      mockPrisma.invoice.update.mockResolvedValue({
        ...invoice,
        stripePaymentUrl: "https://checkout.stripe.com/pay/mock-link",
      })

      const result = await createStripePaymentLink(1)

      expect(result.success).toBe(true)
      expect(result.url).toBeDefined()
      expect(mockCreatePaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 20000, // 200 * 100 (cents)
        })
      )
    })

    it("should return existing payment link if already created", async () => {
      const invoice = {
        ...createMockInvoice({ id: 1, userId: 10 }),
        stripePaymentUrl: "https://existing-link.com",
        user: { name: "User", email: "user@test.com" },
      }

      mockPrisma.invoice.findUnique.mockResolvedValue(invoice)

      const result = await createStripePaymentLink(1)

      expect(result.success).toBe(true)
      expect(result.url).toBe("https://existing-link.com")
      expect(mockCreatePaymentLink).not.toHaveBeenCalled()
    })

    it("should throw error when invoice not found", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null)

      await expect(createStripePaymentLink(999)).rejects.toThrow(
        "Invoice not found"
      )
    })

    it("should handle Stripe API failures", async () => {
      const invoice = {
        ...createMockInvoice({ id: 1, userId: 10 }),
        stripePaymentUrl: null,
        user: { name: "User", email: "user@test.com" },
      }

      mockPrisma.invoice.findUnique.mockResolvedValue(invoice)
      mockCreatePaymentLink.mockResolvedValue({
        success: false,
        error: "Stripe API error",
      })

      await expect(createStripePaymentLink(1)).rejects.toThrow("Stripe API error")
    })
  })

  describe("updateInvoicePaymentStatus", () => {
    it("should update payment status to PAID", async () => {
      const invoice = createMockInvoice({
        id: 1,
        userId: 10,
        paymentStatus: PaymentStatus.UNPAID,
      })
      const updatedInvoice = {
        ...invoice,
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        user: { name: "User", email: "user@test.com", isTestUser: true },
      }

      mockPrisma.invoice.update.mockResolvedValue(updatedInvoice)

      const result = await updateInvoicePaymentStatus(1, PaymentStatus.PAID)

      expect(result.paymentStatus).toBe(PaymentStatus.PAID)
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.PAID,
            paidAt: expect.any(Date),
          }),
        })
      )
    })

    it("should send payment confirmation email when marked as paid", async () => {
      const updatedInvoice = {
        ...createMockInvoice({ id: 1, paymentStatus: PaymentStatus.PAID }),
        user: { name: "User", email: "user@test.com", isTestUser: true },
      }

      mockPrisma.invoice.update.mockResolvedValue(updatedInvoice)

      await updateInvoicePaymentStatus(1, PaymentStatus.PAID)

      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].templateKey).toBe("invoice-paid")
    })

    it("should not set paidAt when status is not PAID", async () => {
      const invoice = createMockInvoice({ id: 1 })
      const updatedInvoice = {
        ...invoice,
        paymentStatus: PaymentStatus.OVERDUE,
        user: { name: "User", email: "user@test.com", isTestUser: true },
      }

      mockPrisma.invoice.update.mockResolvedValue(updatedInvoice)

      await updateInvoicePaymentStatus(1, PaymentStatus.OVERDUE)

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.OVERDUE },
        })
      )
    })
  })

  describe("deleteInvoice", () => {
    it("should unlink appointments and delete invoice", async () => {
      const invoice = {
        ...createMockInvoice({ id: 1 }),
        appointments: [
          createMockAppointment({ id: 1, invoiceId: 1 }),
          createMockAppointment({ id: 2, invoiceId: 1 }),
        ],
      }

      mockPrisma.invoice.findUnique.mockResolvedValue(invoice)
      mockPrisma.$transaction.mockResolvedValue([])

      const result = await deleteInvoice(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it("should throw error when invoice not found", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null)

      await expect(deleteInvoice(999)).rejects.toThrow("Invoice not found")
    })
  })

  describe("getRevenueStats", () => {
    it("should return revenue statistics by month", async () => {
      const invoices = [
        {
          month: new Date(2024, 0, 1),
          totalAmount: new Prisma.Decimal(200),
        },
        {
          month: new Date(2024, 0, 1),
          totalAmount: new Prisma.Decimal(150),
        },
        {
          month: new Date(2024, 1, 1),
          totalAmount: new Prisma.Decimal(300),
        },
      ]

      mockPrisma.invoice.findMany.mockResolvedValue(invoices)

      const result = await getRevenueStats(2024)

      expect(result.totalRevenue).toBe(650)
      expect(result.monthlyRevenue[0]).toBe(350) // January
      expect(result.monthlyRevenue[1]).toBe(300) // February
      expect(result.invoiceCount).toBe(3)
    })

    it("should return zero for months with no revenue", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([])

      const result = await getRevenueStats(2024)

      expect(result.totalRevenue).toBe(0)
      expect(result.invoiceCount).toBe(0)
      // All months should be 0
      Object.values(result.monthlyRevenue).forEach((amount) => {
        expect(amount).toBe(0)
      })
    })

    it("should only count PAID invoices", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([])

      await getRevenueStats(2024)

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentStatus: PaymentStatus.PAID,
          }),
        })
      )
    })
  })
})
