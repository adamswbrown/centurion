import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/sessions", () => ({
  getSessions: vi.fn(),
  getSessionById: vi.fn(),
  getCohortSessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  cancelSession: vi.fn(),
  generateRecurringSessions: vi.fn(),
  syncSessionToGoogleCalendar: vi.fn(),
}))

vi.mock("@/app/actions/session-registration", () => ({
  getAvailableSessions: vi.fn(),
  getMyRegistrations: vi.fn(),
  registerForSession: vi.fn(),
  cancelRegistration: vi.fn(),
}))

import {
  getSessions,
  getSessionById,
  getCohortSessions,
  createSession,
  updateSession,
  cancelSession,
  generateRecurringSessions,
  syncSessionToGoogleCalendar,
} from "@/app/actions/sessions"
import {
  useSessions,
  useSession,
  useCohortSessions,
  useCreateSession,
  useUpdateSession,
  useCancelSession,
  useGenerateRecurringSessions,
  useSyncSession,
} from "@/hooks/useSessions"

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

describe("useSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useSessions", () => {
    it("should fetch sessions successfully with params", async () => {
      const mockSessions = [
        { id: 1, title: "Yoga Class", cohortId: 10, startTime: new Date() },
        { id: 2, title: "Pilates Class", cohortId: 10, startTime: new Date() },
      ]
      vi.mocked(getSessions).mockResolvedValue(mockSessions)

      const params = { cohortId: 10, status: "scheduled" }
      const { result } = renderHook(() => useSessions(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getSessions).toHaveBeenCalledWith(params)
      expect(result.current.data).toEqual(mockSessions)
    })

    it("should fetch sessions successfully without params", async () => {
      const mockSessions = [{ id: 1, title: "Yoga Class" }]
      vi.mocked(getSessions).mockResolvedValue(mockSessions)

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getSessions).toHaveBeenCalledWith(undefined)
      expect(result.current.data).toEqual(mockSessions)
    })

    it("should handle error when fetching sessions", async () => {
      const error = new Error("Failed to fetch sessions")
      vi.mocked(getSessions).mockRejectedValue(error)

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useSession", () => {
    it("should fetch session by id successfully", async () => {
      const mockSession = { id: 1, title: "Yoga Class", cohortId: 10 }
      vi.mocked(getSessionById).mockResolvedValue(mockSession)

      const { result } = renderHook(() => useSession(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getSessionById).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockSession)
    })

    it("should handle error when fetching session", async () => {
      const error = new Error("Session not found")
      vi.mocked(getSessionById).mockRejectedValue(error)

      const { result } = renderHook(() => useSession(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })

    it("should not fetch when id is 0", () => {
      const { result } = renderHook(() => useSession(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getSessionById).not.toHaveBeenCalled()
    })
  })

  describe("useCohortSessions", () => {
    it("should fetch cohort sessions successfully", async () => {
      const mockSessions = [
        { id: 1, title: "Cohort Session 1", cohortId: 10 },
        { id: 2, title: "Cohort Session 2", cohortId: 10 },
      ]
      vi.mocked(getCohortSessions).mockResolvedValue(mockSessions)

      const { result } = renderHook(() => useCohortSessions(10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getCohortSessions).toHaveBeenCalledWith(10)
      expect(result.current.data).toEqual(mockSessions)
    })

    it("should handle error when fetching cohort sessions", async () => {
      const error = new Error("Failed to fetch cohort sessions")
      vi.mocked(getCohortSessions).mockRejectedValue(error)

      const { result } = renderHook(() => useCohortSessions(10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })

    it("should not fetch when cohortId is 0", () => {
      const { result } = renderHook(() => useCohortSessions(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getCohortSessions).not.toHaveBeenCalled()
    })
  })

  describe("useCreateSession", () => {
    it("should create session successfully", async () => {
      const mockSession = { id: 1, title: "New Session" }
      vi.mocked(createSession).mockResolvedValue(mockSession)

      const { result } = renderHook(() => useCreateSession(), {
        wrapper: createWrapper(),
      })

      const input = { title: "New Session", cohortId: 10, startTime: new Date() }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(createSession).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockSession)
    })

    it("should handle error when creating session", async () => {
      const error = new Error("Failed to create session")
      vi.mocked(createSession).mockRejectedValue(error)

      const { result } = renderHook(() => useCreateSession(), {
        wrapper: createWrapper(),
      })

      const input = { title: "New Session", cohortId: 10, startTime: new Date() }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useUpdateSession", () => {
    it("should update session successfully", async () => {
      const mockSession = { id: 1, title: "Updated Session" }
      vi.mocked(updateSession).mockResolvedValue(mockSession)

      const { result } = renderHook(() => useUpdateSession(), {
        wrapper: createWrapper(),
      })

      const input = { id: 1, title: "Updated Session" }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(updateSession).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockSession)
    })

    it("should handle error when updating session", async () => {
      const error = new Error("Failed to update session")
      vi.mocked(updateSession).mockRejectedValue(error)

      const { result } = renderHook(() => useUpdateSession(), {
        wrapper: createWrapper(),
      })

      const input = { id: 1, title: "Updated Session" }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useCancelSession", () => {
    it("should cancel session successfully", async () => {
      vi.mocked(cancelSession).mockResolvedValue(undefined)

      const { result } = renderHook(() => useCancelSession(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(cancelSession).toHaveBeenCalledWith(1)
    })

    it("should handle error when canceling session", async () => {
      const error = new Error("Failed to cancel session")
      vi.mocked(cancelSession).mockRejectedValue(error)

      const { result } = renderHook(() => useCancelSession(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useGenerateRecurringSessions", () => {
    it("should generate recurring sessions successfully", async () => {
      const mockSessions = [
        { id: 1, title: "Session 1" },
        { id: 2, title: "Session 2" },
      ]
      vi.mocked(generateRecurringSessions).mockResolvedValue(mockSessions)

      const { result } = renderHook(() => useGenerateRecurringSessions(), {
        wrapper: createWrapper(),
      })

      const input = { cohortId: 10, pattern: "weekly", count: 4 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(generateRecurringSessions).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockSessions)
    })

    it("should handle error when generating recurring sessions", async () => {
      const error = new Error("Failed to generate sessions")
      vi.mocked(generateRecurringSessions).mockRejectedValue(error)

      const { result } = renderHook(() => useGenerateRecurringSessions(), {
        wrapper: createWrapper(),
      })

      const input = { cohortId: 10, pattern: "weekly", count: 4 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useSyncSession", () => {
    it("should sync session to Google Calendar successfully", async () => {
      const mockResult = { success: true, eventId: "google-event-123" }
      vi.mocked(syncSessionToGoogleCalendar).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useSyncSession(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(syncSessionToGoogleCalendar).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockResult)
    })

    it("should handle error when syncing session", async () => {
      const error = new Error("Failed to sync to Google Calendar")
      vi.mocked(syncSessionToGoogleCalendar).mockRejectedValue(error)

      const { result } = renderHook(() => useSyncSession(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })
})
