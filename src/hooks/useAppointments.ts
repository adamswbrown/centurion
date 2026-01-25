"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  syncAppointmentToGoogleCalendar,
  updateAppointment,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/app/actions/appointments"

export function useAppointments(params?: {
  memberId?: number
  from?: Date
  to?: Date
}) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: () => getAppointments(params),
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAppointmentInput) => updateAppointment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

export function useSyncAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => syncAppointmentToGoogleCalendar(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["appointment", id] })
    },
  })
}
