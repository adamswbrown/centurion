"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getQuestionnaireBundle,
  getQuestionnaireBundles,
  createQuestionnaireBundle,
  updateQuestionnaireBundle,
  getQuestionnaireResponse,
  upsertQuestionnaireResponse,
  getWeeklyResponses,
  type CreateBundleInput,
  type UpsertResponseInput,
} from "@/app/actions/questionnaires"

export function useQuestionnaireBundle(cohortId: number, weekNumber: number) {
  return useQuery({
    queryKey: ["questionnaireBundle", cohortId, weekNumber],
    queryFn: () => getQuestionnaireBundle(cohortId, weekNumber),
    enabled: !!cohortId && !!weekNumber,
  })
}

export function useQuestionnaireBundles(cohortId: number) {
  return useQuery({
    queryKey: ["questionnaireBundles", cohortId],
    queryFn: () => getQuestionnaireBundles(cohortId),
    enabled: !!cohortId,
  })
}

export function useQuestionnaireResponse(cohortId: number, weekNumber: number) {
  return useQuery({
    queryKey: ["questionnaireResponse", cohortId, weekNumber],
    queryFn: () => getQuestionnaireResponse(cohortId, weekNumber),
    enabled: !!cohortId && !!weekNumber,
  })
}

export function useWeeklyResponses(cohortId: number, weekNumber: number) {
  return useQuery({
    queryKey: ["weeklyResponses", cohortId, weekNumber],
    queryFn: () => getWeeklyResponses(cohortId, weekNumber),
    enabled: !!cohortId && !!weekNumber,
  })
}

export function useCreateQuestionnaireBundle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBundleInput) => createQuestionnaireBundle(input),
    onSuccess: (_result, { cohortId }) => {
      queryClient.invalidateQueries({
        queryKey: ["questionnaireBundles", cohortId],
      })
    },
  })
}

export function useUpdateQuestionnaireBundle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cohortId,
      weekNumber,
      questions,
    }: {
      cohortId: number
      weekNumber: number
      questions: any
    }) => updateQuestionnaireBundle(cohortId, weekNumber, questions),
    onSuccess: (_result, { cohortId, weekNumber }) => {
      queryClient.invalidateQueries({
        queryKey: ["questionnaireBundle", cohortId, weekNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ["questionnaireBundles", cohortId],
      })
    },
  })
}

export function useUpsertQuestionnaireResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertResponseInput) =>
      upsertQuestionnaireResponse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaireResponse"] })
      queryClient.invalidateQueries({ queryKey: ["weeklyResponses"] })
    },
  })
}

// Hook for all questionnaires (used by coach dashboard)
export function useQuestionnaires() {
  return useQuery({
    queryKey: ["questionnaires"],
    queryFn: async () => {
      const { getAllQuestionnaires } = await import("@/app/actions/questionnaires")
      return getAllQuestionnaires()
    },
  })
}
