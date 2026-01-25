"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addBootcampAttendee,
  createBootcamp,
  deleteBootcamp,
  getBootcampById,
  getBootcamps,
  removeBootcampAttendee,
  updateBootcamp,
} from "@/app/actions/bootcamps"

export function useBootcamps() {
  return useQuery({
    queryKey: ["bootcamps"],
    queryFn: () => getBootcamps(),
  })
}

export function useBootcamp(id?: number) {
  return useQuery({
    queryKey: ["bootcamp", id],
    queryFn: () => (id ? getBootcampById(id) : null),
    enabled: Boolean(id),
  })
}

export function useCreateBootcamp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBootcamp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootcamps"] }),
  })
}

export function useUpdateBootcamp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBootcamp,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bootcamps"] })
      queryClient.invalidateQueries({ queryKey: ["bootcamp", variables.id] })
    },
  })
}

export function useDeleteBootcamp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBootcamp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootcamps"] }),
  })
}

export function useAddBootcampAttendee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addBootcampAttendee,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bootcamp", variables.bootcampId] })
      queryClient.invalidateQueries({ queryKey: ["bootcamps"] })
    },
  })
}

export function useRemoveBootcampAttendee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeBootcampAttendee,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bootcamp", variables.bootcampId] })
      queryClient.invalidateQueries({ queryKey: ["bootcamps"] })
    },
  })
}
