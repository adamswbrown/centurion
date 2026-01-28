import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Mock BEFORE imports
vi.mock("@/app/actions/client-cohorts", () => ({
  getMyCohorts: vi.fn(),
}))

import { getMyCohorts } from "@/app/actions/client-cohorts"
import { useMyCohorts } from "@/hooks/useClientCohorts"

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

describe("useMyCohorts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch cohorts successfully", async () => {
    const mockCohorts = [
      {
        id: 1,
        name: "Cohort A",
        status: "ACTIVE",
        startDate: new Date("2025-01-01"),
      },
      {
        id: 2,
        name: "Cohort B",
        status: "ACTIVE",
        startDate: new Date("2025-02-01"),
      },
    ]

    vi.mocked(getMyCohorts).mockResolvedValue(mockCohorts)

    const { result } = renderHook(() => useMyCohorts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCohorts)
    expect(getMyCohorts).toHaveBeenCalledWith()
  })

  it("should handle errors when fetching cohorts", async () => {
    const error = new Error("Failed to fetch cohorts")
    vi.mocked(getMyCohorts).mockRejectedValue(error)

    const { result } = renderHook(() => useMyCohorts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})
