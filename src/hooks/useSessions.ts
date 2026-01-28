"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getSessions,
  getSessionById,
  getCohortSessions,
  createSession,
  updateSession,
  cancelSession,
  generateRecurringSessions,
  syncSessionToGoogleCalendar,
  type CreateSessionInput,
  type UpdateSessionInput,
  type GenerateRecurringSessionsInput,
} from "@/app/actions/sessions"

export function useSessions(params?: {
  coachId?: number
  cohortId?: number
  classTypeId?: number
  status?: string
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ["sessions", params],
    queryFn: () => getSessions(params),
  })
}

export function useSession(id: number) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => getSessionById(id),
    enabled: !!id,
  })
}

export function useCohortSessions(cohortId: number) {
  return useQuery({
    queryKey: ["sessions", "cohort", cohortId],
    queryFn: () => getCohortSessions(cohortId),
    enabled: !!cohortId,
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateSessionInput) => updateSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useCancelSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => cancelSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useGenerateRecurringSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateRecurringSessionsInput) =>
      generateRecurringSessions(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useSyncSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => syncSessionToGoogleCalendar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}
