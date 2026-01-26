"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getEntries,
  getEntryByDate,
  upsertEntry,
  getCheckInConfig,
  updateCheckInConfig,
  getCheckInStats,
  type UpsertEntryInput,
} from "@/app/actions/entries"

export type { UpsertEntryInput }

export function useEntries(params?: {
  userId?: number
  from?: Date
  to?: Date
  limit?: number
}) {
  return useQuery({
    queryKey: ["entries", params],
    queryFn: () => getEntries(params),
  })
}

export function useEntry(date: Date, userId?: number) {
  return useQuery({
    queryKey: ["entry", date.toISOString(), userId],
    queryFn: () => getEntryByDate(date, userId),
  })
}

export function useCheckInConfig(cohortId?: number) {
  return useQuery({
    queryKey: ["checkInConfig", cohortId],
    queryFn: () => getCheckInConfig(cohortId),
  })
}

export function useCheckInStats(userId?: number) {
  return useQuery({
    queryKey: ["checkInStats", userId],
    queryFn: () => getCheckInStats(userId),
  })
}

export function useUpsertEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertEntryInput) => upsertEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] })
      queryClient.invalidateQueries({ queryKey: ["entry"] })
      queryClient.invalidateQueries({ queryKey: ["checkInStats"] })
    },
  })
}

export function useUpdateCheckInConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cohortId, prompts }: { cohortId: number; prompts: any }) =>
      updateCheckInConfig(cohortId, prompts),
    onSuccess: (_result, { cohortId }) => {
      queryClient.invalidateQueries({ queryKey: ["checkInConfig", cohortId] })
    },
  })
}
