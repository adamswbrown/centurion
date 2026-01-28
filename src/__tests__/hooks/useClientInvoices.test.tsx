import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Mock BEFORE imports
vi.mock("@/app/actions/client-invoices", () => ({
  getMyInvoices: vi.fn(),
  getMyInvoiceById: vi.fn(),
  createMyInvoicePaymentLink: vi.fn(),
}))

import {
  getMyInvoices,
  getMyInvoiceById,
  createMyInvoicePaymentLink,
} from "@/app/actions/client-invoices"
import {
  useMyInvoices,
  useMyInvoice,
  useCreateMyInvoicePaymentLink,
} from "@/hooks/useClientInvoices"

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe("useMyInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch invoices successfully", async () => {
    const mockInvoices = [
      { id: 1, amount: 100, status: "UNPAID", userId: 1 },
      { id: 2, amount: 200, status: "PAID", userId: 1 },
    ]

    vi.mocked(getMyInvoices).mockResolvedValue(mockInvoices)

    const { result } = renderHook(() => useMyInvoices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockInvoices)
    expect(getMyInvoices).toHaveBeenCalledWith()
  })

  it("should handle errors when fetching invoices", async () => {
    const error = new Error("Failed to fetch invoices")
    vi.mocked(getMyInvoices).mockRejectedValue(error)

    const { result } = renderHook(() => useMyInvoices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})

describe("useMyInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch invoice by id successfully", async () => {
    const mockInvoice = { id: 1, amount: 100, status: "UNPAID", userId: 1 }

    vi.mocked(getMyInvoiceById).mockResolvedValue(mockInvoice)

    const { result } = renderHook(() => useMyInvoice(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockInvoice)
    expect(getMyInvoiceById).toHaveBeenCalledWith(1)
  })

  it("should not fetch when id is undefined", async () => {
    const { result } = renderHook(() => useMyInvoice(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getMyInvoiceById).not.toHaveBeenCalled()
  })

  it("should handle errors when fetching invoice by id", async () => {
    const error = new Error("Failed to fetch invoice")
    vi.mocked(getMyInvoiceById).mockRejectedValue(error)

    const { result } = renderHook(() => useMyInvoice(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})

describe("useCreateMyInvoicePaymentLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create payment link successfully", async () => {
    const mockPaymentLink = { url: "https://pay.stripe.com/abc123" }
    vi.mocked(createMyInvoicePaymentLink).mockResolvedValue(mockPaymentLink)

    const { result } = renderHook(() => useCreateMyInvoicePaymentLink(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPaymentLink)
    expect(createMyInvoicePaymentLink).toHaveBeenCalledWith(1)
  })

  it("should handle errors when creating payment link", async () => {
    const error = new Error("Failed to create payment link")
    vi.mocked(createMyInvoicePaymentLink).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateMyInvoicePaymentLink(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})
