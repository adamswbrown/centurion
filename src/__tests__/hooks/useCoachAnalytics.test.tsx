import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/coach-analytics", () => ({
  getCoachInsights: vi.fn(),
  getMemberCheckInData: vi.fn(),
  getCoachCohortMembers: vi.fn(),
  calculateAttentionScore: vi.fn(),
  getCoachMembersOverview: vi.fn(),
}))

import {
  getCoachInsights,
  getMemberCheckInData,
  getCoachCohortMembers,
  calculateAttentionScore,
  getCoachMembersOverview,
} from "@/app/actions/coach-analytics"
import {
  useCoachInsights,
  useMemberCheckInData,
  useCoachCohortMembers,
  useAttentionScore,
  useCoachMembersOverview,
} from "@/hooks/useCoachAnalytics"

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

describe("useCoachInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch coach insights successfully", async () => {
    const mockInsights = {
      totalMembers: 25,
      activeMembers: 20,
      needsAttention: 3,
      recentCheckIns: 15,
    }

    vi.mocked(getCoachInsights).mockResolvedValue(mockInsights)

    const { result } = renderHook(() => useCoachInsights(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockInsights)
    expect(getCoachInsights).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching coach insights", async () => {
    const mockError = new Error("Failed to fetch insights")
    vi.mocked(getCoachInsights).mockRejectedValue(mockError)

    const { result } = renderHook(() => useCoachInsights(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useMemberCheckInData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch member check-in data successfully", async () => {
    const mockData = {
      memberId: 1,
      recentEntries: [],
      lastCheckIn: "2025-01-20",
      streakDays: 7,
    }

    vi.mocked(getMemberCheckInData).mockResolvedValue(mockData)

    const { result } = renderHook(() => useMemberCheckInData(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(getMemberCheckInData).toHaveBeenCalledWith(1)
  })

  it("should handle error when fetching member check-in data", async () => {
    const mockError = new Error("Failed to fetch check-in data")
    vi.mocked(getMemberCheckInData).mockRejectedValue(mockError)

    const { result } = renderHook(() => useMemberCheckInData(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should not fetch when memberId is null", () => {
    const { result } = renderHook(() => useMemberCheckInData(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(getMemberCheckInData).not.toHaveBeenCalled()
  })
})

describe("useCoachCohortMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch coach cohort members successfully", async () => {
    const mockMembers = [
      { id: 1, name: "John Doe", cohortId: 1 },
      { id: 2, name: "Jane Smith", cohortId: 1 },
    ]

    vi.mocked(getCoachCohortMembers).mockResolvedValue(mockMembers)

    const { result } = renderHook(() => useCoachCohortMembers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockMembers)
    expect(getCoachCohortMembers).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching cohort members", async () => {
    const mockError = new Error("Failed to fetch cohort members")
    vi.mocked(getCoachCohortMembers).mockRejectedValue(mockError)

    const { result } = renderHook(() => useCoachCohortMembers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe("useAttentionScore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should calculate attention score successfully", async () => {
    const mockScore = {
      score: 75,
      factors: {
        checkInFrequency: 80,
        questionnaireCompletion: 70,
        engagement: 75,
      },
    }

    vi.mocked(calculateAttentionScore).mockResolvedValue(mockScore)

    const { result } = renderHook(() => useAttentionScore(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockScore)
    expect(calculateAttentionScore).toHaveBeenCalledWith(1)
  })

  it("should handle error when calculating attention score", async () => {
    const mockError = new Error("Failed to calculate score")
    vi.mocked(calculateAttentionScore).mockRejectedValue(mockError)

    const { result } = renderHook(() => useAttentionScore(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should not fetch when memberId is null", () => {
    const { result } = renderHook(() => useAttentionScore(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(calculateAttentionScore).not.toHaveBeenCalled()
  })
})

describe("useCoachMembersOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch coach members overview successfully", async () => {
    const mockOverview = {
      totalMembers: 30,
      activeMembers: 25,
      membersNeedingAttention: [
        { id: 1, name: "John Doe", attentionScore: 45 },
        { id: 2, name: "Jane Smith", attentionScore: 50 },
      ],
      recentActivity: [],
    }

    vi.mocked(getCoachMembersOverview).mockResolvedValue(mockOverview)

    const { result } = renderHook(() => useCoachMembersOverview(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockOverview)
    expect(getCoachMembersOverview).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching members overview", async () => {
    const mockError = new Error("Failed to fetch overview")
    vi.mocked(getCoachMembersOverview).mockRejectedValue(mockError)

    const { result } = renderHook(() => useCoachMembersOverview(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})
