"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getClassTypes,
  getClassTypeById,
  createClassType,
  updateClassType,
  deleteClassType,
} from "@/app/actions/class-types"

// Types defined locally since "use server" files can only export async functions
type CreateClassTypeInput = {
  name: string
  description?: string
  color?: string
  defaultCapacity: number
  defaultDurationMins: number
}

type UpdateClassTypeInput = {
  id: number
  name: string
  description?: string
  color?: string
  defaultCapacity: number
  defaultDurationMins: number
  isActive: boolean
}

export function useClassTypes(params?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["classTypes", params],
    queryFn: () => getClassTypes(params),
  })
}

export function useClassType(id: number) {
  return useQuery({
    queryKey: ["classType", id],
    queryFn: () => getClassTypeById(id),
    enabled: !!id,
  })
}

export function useCreateClassType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateClassTypeInput) => createClassType(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classTypes"] })
    },
  })
}

export function useUpdateClassType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateClassTypeInput) => updateClassType(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classTypes"] })
    },
  })
}

export function useDeleteClassType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteClassType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classTypes"] })
    },
  })
}
