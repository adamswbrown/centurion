"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMyAppointments,
  getMyAppointmentById,
  cancelMyAppointment,
} from "@/app/actions/client-appointments"

export function useMyAppointments(params?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["my-appointments", params?.from?.toISOString(), params?.to?.toISOString()],
    queryFn: () => getMyAppointments(params),
  })
}

export function useMyAppointment(id: number) {
  return useQuery({
    queryKey: ["my-appointment", id],
    queryFn: () => getMyAppointmentById(id),
    enabled: !!id,
  })
}

export function useCancelMyAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => cancelMyAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] })
      queryClient.invalidateQueries({ queryKey: ["my-appointment"] })
    },
  })
}
