"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getWeeklySummaries,
  getWeeklyResponse,
  saveWeeklyResponse,
  getReviewQueueSummary,
  getCoachCohorts,
} from "@/app/actions/review-queue"

/**
 * Review Queue Hooks
 * React Query hooks for weekly review management
 * Generated with Claude Code
 */

// Weekly Summaries (client list for a week)
export function useWeeklySummaries(weekStart?: string, cohortId?: number) {
  return useQuery({
    queryKey: ["review-queue", "summaries", weekStart, cohortId],
    queryFn: () => getWeeklySummaries(weekStart, cohortId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Single weekly response for a client
export function useWeeklyResponse(clientId: number, weekStart: string) {
  return useQuery({
    queryKey: ["review-queue", "response", clientId, weekStart],
    queryFn: () => getWeeklyResponse(clientId, weekStart),
    enabled: !!clientId && !!weekStart,
  })
}

// Save weekly response mutation
export function useSaveWeeklyResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      clientId: number
      weekStart: string
      loomUrl?: string | null
      note?: string | null
    }) => saveWeeklyResponse(input),
    onSuccess: (_, variables) => {
      // Invalidate the specific response
      queryClient.invalidateQueries({
        queryKey: ["review-queue", "response", variables.clientId, variables.weekStart],
      })
      // Also invalidate summary to update completion counts
      queryClient.invalidateQueries({
        queryKey: ["review-queue", "summary"],
      })
    },
  })
}

// Review queue summary (counts)
export function useReviewQueueSummary(weekStart?: string) {
  return useQuery({
    queryKey: ["review-queue", "summary", weekStart],
    queryFn: () => getReviewQueueSummary(weekStart),
    staleTime: 1000 * 60 * 2,
  })
}

// Coach's cohorts for filtering
export function useCoachCohorts() {
  return useQuery({
    queryKey: ["coach-cohorts"],
    queryFn: getCoachCohorts,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
