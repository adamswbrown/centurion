import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Mock the server actions
vi.mock("@/app/actions/entries", () => ({
  getEntries: vi.fn(),
  getEntryByDate: vi.fn(),
  upsertEntry: vi.fn(),
  deleteEntry: vi.fn(),
  getCheckInConfig: vi.fn(),
  updateCheckInConfig: vi.fn(),
  getCheckInStats: vi.fn(),
  getHealthKitPreview: vi.fn(),
}))

import {
  getEntries,
  getEntryByDate,
  upsertEntry,
  deleteEntry,
  getCheckInConfig,
  updateCheckInConfig,
  getCheckInStats,
  getHealthKitPreview,
} from "@/app/actions/entries"
import {
  useEntries,
  useEntry,
  useUpsertEntry,
  useDeleteEntry,
  useCheckInConfig,
  useCheckInStats,
  useUpdateCheckInConfig,
  useHealthKitPreview,
} from "@/hooks/useEntries"

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

describe("useEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useEntries", () => {
    it("fetches entries successfully and returns data", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          userId: "user-1",
          date: new Date("2025-01-28"),
          mood: 5,
          energy: 4,
          sleep: 8,
          notes: "Feeling great",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "entry-2",
          userId: "user-1",
          date: new Date("2025-01-27"),
          mood: 4,
          energy: 3,
          sleep: 7,
          notes: "Good day",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(getEntries).mockResolvedValue(mockEntries)

      const { result } = renderHook(() => useEntries(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockEntries)
      expect(getEntries).toHaveBeenCalledWith(undefined)
    })

    it("passes params to getEntries", async () => {
      const mockParams = {
        userId: "user-1",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-31"),
      }

      vi.mocked(getEntries).mockResolvedValue([])

      const { result } = renderHook(() => useEntries(mockParams), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getEntries).toHaveBeenCalledWith(mockParams)
    })
  })

  describe("useEntry", () => {
    it("fetches entry by date successfully", async () => {
      const mockDate = new Date("2025-01-28")
      const mockEntry = {
        id: "entry-1",
        userId: "user-1",
        date: mockDate,
        mood: 5,
        energy: 4,
        sleep: 8,
        notes: "Feeling great",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getEntryByDate).mockResolvedValue(mockEntry)

      const { result } = renderHook(() => useEntry(mockDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockEntry)
      expect(getEntryByDate).toHaveBeenCalledWith(mockDate, undefined)
    })

    it("passes userId to getEntryByDate", async () => {
      const mockDate = new Date("2025-01-28")
      const mockUserId = "user-123"

      vi.mocked(getEntryByDate).mockResolvedValue(null)

      const { result } = renderHook(() => useEntry(mockDate, mockUserId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getEntryByDate).toHaveBeenCalledWith(mockDate, mockUserId)
    })
  })

  describe("useCheckInConfig", () => {
    it("fetches check-in config by cohortId", async () => {
      const mockConfig = {
        id: "config-1",
        cohortId: "cohort-1",
        prompts: {
          mood: "How are you feeling?",
          energy: "Energy level?",
          sleep: "Hours slept?",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getCheckInConfig).mockResolvedValue(mockConfig)

      const { result } = renderHook(() => useCheckInConfig("cohort-1"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockConfig)
      expect(getCheckInConfig).toHaveBeenCalledWith("cohort-1")
    })

    it("calls getCheckInConfig without cohortId when not provided", async () => {
      vi.mocked(getCheckInConfig).mockResolvedValue(null)

      const { result } = renderHook(() => useCheckInConfig(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getCheckInConfig).toHaveBeenCalledWith(undefined)
    })
  })

  describe("useCheckInStats", () => {
    it("fetches check-in stats successfully", async () => {
      const mockStats = {
        totalEntries: 15,
        currentStreak: 5,
        longestStreak: 10,
        averageMood: 4.2,
        averageEnergy: 3.8,
        averageSleep: 7.5,
      }

      vi.mocked(getCheckInStats).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useCheckInStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockStats)
      expect(getCheckInStats).toHaveBeenCalledWith(undefined)
    })

    it("passes userId to getCheckInStats", async () => {
      const mockUserId = "user-123"

      vi.mocked(getCheckInStats).mockResolvedValue(null)

      const { result } = renderHook(() => useCheckInStats(mockUserId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getCheckInStats).toHaveBeenCalledWith(mockUserId)
    })
  })

  describe("useUpsertEntry", () => {
    it("calls upsertEntry mutationFn", async () => {
      const mockInput = {
        date: new Date("2025-01-28"),
        mood: 5,
        energy: 4,
        sleep: 8,
        notes: "Great day",
      }

      const mockResult = {
        id: "entry-1",
        userId: "user-1",
        ...mockInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(upsertEntry).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useUpsertEntry(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(mockInput)

      expect(upsertEntry).toHaveBeenCalledWith(mockInput)
    })

    it("handles upsert mutation error", async () => {
      const mockError = new Error("Failed to upsert entry")
      vi.mocked(upsertEntry).mockRejectedValue(mockError)

      const { result } = renderHook(() => useUpsertEntry(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.mutateAsync({
        date: new Date(),
        mood: 5,
      })).rejects.toThrow("Failed to upsert entry")
    })
  })

  describe("useDeleteEntry", () => {
    it("calls deleteEntry mutationFn", async () => {
      const mockEntryId = "entry-123"

      vi.mocked(deleteEntry).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useDeleteEntry(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(mockEntryId)

      expect(deleteEntry).toHaveBeenCalledWith(mockEntryId)
    })

    it("handles delete mutation error", async () => {
      const mockError = new Error("Failed to delete entry")
      vi.mocked(deleteEntry).mockRejectedValue(mockError)

      const { result } = renderHook(() => useDeleteEntry(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.mutateAsync("entry-123")).rejects.toThrow(
        "Failed to delete entry"
      )
    })
  })

  describe("useUpdateCheckInConfig", () => {
    it("calls updateCheckInConfig mutationFn", async () => {
      const mockCohortId = "cohort-123"
      const mockPrompts = {
        mood: "How do you feel?",
        energy: "Energy level?",
        sleep: "Sleep quality?",
      }

      const mockResult = {
        id: "config-1",
        cohortId: mockCohortId,
        prompts: mockPrompts,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(updateCheckInConfig).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useUpdateCheckInConfig(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        cohortId: mockCohortId,
        prompts: mockPrompts,
      })

      expect(updateCheckInConfig).toHaveBeenCalledWith(mockCohortId, mockPrompts)
    })

    it("handles update config mutation error", async () => {
      const mockError = new Error("Failed to update config")
      vi.mocked(updateCheckInConfig).mockRejectedValue(mockError)

      const { result } = renderHook(() => useUpdateCheckInConfig(), {
        wrapper: createWrapper(),
      })

      await expect(
        result.current.mutateAsync({
          cohortId: "cohort-123",
          prompts: {},
        })
      ).rejects.toThrow("Failed to update config")
    })
  })

  describe("useHealthKitPreview", () => {
    it("fetches HealthKit preview when dateString is provided", async () => {
      const mockDateString = "2025-01-28"
      const mockPreview = {
        workouts: [
          {
            id: "workout-1",
            type: "Running",
            duration: 30,
            calories: 250,
          },
        ],
        sleep: {
          duration: 8,
          quality: "good",
        },
        steps: 10000,
      }

      vi.mocked(getHealthKitPreview).mockResolvedValue(mockPreview)

      const { result } = renderHook(() => useHealthKitPreview(mockDateString), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockPreview)
      expect(getHealthKitPreview).toHaveBeenCalledWith(mockDateString)
    })

    it("is disabled when dateString is empty", async () => {
      const { result } = renderHook(() => useHealthKitPreview(""), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getHealthKitPreview).not.toHaveBeenCalled()
    })

    it("is disabled when dateString is undefined", async () => {
      const { result } = renderHook(() => useHealthKitPreview(undefined as any), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getHealthKitPreview).not.toHaveBeenCalled()
    })
  })
})
