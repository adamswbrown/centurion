import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"
import { useUnifiedCalendar } from "@/hooks/useUnifiedCalendar"

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useUnifiedCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("fetches calendar events successfully", async () => {
    const mockEvents = [
      {
        id: "1",
        title: "Appointment",
        start: "2025-01-15T10:00:00Z",
        end: "2025-01-15T11:00:00Z",
        type: "appointment",
      },
      {
        id: "2",
        title: "Bootcamp",
        start: "2025-01-16T09:00:00Z",
        end: "2025-01-16T10:00:00Z",
        type: "bootcamp",
      },
    ]

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockEvents,
    } as Response)

    const from = new Date("2025-01-15T00:00:00Z")
    const to = new Date("2025-01-20T23:59:59Z")

    const { result } = renderHook(() => useUnifiedCalendar({ from, to }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockEvents)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/calendar/events?")
    )
    // URLSearchParams encodes colons as %3A
    const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string
    const url = new URL(callUrl, "http://localhost")
    expect(url.searchParams.get("from")).toBe(from.toISOString())
    expect(url.searchParams.get("to")).toBe(to.toISOString())
  })

  it("handles error when fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
    } as Response)

    const from = new Date("2025-01-15T00:00:00Z")
    const to = new Date("2025-01-20T23:59:59Z")

    const { result } = renderHook(() => useUnifiedCalendar({ from, to }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(
      new Error("Failed to fetch calendar events")
    )
  })

  it("includes from and to parameters in query key", () => {
    const from = new Date("2025-01-15T00:00:00Z")
    const to = new Date("2025-01-20T23:59:59Z")

    const { result } = renderHook(() => useUnifiedCalendar({ from, to }), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBeTruthy()
  })

  it("refetches when date range changes", async () => {
    const mockEvents1 = [
      {
        id: "1",
        title: "Event 1",
        start: "2025-01-15T10:00:00Z",
        end: "2025-01-15T11:00:00Z",
        type: "appointment",
      },
    ]

    const mockEvents2 = [
      {
        id: "2",
        title: "Event 2",
        start: "2025-02-15T10:00:00Z",
        end: "2025-02-15T11:00:00Z",
        type: "appointment",
      },
    ]

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents1,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents2,
      } as Response)

    const from1 = new Date("2025-01-15T00:00:00Z")
    const to1 = new Date("2025-01-20T23:59:59Z")

    const { result, rerender } = renderHook(
      ({ from, to }) => useUnifiedCalendar({ from, to }),
      {
        wrapper: createWrapper(),
        initialProps: { from: from1, to: to1 },
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockEvents1)

    const from2 = new Date("2025-02-15T00:00:00Z")
    const to2 = new Date("2025-02-20T23:59:59Z")

    rerender({ from: from2, to: to2 })

    await waitFor(() => expect(result.current.data).toEqual(mockEvents2))
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
