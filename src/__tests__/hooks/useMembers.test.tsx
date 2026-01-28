import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/members", () => ({
  getMembers: vi.fn(),
}))

import { getMembers } from "@/app/actions/members"
import { useMembers } from "@/hooks/useMembers"

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
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns members data on success", async () => {
    const mockMembers = [
      { id: "1", name: "John Doe", email: "john@example.com", role: "CLIENT" },
      { id: "2", name: "Jane Smith", email: "jane@example.com", role: "CLIENT" },
    ]

    vi.mocked(getMembers).mockResolvedValue(mockMembers)

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockMembers)
  })

  it("handles loading state", async () => {
    vi.mocked(getMembers).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
    )

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(true)

    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })

  it("handles error state", async () => {
    const mockError = new Error("Failed to fetch members")
    vi.mocked(getMembers).mockRejectedValue(mockError)

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(mockError)
  })

  it("uses correct query key", async () => {
    vi.mocked(getMembers).mockResolvedValue([])

    const { result } = renderHook(() => useMembers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(vi.mocked(getMembers)).toHaveBeenCalledTimes(1)
  })
})
