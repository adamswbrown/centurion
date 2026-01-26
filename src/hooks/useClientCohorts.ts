"use client"

import { useQuery } from "@tanstack/react-query"
import { getMyCohorts } from "@/app/actions/client-cohorts"

export function useMyCohorts() {
  return useQuery({
    queryKey: ["my-cohorts"],
    queryFn: () => getMyCohorts(),
  })
}
