"use client"

import { useQuery } from "@tanstack/react-query"
import { getClientDashboardData } from "@/app/actions/client-dashboard"

export function useClientDashboard() {
  return useQuery({
    queryKey: ["clientDashboard"],
    queryFn: () => getClientDashboardData(),
    staleTime: 30 * 1000, // 30 seconds
  })
}
