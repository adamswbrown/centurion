import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Mock BEFORE imports
vi.mock("@/app/actions/client-appointments", () => ({
  getMyAppointments: vi.fn(),
  getMyAppointmentById: vi.fn(),
  cancelMyAppointment: vi.fn(),
}))

import {
  getMyAppointments,
  getMyAppointmentById,
  cancelMyAppointment,
} from "@/app/actions/client-appointments"
import {
  useMyAppointments,
  useMyAppointment,
  useCancelMyAppointment,
} from "@/hooks/useClientAppointments"

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

describe("useMyAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch appointments successfully without params", async () => {
    const mockAppointments = [
      { id: 1, date: new Date("2025-01-28"), userId: 1, status: "CONFIRMED" },
      { id: 2, date: new Date("2025-01-29"), userId: 1, status: "PENDING" },
    ]

    vi.mocked(getMyAppointments).mockResolvedValue(mockAppointments)

    const { result } = renderHook(() => useMyAppointments(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockAppointments)
    expect(getMyAppointments).toHaveBeenCalledWith(undefined)
  })

  it("should fetch appointments successfully with date params", async () => {
    const from = new Date("2025-01-01")
    const to = new Date("2025-01-31")
    const mockAppointments = [
      { id: 1, date: new Date("2025-01-15"), userId: 1, status: "CONFIRMED" },
    ]

    vi.mocked(getMyAppointments).mockResolvedValue(mockAppointments)

    const { result } = renderHook(() => useMyAppointments({ from, to }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockAppointments)
    expect(getMyAppointments).toHaveBeenCalledWith({ from, to })
  })

  it("should handle errors when fetching appointments", async () => {
    const error = new Error("Failed to fetch appointments")
    vi.mocked(getMyAppointments).mockRejectedValue(error)

    const { result } = renderHook(() => useMyAppointments(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})

describe("useMyAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch appointment by id successfully", async () => {
    const mockAppointment = {
      id: 1,
      date: new Date("2025-01-28"),
      userId: 1,
      status: "CONFIRMED",
    }

    vi.mocked(getMyAppointmentById).mockResolvedValue(mockAppointment)

    const { result } = renderHook(() => useMyAppointment(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockAppointment)
    expect(getMyAppointmentById).toHaveBeenCalledWith(1)
  })

  it("should not fetch when id is 0", async () => {
    const { result } = renderHook(() => useMyAppointment(0), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getMyAppointmentById).not.toHaveBeenCalled()
  })

  it("should handle errors when fetching appointment by id", async () => {
    const error = new Error("Failed to fetch appointment")
    vi.mocked(getMyAppointmentById).mockRejectedValue(error)

    const { result } = renderHook(() => useMyAppointment(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})

describe("useCancelMyAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should cancel appointment successfully", async () => {
    const mockResult = { success: true }
    vi.mocked(cancelMyAppointment).mockResolvedValue(mockResult)

    const { result } = renderHook(() => useCancelMyAppointment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResult)
    expect(cancelMyAppointment).toHaveBeenCalledWith(1)
  })

  it("should handle errors when canceling appointment", async () => {
    const error = new Error("Failed to cancel appointment")
    vi.mocked(cancelMyAppointment).mockRejectedValue(error)

    const { result } = renderHook(() => useCancelMyAppointment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})
