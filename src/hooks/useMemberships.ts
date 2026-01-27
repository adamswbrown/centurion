"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MembershipPlanType } from "@prisma/client"

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
  type CreateMembershipPlanInput,
  type UpdateMembershipPlanInput,
  type AssignMembershipInput,
} from "@/app/actions/memberships"

import { createMembershipCheckoutSession } from "@/app/actions/stripe-billing"

// ---------------------------------------------------------------------------
// Plan queries
// ---------------------------------------------------------------------------

export function useMembershipPlans(params?: {
  type?: MembershipPlanType
  activeOnly?: boolean
}) {
  return useQuery({
    queryKey: ["membershipPlans", params],
    queryFn: () => getMembershipPlans(params),
  })
}

export function useMembershipPlan(id: number) {
  return useQuery({
    queryKey: ["membershipPlan", id],
    queryFn: () => getMembershipPlanById(id),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// User membership queries
// ---------------------------------------------------------------------------

export function useUserActiveMembership(userId: number) {
  return useQuery({
    queryKey: ["userMembership", userId],
    queryFn: () => getUserActiveMembership(userId),
    enabled: !!userId,
  })
}

export function useUserMembershipHistory(userId: number) {
  return useQuery({
    queryKey: ["userMembershipHistory", userId],
    queryFn: () => getUserMembershipHistory(userId),
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// Plan mutations (admin)
// ---------------------------------------------------------------------------

export function useCreateMembershipPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateMembershipPlanInput) =>
      createMembershipPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membershipPlans"] })
    },
  })
}

export function useUpdateMembershipPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateMembershipPlanInput) =>
      updateMembershipPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membershipPlans"] })
      queryClient.invalidateQueries({ queryKey: ["membershipPlan"] })
    },
  })
}

export function useDeactivateMembershipPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deactivateMembershipPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membershipPlans"] })
    },
  })
}

// ---------------------------------------------------------------------------
// User membership mutations (admin)
// ---------------------------------------------------------------------------

export function useAssignMembership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AssignMembershipInput) => assignMembership(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMembership"] })
      queryClient.invalidateQueries({ queryKey: ["userMembershipHistory"] })
      queryClient.invalidateQueries({ queryKey: ["membershipPlans"] })
    },
  })
}

export function usePauseMembership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => pauseMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMembership"] })
      queryClient.invalidateQueries({ queryKey: ["userMembershipHistory"] })
    },
  })
}

export function useResumeMembership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => resumeMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMembership"] })
      queryClient.invalidateQueries({ queryKey: ["userMembershipHistory"] })
    },
  })
}

export function useCancelMembership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => cancelMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMembership"] })
      queryClient.invalidateQueries({ queryKey: ["userMembershipHistory"] })
    },
  })
}

// ---------------------------------------------------------------------------
// Stripe checkout (client)
// ---------------------------------------------------------------------------

export function useCheckoutMembership() {
  return useMutation({
    mutationFn: (planId: number) => createMembershipCheckoutSession(planId),
  })
}
