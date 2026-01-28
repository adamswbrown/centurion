"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getClientNotes,
  getClientWeekNotes,
  createCoachNote,
  updateCoachNote,
  deleteCoachNote,
  getCurrentWeekNumber,
} from "@/app/actions/coach-notes"

/**
 * Get all notes for a client
 */
export function useClientNotes(clientId: number) {
  return useQuery({
    queryKey: ["coachNotes", clientId],
    queryFn: () => getClientNotes(clientId),
    enabled: !!clientId,
  })
}

/**
 * Get notes for a specific client and week
 */
export function useClientWeekNotes(clientId: number, weekNumber: number) {
  return useQuery({
    queryKey: ["coachNotes", clientId, weekNumber],
    queryFn: () => getClientWeekNotes(clientId, weekNumber),
    enabled: !!clientId && !!weekNumber,
  })
}

/**
 * Get current week number for a client
 */
export function useCurrentWeekNumber(clientId: number) {
  return useQuery({
    queryKey: ["currentWeek", clientId],
    queryFn: () => getCurrentWeekNumber(clientId),
    enabled: !!clientId,
  })
}

/**
 * Create a new coach note
 */
export function useCreateCoachNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { clientId: number; weekNumber: number; notes: string }) =>
      createCoachNote(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coachNotes", variables.clientId] })
    },
  })
}

/**
 * Update an existing coach note
 */
export function useUpdateCoachNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { noteId: number; notes: string; clientId: number }) =>
      updateCoachNote({ noteId: input.noteId, notes: input.notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coachNotes", variables.clientId] })
    },
  })
}

/**
 * Delete a coach note
 */
export function useDeleteCoachNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { noteId: number; clientId: number }) =>
      deleteCoachNote(input.noteId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coachNotes", variables.clientId] })
    },
  })
}
