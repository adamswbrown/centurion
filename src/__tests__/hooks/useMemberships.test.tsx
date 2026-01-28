import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

vi.mock("@/app/actions/memberships", () => ({
  getMembershipPlans: vi.fn(),
  getMembershipPlanById: vi.fn(),
  createMembershipPlan: vi.fn(),
  updateMembershipPlan: vi.fn(),
  deactivateMembershipPlan: vi.fn(),
  assignMembership: vi.fn(),
  getUserActiveMembership: vi.fn(),
  getUserMembershipHistory: vi.fn(),
  pauseMembership: vi.fn(),
  resumeMembership: vi.fn(),
  cancelMembership: vi.fn(),
}))

vi.mock("@/app/actions/stripe-billing", () => ({
  createMembershipCheckoutSession: vi.fn(),
}))

import {
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deactivateMembershipPlan,
  assignMembership,
  getUserActiveMembership,
  getUserMembershipHistory,
  pauseMembership,
  resumeMembership,
  cancelMembership,
} from "@/app/actions/memberships"
import { createMembershipCheckoutSession } from "@/app/actions/stripe-billing"
import {
  useMembershipPlans,
  useMembershipPlan,
  useUserActiveMembership,
  useUserMembershipHistory,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeactivateMembershipPlan,
  useAssignMembership,
  usePauseMembership,
  useResumeMembership,
  useCancelMembership,
  useCheckoutMembership,
} from "@/hooks/useMemberships"

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

describe("useMemberships", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useMembershipPlans", () => {
    it("should fetch membership plans successfully with params", async () => {
      const mockPlans = [
        { id: 1, name: "Basic Plan", type: "MONTHLY", price: 50 },
        { id: 2, name: "Premium Plan", type: "MONTHLY", price: 100 },
      ]
      vi.mocked(getMembershipPlans).mockResolvedValue(mockPlans)

      const params = { type: "MONTHLY" as const, activeOnly: true }
      const { result } = renderHook(() => useMembershipPlans(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getMembershipPlans).toHaveBeenCalledWith(params)
      expect(result.current.data).toEqual(mockPlans)
    })

    it("should fetch membership plans successfully without params", async () => {
      const mockPlans = [{ id: 1, name: "Basic Plan" }]
      vi.mocked(getMembershipPlans).mockResolvedValue(mockPlans)

      const { result } = renderHook(() => useMembershipPlans(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getMembershipPlans).toHaveBeenCalledWith(undefined)
      expect(result.current.data).toEqual(mockPlans)
    })

    it("should handle error when fetching membership plans", async () => {
      const error = new Error("Failed to fetch plans")
      vi.mocked(getMembershipPlans).mockRejectedValue(error)

      const { result } = renderHook(() => useMembershipPlans(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useMembershipPlan", () => {
    it("should fetch membership plan by id successfully", async () => {
      const mockPlan = { id: 1, name: "Basic Plan", price: 50 }
      vi.mocked(getMembershipPlanById).mockResolvedValue(mockPlan)

      const { result } = renderHook(() => useMembershipPlan(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getMembershipPlanById).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockPlan)
    })

    it("should handle error when fetching membership plan", async () => {
      const error = new Error("Plan not found")
      vi.mocked(getMembershipPlanById).mockRejectedValue(error)

      const { result } = renderHook(() => useMembershipPlan(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })

    it("should not fetch when id is 0", () => {
      const { result } = renderHook(() => useMembershipPlan(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getMembershipPlanById).not.toHaveBeenCalled()
    })
  })

  describe("useUserActiveMembership", () => {
    it("should fetch user active membership successfully", async () => {
      const mockMembership = {
        id: 1,
        userId: 1,
        planId: 1,
        status: "ACTIVE",
        startDate: new Date(),
      }
      vi.mocked(getUserActiveMembership).mockResolvedValue(mockMembership)

      const { result } = renderHook(() => useUserActiveMembership(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getUserActiveMembership).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockMembership)
    })

    it("should handle error when fetching user active membership", async () => {
      const error = new Error("Failed to fetch membership")
      vi.mocked(getUserActiveMembership).mockRejectedValue(error)

      const { result } = renderHook(() => useUserActiveMembership(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })

    it("should not fetch when userId is 0", () => {
      const { result } = renderHook(() => useUserActiveMembership(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getUserActiveMembership).not.toHaveBeenCalled()
    })
  })

  describe("useUserMembershipHistory", () => {
    it("should fetch user membership history successfully", async () => {
      const mockHistory = [
        { id: 1, userId: 1, planId: 1, status: "COMPLETED" },
        { id: 2, userId: 1, planId: 2, status: "ACTIVE" },
      ]
      vi.mocked(getUserMembershipHistory).mockResolvedValue(mockHistory)

      const { result } = renderHook(() => useUserMembershipHistory(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getUserMembershipHistory).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockHistory)
    })

    it("should handle error when fetching user membership history", async () => {
      const error = new Error("Failed to fetch history")
      vi.mocked(getUserMembershipHistory).mockRejectedValue(error)

      const { result } = renderHook(() => useUserMembershipHistory(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })

    it("should not fetch when userId is 0", () => {
      const { result } = renderHook(() => useUserMembershipHistory(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(getUserMembershipHistory).not.toHaveBeenCalled()
    })
  })

  describe("useCreateMembershipPlan", () => {
    it("should create membership plan successfully", async () => {
      const mockPlan = { id: 1, name: "New Plan", price: 75 }
      vi.mocked(createMembershipPlan).mockResolvedValue(mockPlan)

      const { result } = renderHook(() => useCreateMembershipPlan(), {
        wrapper: createWrapper(),
      })

      const input = { name: "New Plan", price: 75, type: "MONTHLY" }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(createMembershipPlan).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockPlan)
    })

    it("should handle error when creating membership plan", async () => {
      const error = new Error("Failed to create plan")
      vi.mocked(createMembershipPlan).mockRejectedValue(error)

      const { result } = renderHook(() => useCreateMembershipPlan(), {
        wrapper: createWrapper(),
      })

      const input = { name: "New Plan", price: 75, type: "MONTHLY" }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useUpdateMembershipPlan", () => {
    it("should update membership plan successfully", async () => {
      const mockPlan = { id: 1, name: "Updated Plan", price: 80 }
      vi.mocked(updateMembershipPlan).mockResolvedValue(mockPlan)

      const { result } = renderHook(() => useUpdateMembershipPlan(), {
        wrapper: createWrapper(),
      })

      const input = { id: 1, name: "Updated Plan", price: 80 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(updateMembershipPlan).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockPlan)
    })

    it("should handle error when updating membership plan", async () => {
      const error = new Error("Failed to update plan")
      vi.mocked(updateMembershipPlan).mockRejectedValue(error)

      const { result } = renderHook(() => useUpdateMembershipPlan(), {
        wrapper: createWrapper(),
      })

      const input = { id: 1, name: "Updated Plan", price: 80 }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useDeactivateMembershipPlan", () => {
    it("should deactivate membership plan successfully", async () => {
      vi.mocked(deactivateMembershipPlan).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeactivateMembershipPlan(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(deactivateMembershipPlan).toHaveBeenCalledWith(1)
    })

    it("should handle error when deactivating membership plan", async () => {
      const error = new Error("Failed to deactivate plan")
      vi.mocked(deactivateMembershipPlan).mockRejectedValue(error)

      const { result } = renderHook(() => useDeactivateMembershipPlan(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useAssignMembership", () => {
    it("should assign membership successfully", async () => {
      const mockMembership = { id: 1, userId: 1, planId: 1, status: "ACTIVE" }
      vi.mocked(assignMembership).mockResolvedValue(mockMembership)

      const { result } = renderHook(() => useAssignMembership(), {
        wrapper: createWrapper(),
      })

      const input = { userId: 1, planId: 1, startDate: new Date() }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(assignMembership).toHaveBeenCalledWith(input)
      expect(result.current.data).toEqual(mockMembership)
    })

    it("should handle error when assigning membership", async () => {
      const error = new Error("User already has active membership")
      vi.mocked(assignMembership).mockRejectedValue(error)

      const { result } = renderHook(() => useAssignMembership(), {
        wrapper: createWrapper(),
      })

      const input = { userId: 1, planId: 1, startDate: new Date() }
      result.current.mutate(input)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("usePauseMembership", () => {
    it("should pause membership successfully", async () => {
      const mockMembership = { id: 1, status: "PAUSED" }
      vi.mocked(pauseMembership).mockResolvedValue(mockMembership)

      const { result } = renderHook(() => usePauseMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(pauseMembership).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockMembership)
    })

    it("should handle error when pausing membership", async () => {
      const error = new Error("Failed to pause membership")
      vi.mocked(pauseMembership).mockRejectedValue(error)

      const { result } = renderHook(() => usePauseMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useResumeMembership", () => {
    it("should resume membership successfully", async () => {
      const mockMembership = { id: 1, status: "ACTIVE" }
      vi.mocked(resumeMembership).mockResolvedValue(mockMembership)

      const { result } = renderHook(() => useResumeMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(resumeMembership).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockMembership)
    })

    it("should handle error when resuming membership", async () => {
      const error = new Error("Failed to resume membership")
      vi.mocked(resumeMembership).mockRejectedValue(error)

      const { result } = renderHook(() => useResumeMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useCancelMembership", () => {
    it("should cancel membership successfully", async () => {
      const mockMembership = { id: 1, status: "CANCELLED" }
      vi.mocked(cancelMembership).mockResolvedValue(mockMembership)

      const { result } = renderHook(() => useCancelMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(cancelMembership).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockMembership)
    })

    it("should handle error when canceling membership", async () => {
      const error = new Error("Failed to cancel membership")
      vi.mocked(cancelMembership).mockRejectedValue(error)

      const { result } = renderHook(() => useCancelMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })

  describe("useCheckoutMembership", () => {
    it("should create checkout session successfully", async () => {
      const mockSession = { url: "https://checkout.stripe.com/session-123" }
      vi.mocked(createMembershipCheckoutSession).mockResolvedValue(mockSession)

      const { result } = renderHook(() => useCheckoutMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(createMembershipCheckoutSession).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(mockSession)
    })

    it("should handle error when creating checkout session", async () => {
      const error = new Error("Failed to create checkout session")
      vi.mocked(createMembershipCheckoutSession).mockRejectedValue(error)

      const { result } = renderHook(() => useCheckoutMembership(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toEqual(error)
    })
  })
})
