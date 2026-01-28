"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getCohortSessionAccess,
  setCohortSessionAccess,
  type SetCohortAccessInput,
} from "@/app/actions/cohort-session-access"

export function useCohortSessionAccess(cohortId: number) {
  return useQuery({
    queryKey: ["cohortSessionAccess", cohortId],
    queryFn: () => getCohortSessionAccess(cohortId),
    enabled: !!cohortId,
  })
}

export function useSetCohortSessionAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetCohortAccessInput) => setCohortSessionAccess(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cohortSessionAccess", variables.cohortId],
      })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}
