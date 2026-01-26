/**
 * useAppointments Hook Tests
 *
 * Tests for the appointments-related React Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Mock the server actions
vi.mock("@/app/actions/appointments", () => ({
  getAppointments: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
  syncAppointmentToGoogleCalendar: vi.fn(),
}))

import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  syncAppointmentToGoogleCalendar,
} from "@/app/actions/appointments"

import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useSyncAppointment,
} from "@/hooks/useAppointments"

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Wrapper component for providing React Query context
function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useAppointments Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useAppointments", () => {
    it("should fetch appointments successfully", async () => {
      const mockAppointments = [
        { id: 1, startTime: new Date(), endTime: new Date() },
        { id: 2, startTime: new Date(), endTime: new Date() },
      ]

      vi.mocked(getAppointments).mockResolvedValue(mockAppointments as any)

      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAppointments)
      expect(getAppointments).toHaveBeenCalledWith(undefined)
    })

    it("should pass params to getAppointments", async () => {
      const params = { memberId: 10 }
      vi.mocked(getAppointments).mockResolvedValue([])

      const { result } = renderHook(() => useAppointments(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getAppointments).toHaveBeenCalledWith(params)
    })

    it("should pass date range params", async () => {
      const from = new Date("2024-01-01")
      const to = new Date("2024-01-31")
      const params = { from, to }

      vi.mocked(getAppointments).mockResolvedValue([])

      const { result } = renderHook(() => useAppointments(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getAppointments).toHaveBeenCalledWith(params)
    })

    it("should handle errors", async () => {
      vi.mocked(getAppointments).mockRejectedValue(new Error("Failed to fetch"))

      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useCreateAppointment", () => {
    it("should create appointment successfully", async () => {
      const newAppointment = {
        id: 1,
        startTime: new Date(),
        endTime: new Date(),
      }

      vi.mocked(createAppointment).mockResolvedValue({
        appointments: [newAppointment as any],
        syncStatus: { success: true },
      })

      const { result } = renderHook(() => useCreateAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        memberId: 10,
        date: "2024-02-01",
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(createAppointment).toHaveBeenCalled()
    })

    it("should handle creation errors", async () => {
      vi.mocked(createAppointment).mockRejectedValue(new Error("Conflict"))

      const { result } = renderHook(() => useCreateAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        memberId: 10,
        date: "2024-02-01",
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useUpdateAppointment", () => {
    it("should update appointment successfully", async () => {
      const updatedAppointment = {
        id: 1,
        startTime: new Date(),
        endTime: new Date(),
      }

      vi.mocked(updateAppointment).mockResolvedValue({
        appointment: updatedAppointment as any,
        syncStatus: { success: true },
      })

      const { result } = renderHook(() => useUpdateAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 1,
        startTime: "10:00",
        endTime: "11:00",
        fee: 75,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(updateAppointment).toHaveBeenCalled()
    })

    it("should handle update errors", async () => {
      vi.mocked(updateAppointment).mockRejectedValue(
        new Error("Appointment not found")
      )

      const { result } = renderHook(() => useUpdateAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 999,
        startTime: "10:00",
        endTime: "11:00",
        fee: 75,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useDeleteAppointment", () => {
    it("should delete appointment successfully", async () => {
      vi.mocked(deleteAppointment).mockResolvedValue({
        success: true,
        syncStatus: { success: true },
      })

      const { result } = renderHook(() => useDeleteAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(deleteAppointment).toHaveBeenCalledWith(1)
    })

    it("should handle deletion errors", async () => {
      vi.mocked(deleteAppointment).mockRejectedValue(
        new Error("Appointment not found")
      )

      const { result } = renderHook(() => useDeleteAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(999)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useSyncAppointment", () => {
    it("should sync appointment to Google Calendar", async () => {
      vi.mocked(syncAppointmentToGoogleCalendar).mockResolvedValue({
        success: true,
        message: "Synced to Google Calendar",
      })

      const { result } = renderHook(() => useSyncAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(syncAppointmentToGoogleCalendar).toHaveBeenCalledWith(1)
    })

    it("should handle sync errors", async () => {
      vi.mocked(syncAppointmentToGoogleCalendar).mockResolvedValue({
        success: false,
        message: "Google Calendar sync failed",
      })

      const { result } = renderHook(() => useSyncAppointment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.success).toBe(false)
    })
  })

  describe("Query Invalidation", () => {
    it("useCreateAppointment should invalidate appointments query on success", async () => {
      vi.mocked(getAppointments).mockResolvedValue([])
      vi.mocked(createAppointment).mockResolvedValue({
        appointments: [],
        syncStatus: { success: true },
      })

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreateAppointment(), { wrapper })

      result.current.mutate({
        memberId: 10,
        date: "2024-02-01",
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["appointments"],
      })
    })
  })
})
