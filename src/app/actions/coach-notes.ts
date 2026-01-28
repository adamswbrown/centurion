"use server"

import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"

/**
 * Coach Notes Server Actions
 * Private notes that coaches can write about their clients
 * Generated with Claude Code
 */

// ==========================================
// SCHEMAS
// ==========================================

const createNoteSchema = z.object({
  clientId: z.number().int().positive(),
  weekNumber: z.number().int().min(1),
  notes: z.string().min(1, "Note cannot be empty").max(5000),
})

const updateNoteSchema = z.object({
  noteId: z.number().int().positive(),
  notes: z.string().min(1, "Note cannot be empty").max(5000),
})

// ==========================================
// GET NOTES
// ==========================================

export interface CoachNoteData {
  id: number
  weekNumber: number
  notes: string
  createdAt: Date
  updatedAt: Date
  coach: {
    id: number
    name: string | null
    email: string
  }
}

/**
 * Get all coach notes for a specific client
 */
export async function getClientNotes(clientId: number): Promise<CoachNoteData[]> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  // Verify coach has access to this client through cohort membership
  const hasAccess = await prisma.coachCohortMembership.findFirst({
    where: {
      coachId,
      cohort: {
        members: {
          some: {
            userId: clientId,
            status: "ACTIVE",
          },
        },
      },
    },
  })

  // Allow admins to view all notes regardless of cohort membership
  if (!hasAccess && user.role !== "ADMIN") {
    throw new Error("Forbidden: You don't have access to this client's notes")
  }

  const notes = await prisma.coachNote.findMany({
    where: { userId: clientId },
    orderBy: [{ weekNumber: "desc" }, { createdAt: "desc" }],
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return notes.map((note) => ({
    id: note.id,
    weekNumber: note.weekNumber,
    notes: note.notes,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    coach: note.coach,
  }))
}

/**
 * Get notes for a specific client and week
 */
export async function getClientWeekNotes(
  clientId: number,
  weekNumber: number
): Promise<CoachNoteData[]> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const notes = await prisma.coachNote.findMany({
    where: {
      userId: clientId,
      weekNumber,
    },
    orderBy: { createdAt: "desc" },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return notes.map((note) => ({
    id: note.id,
    weekNumber: note.weekNumber,
    notes: note.notes,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    coach: note.coach,
  }))
}

// ==========================================
// CREATE NOTE
// ==========================================

/**
 * Create a new coach note for a client
 */
export async function createCoachNote(input: {
  clientId: number
  weekNumber: number
  notes: string
}): Promise<{ success: boolean; note?: CoachNoteData; error?: string }> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const result = createNoteSchema.safeParse(input)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { clientId, weekNumber, notes } = result.data

  // Verify coach has access to this client
  const hasAccess = await prisma.coachCohortMembership.findFirst({
    where: {
      coachId,
      cohort: {
        members: {
          some: {
            userId: clientId,
            status: "ACTIVE",
          },
        },
      },
    },
  })

  if (!hasAccess && user.role !== "ADMIN") {
    return { success: false, error: "You don't have access to this client" }
  }

  const note = await prisma.coachNote.create({
    data: {
      userId: clientId,
      coachId,
      weekNumber,
      notes,
    },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  revalidatePath(`/members/${clientId}`)

  return {
    success: true,
    note: {
      id: note.id,
      weekNumber: note.weekNumber,
      notes: note.notes,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      coach: note.coach,
    },
  }
}

// ==========================================
// UPDATE NOTE
// ==========================================

/**
 * Update an existing coach note
 * Only the note author can update their own notes
 */
export async function updateCoachNote(input: {
  noteId: number
  notes: string
}): Promise<{ success: boolean; note?: CoachNoteData; error?: string }> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  const result = updateNoteSchema.safeParse(input)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { noteId, notes } = result.data

  // Fetch the note to verify ownership
  const existingNote = await prisma.coachNote.findUnique({
    where: { id: noteId },
    select: { coachId: true, userId: true },
  })

  if (!existingNote) {
    return { success: false, error: "Note not found" }
  }

  // Only the author can update their own notes (or admin)
  if (existingNote.coachId !== coachId && user.role !== "ADMIN") {
    return { success: false, error: "You can only edit your own notes" }
  }

  const note = await prisma.coachNote.update({
    where: { id: noteId },
    data: { notes },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  revalidatePath(`/members/${existingNote.userId}`)

  return {
    success: true,
    note: {
      id: note.id,
      weekNumber: note.weekNumber,
      notes: note.notes,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      coach: note.coach,
    },
  }
}

// ==========================================
// DELETE NOTE
// ==========================================

/**
 * Delete a coach note
 * Only the note author can delete their own notes
 */
export async function deleteCoachNote(
  noteId: number
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCoach()
  const coachId = Number(user.id)

  // Fetch the note to verify ownership
  const existingNote = await prisma.coachNote.findUnique({
    where: { id: noteId },
    select: { coachId: true, userId: true },
  })

  if (!existingNote) {
    return { success: false, error: "Note not found" }
  }

  // Only the author can delete their own notes (or admin)
  if (existingNote.coachId !== coachId && user.role !== "ADMIN") {
    return { success: false, error: "You can only delete your own notes" }
  }

  await prisma.coachNote.delete({
    where: { id: noteId },
  })

  revalidatePath(`/members/${existingNote.userId}`)

  return { success: true }
}

// ==========================================
// HELPER: GET CURRENT WEEK NUMBER
// ==========================================

/**
 * Calculate the current week number based on a cohort start date
 */
export async function getCurrentWeekNumber(clientId: number): Promise<number> {
  await requireCoach()

  // Get the client's first active cohort membership
  const membership = await prisma.cohortMembership.findFirst({
    where: {
      userId: clientId,
      status: "ACTIVE",
    },
    select: {
      cohort: {
        select: {
          startDate: true,
        },
      },
    },
  })

  if (!membership?.cohort?.startDate) {
    // If no cohort, use the beginning of the year
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weeksSinceStart = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    return weeksSinceStart + 1
  }

  const cohortStart = new Date(membership.cohort.startDate)
  const now = new Date()
  const weeksSinceStart = Math.floor(
    (now.getTime() - cohortStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  return Math.max(1, weeksSinceStart + 1)
}
