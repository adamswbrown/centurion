import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/client-dashboard", () => ({
  getClientDashboardData: vi.fn(),
}))

import { getClientDashboardData } from "@/app/actions/client-dashboard"
import { useClientDashboard } from "@/hooks/useClientDashboard"

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

describe("useClientDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch client dashboard data successfully", async () => {
    const mockDashboardData = {
      user: { id: 1, name: "Test User" },
      memberships: [],
      hasActiveCohort: false,
      recentEntries: [],
      stats: {
        currentStreak: 5,
        totalEntries: 30,
        lastCheckIn: new Date(),
        latestWeight: 150,
        avgSteps7d: 8000,
        entriesLast7Days: 7,
      },
      todayEntry: null,
      hasTodayEntry: false,
      questionnaireStatus: [],
      showQuestionnairePrompt: false,
      checkInOverdue: false,
      nextExpectedCheckIn: null,
      showWrapped: false,
    }

    vi.mocked(getClientDashboardData).mockResolvedValue(mockDashboardData)

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockDashboardData)
    expect(getClientDashboardData).toHaveBeenCalledTimes(1)
  })

  it("should handle error when fetching dashboard data", async () => {
    const mockError = new Error("Failed to fetch dashboard data")
    vi.mocked(getClientDashboardData).mockRejectedValue(mockError)

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it("should return data with active cohort membership", async () => {
    const mockDashboardData = {
      user: { id: 1, name: "Test User" },
      memberships: [
        {
          id: 1,
          joinedAt: new Date(),
          status: "ACTIVE",
          cohort: {
            id: 1,
            name: "Weight Loss Cohort",
            type: "WEIGHT_LOSS",
            startDate: new Date(),
            endDate: new Date(),
            checkInFrequencyDays: 1,
            coaches: [{ id: 2, name: "Coach", email: "coach@test.com", image: null }],
          },
        },
      ],
      hasActiveCohort: true,
      recentEntries: [],
      stats: {
        currentStreak: 3,
        totalEntries: 10,
        lastCheckIn: new Date(),
        latestWeight: 155,
        avgSteps7d: 7500,
        entriesLast7Days: 5,
      },
      todayEntry: null,
      hasTodayEntry: false,
      questionnaireStatus: [],
      showQuestionnairePrompt: false,
      checkInOverdue: false,
      nextExpectedCheckIn: null,
      showWrapped: false,
    }

    vi.mocked(getClientDashboardData).mockResolvedValue(mockDashboardData)

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.hasActiveCohort).toBe(true)
    expect(result.current.data?.memberships).toHaveLength(1)
    expect(result.current.data?.memberships[0].cohort.name).toBe("Weight Loss Cohort")
  })

  it("should return questionnaire status data", async () => {
    const mockDashboardData = {
      user: { id: 1, name: "Test User" },
      memberships: [],
      hasActiveCohort: true,
      recentEntries: [],
      stats: {
        currentStreak: 0,
        totalEntries: 0,
        lastCheckIn: null,
        latestWeight: null,
        avgSteps7d: null,
        entriesLast7Days: 0,
      },
      todayEntry: null,
      hasTodayEntry: false,
      questionnaireStatus: [
        {
          cohortId: 1,
          cohortName: "Test Cohort",
          currentWeek: 2,
          status: "NOT_STARTED" as const,
          bundleId: 1,
        },
      ],
      showQuestionnairePrompt: true,
      checkInOverdue: false,
      nextExpectedCheckIn: null,
      showWrapped: false,
    }

    vi.mocked(getClientDashboardData).mockResolvedValue(mockDashboardData)

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.questionnaireStatus).toHaveLength(1)
    expect(result.current.data?.questionnaireStatus[0].status).toBe("NOT_STARTED")
    expect(result.current.data?.showQuestionnairePrompt).toBe(true)
  })

  it("should return showWrapped true when cohort is complete", async () => {
    const mockDashboardData = {
      user: { id: 1, name: "Test User" },
      memberships: [],
      hasActiveCohort: false,
      recentEntries: [],
      stats: {
        currentStreak: 42,
        totalEntries: 42,
        lastCheckIn: new Date(),
        latestWeight: 145,
        avgSteps7d: 10000,
        entriesLast7Days: 7,
      },
      todayEntry: null,
      hasTodayEntry: false,
      questionnaireStatus: [],
      showQuestionnairePrompt: false,
      checkInOverdue: false,
      nextExpectedCheckIn: null,
      showWrapped: true, // Cohort completed
    }

    vi.mocked(getClientDashboardData).mockResolvedValue(mockDashboardData)

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.showWrapped).toBe(true)
  })

  it("should return check-in overdue status", async () => {
    const mockDashboardData = {
      user: { id: 1, name: "Test User" },
      memberships: [],
      hasActiveCohort: true,
      recentEntries: [],
      stats: {
        currentStreak: 0,
        totalEntries: 5,
        lastCheckIn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        latestWeight: 150,
        avgSteps7d: 5000,
        entriesLast7Days: 2,
      },
      todayEntry: null,
      hasTodayEntry: false,
      questionnaireStatus: [],
      showQuestionnairePrompt: false,
      checkInOverdue: true,
      nextExpectedCheckIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      showWrapped: false,
    }

    vi.mocked(getClientDashboardData).mockResolvedValue(mockDashboardData)

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.checkInOverdue).toBe(true)
  })

  it("should return loading state initially", () => {
    vi.mocked(getClientDashboardData).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useClientDashboard(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})
