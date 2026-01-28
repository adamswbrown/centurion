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

import {
  getAvailableSessions as getAvailableSessionsAction,
  getMyRegistrations as getMyRegistrationsAction,
  registerForSession,
  cancelRegistration,
} from "@/app/actions/session-registration"

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

// Client-facing session hooks

export function useAvailableSessions(params?: {
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ["availableSessions", params],
    queryFn: () => getAvailableSessionsAction(params),
  })
}

export function useMyRegistrations(params?: {
  status?: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "LATE_CANCELLED" | "ATTENDED" | "NO_SHOW"
  upcoming?: boolean
}) {
  return useQuery({
    queryKey: ["myRegistrations", params],
    queryFn: () => getMyRegistrationsAction(params),
  })
}

export function useRegisterForSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: number }) =>
      registerForSession({ sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRegistrations"] })
      queryClient.invalidateQueries({ queryKey: ["availableSessions"] })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useCancelRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ registrationId }: { registrationId: number }) =>
      cancelRegistration({ registrationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRegistrations"] })
      queryClient.invalidateQueries({ queryKey: ["availableSessions"] })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}
