"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { sendSystemEmail } from "@/lib/email"
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email-templates"
import { format, differenceInHours } from "date-fns"
import { deleteGoogleCalendarEvent } from "@/lib/google-calendar"

export async function getMyAppointments(dateRange?: { from?: Date; to?: Date }) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  return prisma.appointment.findMany({
    where: {
      userId,
      ...(dateRange?.from && dateRange?.to
        ? {
            startTime: { gte: dateRange.from },
            endTime: { lte: dateRange.to },
          }
        : {}),
    },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  })
}

export async function getMyAppointmentById(id: number) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      userId, // Ensure the appointment belongs to the current user
    },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  return appointment
}

export async function cancelMyAppointment(id: number) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  // Find the appointment and verify ownership
  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      userId,
    },
  })

  if (!appointment) {
    throw new Error("Appointment not found")
  }

  // Check if cancellation is allowed (more than 24 hours before)
  const hoursUntilAppointment = differenceInHours(
    new Date(appointment.startTime),
    new Date()
  )

  if (hoursUntilAppointment < 24) {
    throw new Error(
      "Appointments can only be cancelled more than 24 hours in advance. Please contact your coach directly."
    )
  }

  // Delete from Google Calendar if synced
  if (appointment.googleEventId) {
    try {
      await deleteGoogleCalendarEvent(appointment.googleEventId)
    } catch (error) {
      console.error("Error deleting from Google Calendar:", error)
      // Continue with deletion even if calendar sync fails
    }
  }

  // Delete the appointment
  await prisma.appointment.delete({
    where: { id },
  })

  // Get user info for email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, isTestUser: true },
  })

  // Send cancellation email
  if (user?.email) {
    await sendSystemEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.APPOINTMENT_CANCELLED,
      to: user.email,
      variables: {
        userName: user.name || "Member",
        appointmentDate: format(appointment.startTime, "EEEE, MMMM do, yyyy"),
        appointmentTime: format(appointment.startTime, "h:mm a"),
      },
      isTestUser: user.isTestUser ?? false,
    })
  }

  return { success: true }
}
