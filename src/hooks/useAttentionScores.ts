"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getAttentionQueue,
  getClientAttention,
  getAttentionQueueByCohort,
  refreshClientAttention,
  getAdherenceSettings,
  updateAdherenceSettings,
} from "@/app/actions/attention-scores"

/**
 * Get the full attention queue for all clients
 */
export function useAttentionQueue(options?: { forceRefresh?: boolean }) {
  return useQuery({
    queryKey: ["attentionQueue", options?.forceRefresh],
    queryFn: () => getAttentionQueue(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Get attention score for a specific client
 */
export function useClientAttention(userId: number) {
  return useQuery({
    queryKey: ["clientAttention", userId],
    queryFn: () => getClientAttention(userId),
    enabled: !!userId,
  })
}

/**
 * Get attention scores filtered by cohort
 */
export function useAttentionQueueByCohort(cohortId: number) {
  return useQuery({
    queryKey: ["attentionQueue", "cohort", cohortId],
    queryFn: () => getAttentionQueueByCohort(cohortId),
    enabled: !!cohortId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Mutation to refresh attention scores for specific clients
 */
export function useRefreshAttention() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clientIds: number[]) => refreshClientAttention(clientIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attentionQueue"] })
      queryClient.invalidateQueries({ queryKey: ["clientAttention"] })
    },
  })
}

/**
 * Mutation to recalculate all attention scores
 */
export function useRecalculateAttention() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => getAttentionQueue({ forceRefresh: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attentionQueue"] })
      queryClient.invalidateQueries({ queryKey: ["clientAttention"] })
    },
  })
}

/**
 * Get system-wide adherence settings
 */
export function useAdherenceSettings() {
  return useQuery({
    queryKey: ["adherenceSettings"],
    queryFn: () => getAdherenceSettings(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

/**
 * Mutation to update adherence settings
 */
export function useUpdateAdherenceSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Parameters<typeof updateAdherenceSettings>[0]) =>
      updateAdherenceSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adherenceSettings"] })
      queryClient.invalidateQueries({ queryKey: ["attentionQueue"] })
    },
  })
}
