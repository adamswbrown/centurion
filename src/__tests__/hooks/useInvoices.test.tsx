/**
 * useInvoices Hook Tests
 *
 * Tests for the invoices-related React Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"
import { PaymentStatus } from "@prisma/client"

// Mock the server actions
vi.mock("@/app/actions/invoices", () => ({
  getInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  getRevenueStats: vi.fn(),
  generateInvoice: vi.fn(),
  createManualInvoice: vi.fn(),
  createStripePaymentLink: vi.fn(),
  updateInvoicePaymentStatus: vi.fn(),
  deleteInvoice: vi.fn(),
}))

import {
  getInvoices,
  getInvoiceById,
  getRevenueStats,
  generateInvoice,
  createManualInvoice,
  createStripePaymentLink,
  updateInvoicePaymentStatus,
  deleteInvoice,
} from "@/app/actions/invoices"

import {
  useInvoices,
  useInvoice,
  useRevenueStats,
  useGenerateInvoice,
  useCreateManualInvoice,
  useCreatePaymentLink,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
} from "@/hooks/useInvoices"

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Wrapper component for providing React Query context
function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useInvoices Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useInvoices", () => {
    it("should fetch invoices successfully", async () => {
      const mockInvoices = [
        {
          id: 1,
          userId: 1,
          amount: 100,
          status: "PAID" as PaymentStatus,
          createdAt: new Date(),
          dueDate: new Date(),
        },
        {
          id: 2,
          userId: 2,
          amount: 200,
          status: "UNPAID" as PaymentStatus,
          createdAt: new Date(),
          dueDate: new Date(),
        },
      ]

      vi.mocked(getInvoices).mockResolvedValue(mockInvoices as any)

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockInvoices)
      expect(getInvoices).toHaveBeenCalledWith(undefined)
    })

    it("should pass params to getInvoices", async () => {
      const params = { userId: 10, status: "UNPAID" as PaymentStatus }
      vi.mocked(getInvoices).mockResolvedValue([])

      const { result } = renderHook(() => useInvoices(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getInvoices).toHaveBeenCalledWith(params)
    })

    it("should pass year filter param", async () => {
      const params = { year: 2024 }
      vi.mocked(getInvoices).mockResolvedValue([])

      const { result } = renderHook(() => useInvoices(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getInvoices).toHaveBeenCalledWith(params)
    })

    it("should handle errors", async () => {
      vi.mocked(getInvoices).mockRejectedValue(new Error("Failed to fetch"))

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useInvoice", () => {
    it("should fetch invoice by id successfully", async () => {
      const mockInvoice = {
        id: 1,
        userId: 1,
        amount: 100,
        status: "PAID" as PaymentStatus,
        createdAt: new Date(),
        dueDate: new Date(),
      }

      vi.mocked(getInvoiceById).mockResolvedValue(mockInvoice as any)

      const { result } = renderHook(() => useInvoice(1), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockInvoice)
      expect(getInvoiceById).toHaveBeenCalledWith(1)
    })

    it("should not fetch when id is 0", () => {
      vi.mocked(getInvoiceById).mockResolvedValue({} as any)

      const { result } = renderHook(() => useInvoice(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(getInvoiceById).not.toHaveBeenCalled()
    })

    it("should handle fetch errors", async () => {
      vi.mocked(getInvoiceById).mockRejectedValue(
        new Error("Invoice not found")
      )

      const { result } = renderHook(() => useInvoice(999), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useRevenueStats", () => {
    it("should fetch revenue stats by year successfully", async () => {
      const mockStats = {
        totalRevenue: 50000,
        invoiceCount: 25,
        paidCount: 20,
        unpaidCount: 5,
      }

      vi.mocked(getRevenueStats).mockResolvedValue(mockStats as any)

      const { result } = renderHook(() => useRevenueStats(2024), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(getRevenueStats).toHaveBeenCalledWith(2024)
    })

    it("should not fetch when year is 0", () => {
      vi.mocked(getRevenueStats).mockResolvedValue({} as any)

      const { result } = renderHook(() => useRevenueStats(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(getRevenueStats).not.toHaveBeenCalled()
    })

    it("should handle fetch errors", async () => {
      vi.mocked(getRevenueStats).mockRejectedValue(new Error("Failed to fetch"))

      const { result } = renderHook(() => useRevenueStats(2024), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useGenerateInvoice", () => {
    it("should generate invoice successfully", async () => {
      const newInvoice = {
        id: 1,
        userId: 1,
        amount: 100,
        status: "UNPAID" as PaymentStatus,
        createdAt: new Date(),
        dueDate: new Date(),
      }

      vi.mocked(generateInvoice).mockResolvedValue(newInvoice as any)

      const { result } = renderHook(() => useGenerateInvoice(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        appointmentIds: [1, 2],
        userId: 1,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(generateInvoice).toHaveBeenCalled()
    })

    it("should handle generation errors", async () => {
      vi.mocked(generateInvoice).mockRejectedValue(
        new Error("Failed to generate invoice")
      )

      const { result } = renderHook(() => useGenerateInvoice(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        appointmentIds: [1],
        userId: 1,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it("should invalidate invoices and appointments queries on success", async () => {
      vi.mocked(generateInvoice).mockResolvedValue({ id: 1 } as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useGenerateInvoice(), { wrapper })

      result.current.mutate({
        appointmentIds: [1],
        userId: 1,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoices"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["appointments"],
      })
    })
  })

  describe("useCreateManualInvoice", () => {
    it("should create manual invoice successfully", async () => {
      const newInvoice = {
        id: 2,
        userId: 1,
        amount: 150,
        status: "UNPAID" as PaymentStatus,
        createdAt: new Date(),
        dueDate: new Date(),
      }

      vi.mocked(createManualInvoice).mockResolvedValue(newInvoice as any)

      const { result } = renderHook(() => useCreateManualInvoice(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        userId: 1,
        amount: 150,
        description: "Monthly coaching fee",
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(createManualInvoice).toHaveBeenCalled()
    })

    it("should handle creation errors", async () => {
      vi.mocked(createManualInvoice).mockRejectedValue(
        new Error("Invalid amount")
      )

      const { result } = renderHook(() => useCreateManualInvoice(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        userId: 1,
        amount: -100,
        description: "Monthly coaching fee",
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it("should invalidate invoices query on success", async () => {
      vi.mocked(createManualInvoice).mockResolvedValue({ id: 2 } as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreateManualInvoice(), {
        wrapper,
      })

      result.current.mutate({
        userId: 1,
        amount: 150,
        description: "Monthly coaching fee",
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoices"],
      })
    })
  })

  describe("useCreatePaymentLink", () => {
    it("should create payment link successfully", async () => {
      const paymentLink = {
        url: "https://checkout.stripe.com/pay/abc123",
      }

      vi.mocked(createStripePaymentLink).mockResolvedValue(paymentLink as any)

      const { result } = renderHook(() => useCreatePaymentLink(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(createStripePaymentLink).toHaveBeenCalledWith(1)
    })

    it("should handle link creation errors", async () => {
      vi.mocked(createStripePaymentLink).mockRejectedValue(
        new Error("Stripe error")
      )

      const { result } = renderHook(() => useCreatePaymentLink(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(999)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it("should invalidate invoices and specific invoice queries on success", async () => {
      vi.mocked(createStripePaymentLink).mockResolvedValue({
        url: "https://checkout.stripe.com/pay/abc123",
      } as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreatePaymentLink(), { wrapper })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoices"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoice", 1],
      })
    })
  })

  describe("useUpdateInvoiceStatus", () => {
    it("should update invoice status successfully", async () => {
      const updatedInvoice = {
        id: 1,
        userId: 1,
        amount: 100,
        status: "PAID" as PaymentStatus,
        createdAt: new Date(),
        dueDate: new Date(),
      }

      vi.mocked(updateInvoicePaymentStatus).mockResolvedValue(updatedInvoice as any)

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 1,
        status: "PAID" as PaymentStatus,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(updateInvoicePaymentStatus).toHaveBeenCalledWith(1, "PAID")
    })

    it("should handle status update errors", async () => {
      vi.mocked(updateInvoicePaymentStatus).mockRejectedValue(
        new Error("Invoice not found")
      )

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 999,
        status: "PAID" as PaymentStatus,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it("should invalidate invoices, specific invoice, and revenue-stats queries on success", async () => {
      vi.mocked(updateInvoicePaymentStatus).mockResolvedValue({
        id: 1,
        status: "PAID",
      } as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useUpdateInvoiceStatus(), {
        wrapper,
      })

      result.current.mutate({
        id: 1,
        status: "PAID" as PaymentStatus,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoices"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoice", 1],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["revenue-stats"],
      })
    })
  })

  describe("useDeleteInvoice", () => {
    it("should delete invoice successfully", async () => {
      vi.mocked(deleteInvoice).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(deleteInvoice).toHaveBeenCalledWith(1)
    })

    it("should handle deletion errors", async () => {
      vi.mocked(deleteInvoice).mockRejectedValue(
        new Error("Invoice not found")
      )

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(999)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it("should invalidate invoices and appointments queries on success", async () => {
      vi.mocked(deleteInvoice).mockResolvedValue({ success: true })

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useDeleteInvoice(), { wrapper })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["invoices"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["appointments"],
      })
    })
  })
})
