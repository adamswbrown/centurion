import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/session-registration", () => ({
  registerForSession: vi.fn(),
  cancelRegistration: vi.fn(),
  getMyRegistrations: vi.fn(),
  getSessionUsage: vi.fn(),
  markAttendance: vi.fn(),
  getSessionRegistrations: vi.fn(),
}))

import {
  registerForSession,
  cancelRegistration,
  getMyRegistrations,
  getSessionUsage,
  markAttendance,
  getSessionRegistrations,
} from "@/app/actions/session-registration"
import {
  useMyRegistrations,
  useSessionUsage,
  useSessionRegistrations,
  useRegisterForSession,
  useCancelRegistration,
  useMarkAttendance,
} from "@/hooks/useSessionRegistration"

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

describe("useSessionRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useMyRegistrations", () => {
    it("should fetch my registrations successfully with params", async () => {
      const mockRegistrations = [
        { id: 1, sessionId: 10, userId: 1, status: "REGISTERED" },
        { id: 2, sessionId: 11, userId: 1, status: "REGISTERED" },
      ]
      vi.mocked(getMyRegistrations).mockResolvedValue(mockRegistrations)

      const params = { status: "REGISTERED" as const, upcoming: true }
      const { result } = renderHook(() => useMyRegistrations(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getMyRegistrations).toHaveBeenCalledWith(params)
      expect(result.current.data).toEqual(mockRegistrations)
    })

    it("should fetch my registrations successfully without params", async () => {
      const mockRegistrations = [
        { id: 1, sessionId: 10, userId: 1, status: "REGISTERED" },
      ]
      vi.mocked(getMyRegistrations).mockResolvedValue(mockRegistrations)

      const { result } = renderHook(() => useMyRegistrations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getMyRegistrations).toHaveBeenCalledWith(undefined)
      expect(result.current.data).toEqual(mockRegistrations)
    })

    it("should handle error when fetching my registrations", async () => {
      const error = new Error("Failed to fetch registrations")
      vi.mocked(getMyRegistrations).mockRejectedValue(error)

      const { result } = renderHook(() => useMyRegistrations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useSessionUsage", () => {
    it("should fetch session usage successfully with userId", async () => {
      const mockUsage = {
        used: 5,
        remaining: 10,
        total: 15,
        expiresAt: new Date(),
      }
      vi.mocked(getSessionUsage).mockResolvedValue(mockUsage)

      const { result } = renderHook(() => useSessionUsage(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getSessionUsage).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockUsage)
    })

    it("should fetch session usage successfully without userId", async () => {
      const mockUsage = { used: 3, remaining: 7, total: 10 }
      vi.mocked(getSessionUsage).mockResolvedValue(mockUsage)

      const { result } = renderHook(() => useSessionUsage(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getSessionUsage).toHaveBeenCalledWith(undefined)
      expect(result.current.data).toEqual(mockUsage)
    })

    it("should handle error when fetching session usage", async () => {
      const error = new Error("Failed to fetch session usage")
      vi.mocked(getSessionUsage).mockRejectedValue(error)

      const { result } = renderHook(() => useSessionUsage(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useSessionRegistrations", () => {
    it("should fetch session registrations successfully", async () => {
      const mockRegistrations = [
        { id: 1, sessionId: 10, userId: 1, status: "REGISTERED" },
        { id: 2, sessionId: 10, userId: 2, status: "REGISTERED" },
      ]
      vi.mocked(getSessionRegistrations).mockResolvedValue(mockRegistrations)

      const { result } = renderHook(() => useSessionRegistrations(10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getSessionRegistrations).toHaveBeenCalledWith(10)
      expect(result.current.data).toEqual(mockRegistrations)
    })

    it("should handle error when fetching session registrations", async () => {
      const error = new Error("Failed to fetch session registrations")
      vi.mocked(getSessionRegistrations).mockRejectedValue(error)

      const { result } = renderHook(() => useSessionRegistrations(10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })

    it("should not fetch when sessionId is 0", () => {
      const { result } = renderHook(() => useSessionRegistrations(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getSessionRegistrations).not.toHaveBeenCalled()
    })
  })

  describe("useRegisterForSession", () => {
    it("should register for session successfully", async () => {
      const mockRegistration = {
        id: 1,
        sessionId: 10,
        userId: 1,
        status: "REGISTERED",
      }
      vi.mocked(registerForSession).mockResolvedValue(mockRegistration)

      const { result } = renderHook(() => useRegisterForSession(), {
        wrapper: createWrapper(),
      })

      const input = { sessionId: 10 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(registerForSession).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockRegistration)
    })

    it("should handle error when registering for session", async () => {
      const error = new Error("Session is full")
      vi.mocked(registerForSession).mockRejectedValue(error)

      const { result } = renderHook(() => useRegisterForSession(), {
        wrapper: createWrapper(),
      })

      const input = { sessionId: 10 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useCancelRegistration", () => {
    it("should cancel registration successfully", async () => {
      vi.mocked(cancelRegistration).mockResolvedValue(undefined)

      const { result } = renderHook(() => useCancelRegistration(), {
        wrapper: createWrapper(),
      })

      const input = { registrationId: 1 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(cancelRegistration).toHaveBeenCalledWith(input)
    })

    it("should handle error when canceling registration", async () => {
      const error = new Error("Cancellation deadline passed")
      vi.mocked(cancelRegistration).mockRejectedValue(error)

      const { result } = renderHook(() => useCancelRegistration(), {
        wrapper: createWrapper(),
      })

      const input = { registrationId: 1 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useMarkAttendance", () => {
    it("should mark attendance successfully", async () => {
      const mockResult = {
        id: 1,
        sessionId: 10,
        userId: 1,
        attended: true,
      }
      vi.mocked(markAttendance).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useMarkAttendance(), {
        wrapper: createWrapper(),
      })

      const input = { registrationId: 1, attended: true }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markAttendance).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockResult)
    })

    it("should handle error when marking attendance", async () => {
      const error = new Error("Failed to mark attendance")
      vi.mocked(markAttendance).mockRejectedValue(error)

      const { result } = renderHook(() => useMarkAttendance(), {
        wrapper: createWrapper(),
      })

      const input = { registrationId: 1, attended: true }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })
})
