"use server"

import { z } from "zod"
import { Prisma, AttendanceStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"
import {
  addMultipleEventsToGoogleCalendar,
  addEventToGoogleCalendar,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type CalendarEvent,
} from "@/lib/google-calendar"
import {
  combineDateAndTime,
  extractTimeString,
  getRepeatingDates,
  getWeekday,
} from "@/lib/calendar"

const createAppointmentSchema = z.object({
  memberId: z.number().int().positive(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  fee: z.number().min(0),
  notes: z.string().optional(),
  weeksToRepeat: z.number().int().min(0).max(52).default(0),
  selectedDays: z.array(z.number().int().min(0).max(6)).default([]),
})

const updateAppointmentSchema = z.object({
  id: z.number().int().positive(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  fee: z.number().min(0),
  notes: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
})

function ensureValidRange(start: Date, end: Date) {
  if (end <= start) {
    throw new Error("End time must be after start time")
  }
}

function hasOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>

export type CreateAppointmentResult = {
  appointments: {
    id: number
    startTime: Date
    endTime: Date
    fee: Prisma.Decimal
    status: AttendanceStatus
    notes: string | null
    googleEventId: string | null
  }[]
  syncStatus: {
    success: boolean
    message?: string
    failedCount?: number
    totalCount?: number
    successCount?: number
  }
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  await requireCoach()

  const result = createAppointmentSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const {
    memberId,
    date,
    startTime,
    endTime,
    fee,
    notes,
    weeksToRepeat,
  } = result.data

  const selectedDays = result.data.selectedDays.length
    ? result.data.selectedDays
    : [getWeekday(date)]

  const startDateTime = combineDateAndTime(date, startTime)
  const endDateTime = combineDateAndTime(date, endTime)

  if (!startDateTime || !endDateTime) {
    throw new Error("Invalid date or time")
  }

  ensureValidRange(startDateTime, endDateTime)

  const dates = getRepeatingDates(date, selectedDays, weeksToRepeat)

  const candidateAppointments = dates.map((repeatDate) => {
    const dateString = repeatDate.toISOString().split("T")[0]
    const start = combineDateAndTime(dateString, startTime)
    const end = combineDateAndTime(dateString, endTime)

    if (!start || !end) {
      throw new Error("Invalid repeating date")
    }

    ensureValidRange(start, end)

    return { start, end }
  })

  const earliestStart = candidateAppointments.reduce(
    (min, current) => (current.start < min ? current.start : min),
    candidateAppointments[0].start,
  )
  const latestEnd = candidateAppointments.reduce(
    (max, current) => (current.end > max ? current.end : max),
    candidateAppointments[0].end,
  )

  const existing = await prisma.appointment.findMany({
    where: {
      userId: memberId,
      startTime: { lt: latestEnd },
      endTime: { gt: earliestStart },
    },
    select: { id: true, startTime: true, endTime: true },
  })

  const conflicts = candidateAppointments.filter((candidate) =>
    existing.some((appointment) =>
      hasOverlap(candidate.start, candidate.end, appointment.startTime, appointment.endTime),
    ),
  )

  if (conflicts.length > 0) {
    throw new Error("Appointment conflicts with an existing session")
  }

  const appointments = await prisma.$transaction(
    candidateAppointments.map((appointment) =>
      prisma.appointment.create({
        data: {
          userId: memberId,
          startTime: appointment.start,
          endTime: appointment.end,
          fee: new Prisma.Decimal(fee),
          notes: notes || null,
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          fee: true,
          status: true,
          notes: true,
          googleEventId: true,
        },
      }),
    ),
  )

  let syncStatus: CreateAppointmentResult["syncStatus"] = {
    success: true,
  }

  if (process.env.GOOGLE_CALENDAR_ID) {
    try {
      const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: { name: true, email: true },
      })

      const results = await addMultipleEventsToGoogleCalendar(
        appointments.map((appointment) => ({
          title: member?.name ? `Session with ${member.name}` : "Training Session",
          description: member?.email ? `Member: ${member.email}` : "",
          startDate: appointment.startTime,
          endDate: appointment.endTime,
          isAllDay: false,
        })),
      )

      const updatePromises = []
      let successCount = 0
      let failedCount = 0

      for (let i = 0; i < results.length; i += 1) {
        const result = results[i]
        if (result.success && result.googleCalendarEventId) {
          successCount += 1
          updatePromises.push(
            prisma.appointment.update({
              where: { id: appointments[i].id },
              data: { googleEventId: result.googleCalendarEventId },
            }),
          )
          appointments[i].googleEventId = result.googleCalendarEventId
        } else {
          failedCount += 1
        }
      }

      if (updatePromises.length > 0) {
        await prisma.$transaction(updatePromises)
      }

      if (failedCount > 0) {
        syncStatus = {
          success: false,
          message: `${failedCount} out of ${appointments.length} appointments failed to sync with Google Calendar`,
          failedCount,
          successCount,
          totalCount: appointments.length,
        }
      } else {
        syncStatus = {
          success: true,
          message: `Successfully synced all ${appointments.length} appointments to Google Calendar`,
          successCount,
          totalCount: appointments.length,
        }
      }
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error)
      syncStatus = {
        success: false,
        message: "Failed to sync with Google Calendar. Appointments were saved.",
        failedCount: appointments.length,
      }
    }
  }

  return { appointments, syncStatus }
}

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>

export async function updateAppointment(input: UpdateAppointmentInput) {
  await requireCoach()

  const result = updateAppointmentSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, startTime, endTime, fee, notes, status } = result.data

  const appointment = await prisma.appointment.findUnique({
    where: { id },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  const startDateTime = combineDateAndTime(
    appointment.startTime.toISOString().split("T")[0],
    startTime,
  )
  const endDateTime = combineDateAndTime(
    appointment.startTime.toISOString().split("T")[0],
    endTime,
  )

  if (!startDateTime || !endDateTime) {
    throw new Error("Invalid date or time")
  }

  ensureValidRange(startDateTime, endDateTime)

  const conflict = await prisma.appointment.findFirst({
    where: {
      id: { not: id },
      userId: appointment.userId,
      startTime: { lt: endDateTime },
      endTime: { gt: startDateTime },
    },
    select: { id: true },
  })

  if (conflict) {
    throw new Error("Appointment conflicts with an existing session")
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      startTime: startDateTime,
      endTime: endDateTime,
      fee: new Prisma.Decimal(fee),
      notes: notes ?? null,
      ...(status ? { status } : {}),
    },
  })

  let syncStatus: { success: boolean; message?: string } = { success: true }

  try {
    const calendarEvent: CalendarEvent = {
      title: "Training Session",
      description: updated.notes || "",
      startDate: updated.startTime,
      endDate: updated.endTime,
      isAllDay: false,
    }

    if (updated.googleEventId) {
      await updateGoogleCalendarEvent(updated.googleEventId, calendarEvent)
    } else if (process.env.GOOGLE_CALENDAR_ID) {
      const googleEvent = await addEventToGoogleCalendar(calendarEvent)
      if (googleEvent.id) {
        await prisma.appointment.update({
          where: { id: updated.id },
          data: { googleEventId: googleEvent.id },
        })
      }
    }
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error)
    syncStatus = {
      success: false,
      message: "Failed to sync with Google Calendar. Changes were saved.",
    }
  }

  return { appointment: updated, syncStatus }
}

export async function deleteAppointment(id: number) {
  await requireCoach()

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { googleEventId: true },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  await prisma.appointment.delete({
    where: { id },
  })

  let syncStatus: { success: boolean; message?: string } = { success: true }

  if (appointment.googleEventId) {
    try {
      await deleteGoogleCalendarEvent(appointment.googleEventId)
    } catch (error) {
      console.error("Error deleting from Google Calendar:", error)
      syncStatus = {
        success: false,
        message: "Failed to delete from Google Calendar. Appointment was removed from the system.",
      }
    }
  }

  return { success: true, syncStatus }
}

export async function getAppointmentById(id: number) {
  await requireCoach()

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  return appointment
}

export async function getAppointments(options?: {
  memberId?: number
  from?: Date
  to?: Date
}) {
  await requireCoach()

  return prisma.appointment.findMany({
    where: {
      ...(options?.memberId ? { userId: options.memberId } : {}),
      ...(options?.from && options?.to
        ? {
            startTime: { gte: options.from },
            endTime: { lte: options.to },
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { startTime: "desc" },
  })
}

export async function syncAppointmentToGoogleCalendar(id: number) {
  await requireCoach()

  const appointment = await prisma.appointment.findUnique({
    where: { id },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  const calendarEvent: CalendarEvent = {
    title: "Training Session",
    description: appointment.notes || "",
    startDate: appointment.startTime,
    endDate: appointment.endTime,
    isAllDay: false,
  }

  try {
    if (appointment.googleEventId) {
      await updateGoogleCalendarEvent(appointment.googleEventId, calendarEvent)
      return { success: true, message: "Google Calendar event updated" }
    }

    const googleEvent = await addEventToGoogleCalendar(calendarEvent)
    if (googleEvent.id) {
      await prisma.appointment.update({
        where: { id },
        data: { googleEventId: googleEvent.id },
      })
      return { success: true, message: "Synced to Google Calendar" }
    }

    throw new Error("Failed to create Google Calendar event")
  } catch (error) {
    console.error("Error syncing appointment to Google Calendar:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync with Google Calendar",
    }
  }
}
