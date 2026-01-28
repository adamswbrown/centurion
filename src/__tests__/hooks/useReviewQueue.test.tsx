import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/review-queue", () => ({
  getWeeklySummaries: vi.fn(),
  getWeeklyResponse: vi.fn(),
  saveWeeklyResponse: vi.fn(),
  getReviewQueueSummary: vi.fn(),
  getCoachCohorts: vi.fn(),
}))

import {
  getWeeklySummaries,
  getWeeklyResponse,
  saveWeeklyResponse,
  getReviewQueueSummary,
  getCoachCohorts,
} from "@/app/actions/review-queue"
import {
  useWeeklySummaries,
  useWeeklyResponse,
  useSaveWeeklyResponse,
  useReviewQueueSummary,
  useCoachCohorts,
} from "@/hooks/useReviewQueue"

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

describe("useWeeklySummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch weekly summaries successfully", async () => {
    const mockSummaries = [
      { clientId: 1, clientName: "John Doe", weekStart: "2025-01-20", completed: true },
      { clientId: 2, clientName: "Jane Smith", weekStart: "2025-01-20", completed: false },
    ]

    vi.mocked(getWeeklySummaries).mockResolvedValue(mockSummaries)

    const { result } = renderHook(() => useWeeklySummaries("2025-01-20", 1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockSummaries)
    expect(getWeeklySummaries).toHaveBeenCalledWith("2025-01-20", 1)
  })

  it("should handle error when fetching weekly summaries", async () => {
    const mockError = new Error("Failed to fetch summaries")
    vi.mocked(getWeeklySummaries).mockRejectedValue(mockError)

    const { result } = renderHook(() => useWeeklySummaries(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should fetch without parameters", async () => {
    const mockSummaries = []
    vi.mocked(getWeeklySummaries).mockResolvedValue(mockSummaries)

    const { result } = renderHook(() => useWeeklySummaries(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getWeeklySummaries).toHaveBeenCalledWith(undefined, undefined)
  })
})

describe("useWeeklyResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch weekly response successfully", async () => {
    const mockResponse = {
      clientId: 1,
      weekStart: "2025-01-20",
      loomUrl: "https://loom.com/share/123",
      note: "Great progress this week",
    }

    vi.mocked(getWeeklyResponse).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useWeeklyResponse(1, "2025-01-20"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(getWeeklyResponse).toHaveBeenCalledWith(1, "2025-01-20")
  })

  it("should handle error when fetching weekly response", async () => {
    const mockError = new Error("Failed to fetch response")
    vi.mocked(getWeeklyResponse).mockRejectedValue(mockError)

    const { result } = renderHook(() => useWeeklyResponse(1, "2025-01-20"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should not fetch when clientId is 0", () => {
    const { result } = renderHook(() => useWeeklyResponse(0, "2025-01-20"), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getWeeklyResponse).not.toHaveBeenCalled()
  })

  it("should not fetch when weekStart is empty", () => {
    const { result } = renderHook(() => useWeeklyResponse(1, ""), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getWeeklyResponse).not.toHaveBeenCalled()
  })
})

describe("useSaveWeeklyResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should save weekly response successfully", async () => {
    const mockSavedResponse = {
      clientId: 1,
      weekStart: "2025-01-20",
      loomUrl: "https://loom.com/share/123",
      note: "Good progress",
    }

    vi.mocked(saveWeeklyResponse).mockResolvedValue(mockSavedResponse)

    const { result } = renderHook(() => useSaveWeeklyResponse(), {
      wrapper: createWrapper(),
    })

    const input = {
      clientId: 1,
      weekStart: "2025-01-20",
      loomUrl: "https://loom.com/share/123",
      note: "Good progress",
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(saveWeeklyResponse).toHaveBeenCalledWith(input)
  })

  it("should handle error when saving weekly response", async () => {
    const mockError = new Error("Failed to save response")
    vi.mocked(saveWeeklyResponse).mockRejectedValue(mockError)

    const { result } = renderHook(() => useSaveWeeklyResponse(), {
      wrapper: createWrapper(),
    })

    const input = {
      clientId: 1,
      weekStart: "2025-01-20",
      loomUrl: null,
      note: "Test note",
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useReviewQueueSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch review queue summary successfully", async () => {
    const mockSummary = {
      totalClients: 25,
      completedResponses: 20,
      pendingResponses: 5,
      weekStart: "2025-01-20",
    }

    vi.mocked(getReviewQueueSummary).mockResolvedValue(mockSummary)

    const { result } = renderHook(() => useReviewQueueSummary("2025-01-20"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockSummary)
    expect(getReviewQueueSummary).toHaveBeenCalledWith("2025-01-20")
  })

  it("should handle error when fetching review queue summary", async () => {
    const mockError = new Error("Failed to fetch summary")
    vi.mocked(getReviewQueueSummary).mockRejectedValue(mockError)

    const { result } = renderHook(() => useReviewQueueSummary(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should fetch without weekStart parameter", async () => {
    const mockSummary = {
      totalClients: 25,
      completedResponses: 20,
      pendingResponses: 5,
    }

    vi.mocked(getReviewQueueSummary).mockResolvedValue(mockSummary)

    const { result } = renderHook(() => useReviewQueueSummary(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getReviewQueueSummary).toHaveBeenCalledWith(undefined)
  })
})

describe("useCoachCohorts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch coach cohorts successfully", async () => {
    const mockCohorts = [
      { id: 1, name: "Cohort A", status: "ACTIVE" },
      { id: 2, name: "Cohort B", status: "ACTIVE" },
    ]

    vi.mocked(getCoachCohorts).mockResolvedValue(mockCohorts)

    const { result } = renderHook(() => useCoachCohorts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCohorts)
    expect(getCoachCohorts).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching coach cohorts", async () => {
    const mockError = new Error("Failed to fetch cohorts")
    vi.mocked(getCoachCohorts).mockRejectedValue(mockError)

    const { result } = renderHook(() => useCoachCohorts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})
