"use client"

import { useQuery } from "@tanstack/react-query"
import { getMyAppointments } from "@/app/actions/client-appointments"

export function useMyAppointments(params?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["my-appointments", params?.from?.toISOString(), params?.to?.toISOString()],
    queryFn: () => getMyAppointments(params),
  })
}
