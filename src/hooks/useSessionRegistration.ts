"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RegistrationStatus } from "@prisma/client"

import {
  registerForSession,
  cancelRegistration,
  getMyRegistrations,
  getSessionUsage,
  markAttendance,
  getSessionRegistrations,
  type RegisterInput,
  type CancelRegistrationInput,
  type MarkAttendanceInput,
} from "@/app/actions/session-registration"

export function useMyRegistrations(params?: {
  status?: RegistrationStatus
  upcoming?: boolean
}) {
  return useQuery({
    queryKey: ["myRegistrations", params],
    queryFn: () => getMyRegistrations(params),
  })
}

export function useSessionUsage(userId?: number) {
  return useQuery({
    queryKey: ["sessionUsage", userId],
    queryFn: () => getSessionUsage(userId),
  })
}

export function useSessionRegistrations(sessionId: number) {
  return useQuery({
    queryKey: ["sessionRegistrations", sessionId],
    queryFn: () => getSessionRegistrations(sessionId),
    enabled: !!sessionId,
  })
}

export function useRegisterForSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RegisterInput) => registerForSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRegistrations"] })
      queryClient.invalidateQueries({ queryKey: ["sessionUsage"] })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      queryClient.invalidateQueries({ queryKey: ["sessionRegistrations"] })
    },
  })
}

export function useCancelRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CancelRegistrationInput) => cancelRegistration(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRegistrations"] })
      queryClient.invalidateQueries({ queryKey: ["sessionUsage"] })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      queryClient.invalidateQueries({ queryKey: ["sessionRegistrations"] })
    },
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: MarkAttendanceInput) => markAttendance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessionRegistrations"] })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}
