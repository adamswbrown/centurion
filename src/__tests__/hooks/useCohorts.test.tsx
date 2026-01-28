/**
 * useCohorts Hook Tests
 *
 * Tests for the cohorts-related React Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Mock the server actions
vi.mock("@/app/actions/cohorts", () => ({
  getCohorts: vi.fn(),
  getCohortById: vi.fn(),
  createCohort: vi.fn(),
  updateCohort: vi.fn(),
  updateCohortStatus: vi.fn(),
  deleteCohort: vi.fn(),
  addMemberToCohort: vi.fn(),
  removeMemberFromCohort: vi.fn(),
  updateMembershipStatus: vi.fn(),
  addCoachToCohort: vi.fn(),
  removeCoachFromCohort: vi.fn(),
  getAllCoaches: vi.fn(),
}))

import {
  getCohorts,
  getCohortById,
  createCohort,
  updateCohort,
  updateCohortStatus,
  deleteCohort,
  addMemberToCohort,
  removeMemberFromCohort,
  updateMembershipStatus,
  addCoachToCohort,
  removeCoachFromCohort,
  getAllCoaches,
} from "@/app/actions/cohorts"

import {
  useCohorts,
  useCohort,
  useAllCoaches,
  useCreateCohort,
  useUpdateCohort,
  useUpdateCohortStatus,
  useDeleteCohort,
  useAddMemberToCohort,
  useRemoveMemberFromCohort,
  useUpdateMembershipStatus,
  useAddCoachToCohort,
  useRemoveCoachFromCohort,
} from "@/hooks/useCohorts"

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

describe("useCohorts Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useCohorts", () => {
    it("should fetch cohorts successfully", async () => {
      const mockCohorts = [
        {
          id: 1,
          name: "Cohort 1",
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(),
        },
        {
          id: 2,
          name: "Cohort 2",
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(),
        },
      ]

      vi.mocked(getCohorts).mockResolvedValue(mockCohorts as any)

      const { result } = renderHook(() => useCohorts(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCohorts)
      expect(getCohorts).toHaveBeenCalledWith(undefined)
    })

    it("should pass params to getCohorts", async () => {
      const params = { status: "ACTIVE" as const }
      vi.mocked(getCohorts).mockResolvedValue([])

      const { result } = renderHook(() => useCohorts(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getCohorts).toHaveBeenCalledWith(params)
    })

    it("should handle errors", async () => {
      vi.mocked(getCohorts).mockRejectedValue(new Error("Failed to fetch"))

      const { result } = renderHook(() => useCohorts(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useCohort", () => {
    it("should fetch cohort by id successfully", async () => {
      const mockCohort = {
        id: 1,
        name: "Cohort 1",
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(),
      }

      vi.mocked(getCohortById).mockResolvedValue(mockCohort as any)

      const { result } = renderHook(() => useCohort(1), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCohort)
      expect(getCohortById).toHaveBeenCalledWith(1)
    })

    it("should be disabled when id is 0", async () => {
      vi.mocked(getCohortById).mockResolvedValue({} as any)

      const { result } = renderHook(() => useCohort(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(getCohortById).not.toHaveBeenCalled()
    })

    it("should handle errors", async () => {
      vi.mocked(getCohortById).mockRejectedValue(new Error("Cohort not found"))

      const { result } = renderHook(() => useCohort(999), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useAllCoaches", () => {
    it("should fetch all coaches successfully", async () => {
      const mockCoaches = [
        { id: 1, name: "Coach 1", email: "coach1@example.com" },
        { id: 2, name: "Coach 2", email: "coach2@example.com" },
      ]

      vi.mocked(getAllCoaches).mockResolvedValue(mockCoaches as any)

      const { result } = renderHook(() => useAllCoaches(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCoaches)
      expect(getAllCoaches).toHaveBeenCalled()
    })

    it("should handle errors", async () => {
      vi.mocked(getAllCoaches).mockRejectedValue(new Error("Failed to fetch"))

      const { result } = renderHook(() => useAllCoaches(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe("useCreateCohort", () => {
    it("should create cohort successfully", async () => {
      const newCohort = {
        id: 1,
        name: "New Cohort",
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(),
      }

      vi.mocked(createCohort).mockResolvedValue(newCohort as any)

      const { result } = renderHook(() => useCreateCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: "New Cohort",
        startDate: new Date(),
        endDate: new Date(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(createCohort).toHaveBeenCalled()
      expect(result.current.data).toEqual(newCohort)
    })

    it("should handle creation errors", async () => {
      vi.mocked(createCohort).mockRejectedValue(new Error("Invalid input"))

      const { result } = renderHook(() => useCreateCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: "New Cohort",
        startDate: new Date(),
        endDate: new Date(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useUpdateCohort", () => {
    it("should update cohort successfully", async () => {
      const updatedCohort = {
        id: 1,
        name: "Updated Cohort",
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(),
      }

      vi.mocked(updateCohort).mockResolvedValue(updatedCohort as any)

      const { result } = renderHook(() => useUpdateCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 1,
        name: "Updated Cohort",
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(updateCohort).toHaveBeenCalled()
      expect(result.current.data).toEqual(updatedCohort)
    })

    it("should handle update errors", async () => {
      vi.mocked(updateCohort).mockRejectedValue(new Error("Cohort not found"))

      const { result } = renderHook(() => useUpdateCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 999,
        name: "Updated Cohort",
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useUpdateCohortStatus", () => {
    it("should update cohort status successfully", async () => {
      const updatedCohort = {
        id: 1,
        name: "Cohort",
        status: "COMPLETED",
        startDate: new Date(),
        endDate: new Date(),
      }

      vi.mocked(updateCohortStatus).mockResolvedValue(updatedCohort as any)

      const { result } = renderHook(() => useUpdateCohortStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 1,
        status: "COMPLETED" as const,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(updateCohortStatus).toHaveBeenCalledWith(1, "COMPLETED")
      expect(result.current.data).toEqual(updatedCohort)
    })

    it("should handle status update errors", async () => {
      vi.mocked(updateCohortStatus).mockRejectedValue(
        new Error("Invalid status")
      )

      const { result } = renderHook(() => useUpdateCohortStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 999,
        status: "COMPLETED" as const,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useDeleteCohort", () => {
    it("should delete cohort successfully", async () => {
      vi.mocked(deleteCohort).mockResolvedValue({ success: true } as any)

      const { result } = renderHook(() => useDeleteCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(deleteCohort).toHaveBeenCalledWith(1)
    })

    it("should handle deletion errors", async () => {
      vi.mocked(deleteCohort).mockRejectedValue(new Error("Cohort not found"))

      const { result } = renderHook(() => useDeleteCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(999)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useAddMemberToCohort", () => {
    it("should add member to cohort successfully", async () => {
      const membership = {
        id: 1,
        cohortId: 1,
        userId: 10,
        status: "ACTIVE",
      }

      vi.mocked(addMemberToCohort).mockResolvedValue(membership as any)

      const { result } = renderHook(() => useAddMemberToCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        userId: 10,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(addMemberToCohort).toHaveBeenCalledWith(1, 10)
      expect(result.current.data).toEqual(membership)
    })

    it("should handle add member errors", async () => {
      vi.mocked(addMemberToCohort).mockRejectedValue(
        new Error("Member already in cohort")
      )

      const { result } = renderHook(() => useAddMemberToCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        userId: 10,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useRemoveMemberFromCohort", () => {
    it("should remove member from cohort successfully", async () => {
      vi.mocked(removeMemberFromCohort).mockResolvedValue({
        success: true,
      } as any)

      const { result } = renderHook(() => useRemoveMemberFromCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        userId: 10,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(removeMemberFromCohort).toHaveBeenCalledWith(1, 10)
    })

    it("should handle remove member errors", async () => {
      vi.mocked(removeMemberFromCohort).mockRejectedValue(
        new Error("Member not found")
      )

      const { result } = renderHook(() => useRemoveMemberFromCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        userId: 999,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useUpdateMembershipStatus", () => {
    it("should update membership status successfully", async () => {
      const membership = {
        id: 1,
        cohortId: 1,
        userId: 10,
        status: "PAUSED",
      }

      vi.mocked(updateMembershipStatus).mockResolvedValue(membership as any)

      const { result } = renderHook(() => useUpdateMembershipStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        userId: 10,
        status: "PAUSED" as const,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(updateMembershipStatus).toHaveBeenCalledWith(1, 10, "PAUSED")
      expect(result.current.data).toEqual(membership)
    })

    it("should handle status update errors", async () => {
      vi.mocked(updateMembershipStatus).mockRejectedValue(
        new Error("Invalid status")
      )

      const { result } = renderHook(() => useUpdateMembershipStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        userId: 10,
        status: "PAUSED" as const,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useAddCoachToCohort", () => {
    it("should add coach to cohort successfully", async () => {
      const coachCohort = {
        id: 1,
        cohortId: 1,
        coachId: 5,
      }

      vi.mocked(addCoachToCohort).mockResolvedValue(coachCohort as any)

      const { result } = renderHook(() => useAddCoachToCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        coachId: 5,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(addCoachToCohort).toHaveBeenCalledWith(1, 5)
      expect(result.current.data).toEqual(coachCohort)
    })

    it("should handle add coach errors", async () => {
      vi.mocked(addCoachToCohort).mockRejectedValue(
        new Error("Coach already assigned")
      )

      const { result } = renderHook(() => useAddCoachToCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        coachId: 5,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("useRemoveCoachFromCohort", () => {
    it("should remove coach from cohort successfully", async () => {
      vi.mocked(removeCoachFromCohort).mockResolvedValue({
        success: true,
      } as any)

      const { result } = renderHook(() => useRemoveCoachFromCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        coachId: 5,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(removeCoachFromCohort).toHaveBeenCalledWith(1, 5)
    })

    it("should handle remove coach errors", async () => {
      vi.mocked(removeCoachFromCohort).mockRejectedValue(
        new Error("Coach not found")
      )

      const { result } = renderHook(() => useRemoveCoachFromCohort(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        cohortId: 1,
        coachId: 999,
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe("Query Invalidation", () => {
    it("useCreateCohort should invalidate cohorts query on success", async () => {
      vi.mocked(getCohorts).mockResolvedValue([])
      vi.mocked(createCohort).mockResolvedValue({
        id: 1,
        name: "New Cohort",
      } as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreateCohort(), { wrapper })

      result.current.mutate({
        name: "New Cohort",
        startDate: new Date(),
        endDate: new Date(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["cohorts"],
      })
    })

    it("useUpdateCohort should invalidate both cohorts and cohort queries on success", async () => {
      const updatedCohort = { id: 1, name: "Updated" }
      vi.mocked(updateCohort).mockResolvedValue(updatedCohort as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useUpdateCohort(), { wrapper })

      result.current.mutate({
        id: 1,
        name: "Updated",
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["cohorts"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["cohort", 1],
      })
    })

    it("useDeleteCohort should invalidate cohorts query on success", async () => {
      vi.mocked(deleteCohort).mockResolvedValue({ success: true } as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useDeleteCohort(), { wrapper })

      result.current.mutate(1)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["cohorts"],
      })
    })

    it("useAddMemberToCohort should invalidate both cohorts and cohort queries on success", async () => {
      const membership = { id: 1, cohortId: 1, userId: 10 }
      vi.mocked(addMemberToCohort).mockResolvedValue(membership as any)

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useAddMemberToCohort(), { wrapper })

      result.current.mutate({
        cohortId: 1,
        userId: 10,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["cohorts"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["cohort", 1],
      })
    })
  })
})
