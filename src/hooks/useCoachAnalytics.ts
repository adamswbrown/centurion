import { useQuery } from "@tanstack/react-query"
import {
  getCoachInsights,
  getMemberCheckInData,
  getCoachCohortMembers,
  calculateAttentionScore,
} from "@/app/actions/coach-analytics"

/**
 * React Query hooks for coach analytics
 * Generated with Claude Code
 */

export function useCoachInsights() {
  return useQuery({
    queryKey: ["coach-insights"],
    queryFn: () => getCoachInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

export function useMemberCheckInData(memberId: number | null) {
  return useQuery({
    queryKey: ["member-check-in-data", memberId],
    queryFn: () => memberId ? getMemberCheckInData(memberId) : null,
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCoachCohortMembers() {
  return useQuery({
    queryKey: ["coach-cohort-members"],
    queryFn: () => getCoachCohortMembers(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAttentionScore(memberId: number | null) {
  return useQuery({
    queryKey: ["attention-score", memberId],
    queryFn: () => memberId ? calculateAttentionScore(memberId) : null,
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  })
}
