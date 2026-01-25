import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CohortStatus, MembershipStatus } from "@prisma/client"
import {
  getCohorts,
  getCohortById,
  createCohort,
  updateCohort,
  updateCohortStatus,
  deleteCohort,
  addMemberToCohort,
  removeMemberFromCohort,
  updateMembershipStatus,
  addCoachToCohort,
  removeCoachFromCohort,
  getAllCoaches,
  type CreateCohortInput,
  type UpdateCohortInput,
} from "@/app/actions/cohorts"

export function useCohorts(params?: { status?: CohortStatus }) {
  return useQuery({
    queryKey: ["cohorts", params],
    queryFn: () => getCohorts(params),
  })
}

export function useCohort(id: number) {
  return useQuery({
    queryKey: ["cohort", id],
    queryFn: () => getCohortById(id),
    enabled: !!id,
  })
}

export function useAllCoaches() {
  return useQuery({
    queryKey: ["all-coaches"],
    queryFn: () => getAllCoaches(),
  })
}

export function useCreateCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCohortInput) => createCohort(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
    },
  })
}

export function useUpdateCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCohortInput) => updateCohort(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", data.id] })
    },
  })
}

export function useUpdateCohortStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: CohortStatus }) =>
      updateCohortStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", data.id] })
    },
  })
}

export function useDeleteCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCohort(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
    },
  })
}

export function useAddMemberToCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cohortId, userId }: { cohortId: number; userId: number }) =>
      addMemberToCohort(cohortId, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", data.cohortId] })
    },
  })
}

export function useRemoveMemberFromCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cohortId, userId }: { cohortId: number; userId: number }) =>
      removeMemberFromCohort(cohortId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", variables.cohortId] })
    },
  })
}

export function useUpdateMembershipStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cohortId,
      userId,
      status,
    }: {
      cohortId: number
      userId: number
      status: MembershipStatus
    }) => updateMembershipStatus(cohortId, userId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", data.cohortId] })
    },
  })
}

export function useAddCoachToCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cohortId, coachId }: { cohortId: number; coachId: number }) =>
      addCoachToCohort(cohortId, coachId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", data.cohortId] })
    },
  })
}

export function useRemoveCoachFromCohort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cohortId, coachId }: { cohortId: number; coachId: number }) =>
      removeCoachFromCohort(cohortId, coachId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] })
      queryClient.invalidateQueries({ queryKey: ["cohort", variables.cohortId] })
    },
  })
}
