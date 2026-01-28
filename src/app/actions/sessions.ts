"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { addWeeks, setDay, parseISO, set } from "date-fns"
import {
  addEventToGoogleCalendar,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  type CalendarEvent,
} from "@/lib/google-calendar"

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSessionSchema = z.object({
  classTypeId: z.number().int().positive().optional(),
  title: z.string().min(1, "Title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  maxOccupancy: z.number().int().min(1, "Must allow at least 1 participant"),
  location: z.string().optional(),
  notes: z.string().optional(),
})

const updateSessionSchema = z.object({
  id: z.number().int().positive(),
  classTypeId: z.number().int().positive().optional().nullable(),
  title: z.string().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  maxOccupancy: z.number().int().min(1).optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const generateRecurringSchema = z.object({
  classTypeId: z.number().int().positive().optional(),
  title: z.string().min(1),
  startTime: z.string().min(1), // HH:mm format
  endTime: z.string().min(1), // HH:mm format
  maxOccupancy: z.number().int().min(1),
  location: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6), // 0=Sun, 6=Sat
  weeks: z.number().int().min(1).max(52),
  startDate: z.string().min(1), // ISO date string
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type GenerateRecurringSessionsInput = z.infer<typeof generateRecurringSchema>

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSessions(params?: {
  coachId?: number
  cohortId?: number // for access filtering only
  classTypeId?: number
  status?: string
  startDate?: string
  endDate?: string
}) {
  await requireCoach()

  const where: Record<string, unknown> = {}

  if (params?.coachId) {
    where.coachId = params.coachId
  }
  // If cohortId is provided, filter sessions by classTypeIds accessible to that cohort
  let classTypeIds: number[] | undefined
  if (params?.cohortId) {
    const access = await prisma.cohortSessionAccess.findMany({
      where: { cohortId: params.cohortId },
      select: { classTypeId: true },
    })
    classTypeIds = access.map((a) => a.classTypeId)
    if (classTypeIds.length === 0) {
      // No access, return empty
      return []
    }
    where.classTypeId = { in: classTypeIds }
  }
  if (params?.classTypeId) {
    where.classTypeId = params.classTypeId
  }
  if (params?.status) {
    where.status = params.status
  }
  if (params?.startDate || params?.endDate) {
    where.startTime = {
      ...(params?.startDate ? { gte: new Date(params.startDate) } : {}),
      ...(params?.endDate ? { lte: new Date(params.endDate) } : {}),
    }
  }

  return prisma.classSession.findMany({
    where,
    include: {
      classType: true,
      coach: { select: { id: true, name: true, email: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { startTime: "desc" },
  })
}

export async function getSessionById(id: number) {
  await requireCoach()

  return prisma.classSession.findUniqueOrThrow({
    where: { id },
    include: {
      classType: true,
      coach: { select: { id: true, name: true, email: true } },
      registrations: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })
}

export async function getCohortSessions(cohortId: number) {
  await requireCoach()

  // Find all classTypeIds accessible to this cohort
  const access = await prisma.cohortSessionAccess.findMany({
    where: { cohortId },
    select: { classTypeId: true },
  })
  const classTypeIds = access.map((a) => a.classTypeId)
  if (classTypeIds.length === 0) {
    return []
  }
  return prisma.classSession.findMany({
    where: { classTypeId: { in: classTypeIds } },
    include: {
      classType: true,
      coach: { select: { id: true, name: true, email: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { startTime: "desc" },
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createSession(input: CreateSessionInput) {
  const user = await requireCoach()
  const parsed = createSessionSchema.parse(input)

  const coachId = Number.parseInt(user.id, 10)

  const session = await prisma.classSession.create({
    data: {
      classTypeId: parsed.classTypeId,
      coachId,
      title: parsed.title,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      maxOccupancy: parsed.maxOccupancy,
      location: parsed.location,
      notes: parsed.notes,
    },
  })

  revalidatePath("/sessions")

  return session
}

export async function updateSession(input: UpdateSessionInput) {
  const user = await requireCoach()
  const { id, ...data } = updateSessionSchema.parse(input)

  const userId = Number.parseInt(user.id, 10)
  const existing = await prisma.classSession.findUnique({ where: { id } })
  if (!existing) throw new Error("Session not found")
  if (user.role !== "ADMIN" && existing.coachId !== userId) {
    throw new Error("Not authorized to update this session")
  }

  const updateData: Record<string, unknown> = {}

  if (data.classTypeId !== undefined) updateData.classTypeId = data.classTypeId
  if (data.title !== undefined) updateData.title = data.title
  if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime)
  if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime)
  if (data.maxOccupancy !== undefined) updateData.maxOccupancy = data.maxOccupancy
  if (data.location !== undefined) updateData.location = data.location
  if (data.notes !== undefined) updateData.notes = data.notes

  const session = await prisma.classSession.update({
    where: { id },
    data: updateData,
  })

  revalidatePath("/sessions")

  return session
}

export async function cancelSession(id: number) {
  const user = await requireCoach()
  const userId = Number.parseInt(user.id, 10)

  const session = await prisma.classSession.findUnique({
    where: { id },
  })

  if (!session) throw new Error("Session not found")
  if (user.role !== "ADMIN" && session.coachId !== userId) {
    throw new Error("Not authorized to cancel this session")
  }

  if (session?.googleEventId) {
    try {
      await deleteGoogleCalendarEvent(session.googleEventId)
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error)
    }
  }

  const updatedSession = await prisma.classSession.update({
    where: { id },
    data: { status: "CANCELLED" },
  })

  revalidatePath("/sessions")

  return updatedSession
}

export async function syncSessionToGoogleCalendar(id: number) {
  const user = await requireCoach()
  const userId = Number.parseInt(user.id, 10)

  const session = await prisma.classSession.findUnique({
    where: { id },
    include: { classType: true },
  })

  if (!session) {
    throw new Error("Session not found")
  }

  if (user.role !== "ADMIN" && session.coachId !== userId) {
    throw new Error("Not authorized to sync this session")
  }

  const calendarEvent: CalendarEvent = {
    title: session.title,
    description: session.notes || "",
    startDate: session.startTime,
    endDate: session.endTime,
    location: session.location || "",
    isAllDay: false,
  }

  try {
    if (session.googleEventId) {
      await updateGoogleCalendarEvent(session.googleEventId, calendarEvent)
      return { success: true, message: "Google Calendar event updated" }
    }

    const googleEvent = await addEventToGoogleCalendar(calendarEvent)
    if (googleEvent.id) {
      await prisma.classSession.update({
        where: { id },
        data: { googleEventId: googleEvent.id },
      })
      return { success: true, message: "Synced to Google Calendar" }
    }

    throw new Error("Failed to create Google Calendar event")
  } catch (error) {
    console.error("Error syncing session to Google Calendar:", error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to sync with Google Calendar",
    }
  }
}

export async function generateRecurringSessions(
  input: GenerateRecurringSessionsInput,
) {
  const user = await requireCoach()
  const parsed = generateRecurringSchema.parse(input)

  const coachId = Number.parseInt(user.id, 10)
  const baseDate = parseISO(parsed.startDate)
  const [startHours, startMinutes] = parsed.startTime.split(":").map(Number)
  const [endHours, endMinutes] = parsed.endTime.split(":").map(Number)

  const sessionsData = []

  for (let week = 0; week < parsed.weeks; week++) {
    const weekDate = addWeeks(baseDate, week)
    const dayDate = setDay(weekDate, parsed.dayOfWeek, { weekStartsOn: 0 })

    const startDateTime = set(dayDate, {
      hours: startHours,
      minutes: startMinutes,
      seconds: 0,
      milliseconds: 0,
    })
    const endDateTime = set(dayDate, {
      hours: endHours,
      minutes: endMinutes,
      seconds: 0,
      milliseconds: 0,
    })

    sessionsData.push({
      classTypeId: parsed.classTypeId,
      coachId,
      title: parsed.title,
      startTime: startDateTime,
      endTime: endDateTime,
      maxOccupancy: parsed.maxOccupancy,
      location: parsed.location,
    })
  }

  const result = await prisma.classSession.createMany({
    data: sessionsData,
  })

  revalidatePath("/sessions")

  return result
}
