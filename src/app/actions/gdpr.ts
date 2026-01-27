"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit-log"

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  password: z.string().optional(),
})

export async function exportUserData() {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      credits: true,
      creditsExpiry: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return { error: "User not found" }
  }

  const [
    entries,
    healthKitWorkouts,
    sleepRecords,
    appointments,
    workouts,
    cohortMemberships,
    questionnaireResponses,
    coachNotesReceived,
    weeklyResponsesReceived,
    invoices,
    creditTransactions,
  ] = await Promise.all([
    prisma.entry.findMany({ where: { userId } }),
    prisma.healthKitWorkout.findMany({ where: { userId } }),
    prisma.sleepRecord.findMany({ where: { userId } }),
    prisma.appointment.findMany({ where: { userId } }),
    prisma.workout.findMany({ where: { userId } }),
    prisma.cohortMembership.findMany({
      where: { userId },
      include: { cohort: { select: { name: true } } },
    }),
    prisma.weeklyQuestionnaireResponse.findMany({ where: { userId } }),
    prisma.coachNote.findMany({
      where: { userId },
      select: {
        id: true,
        weekNumber: true,
        notes: true,
        createdAt: true,
        coach: { select: { name: true } },
      },
    }),
    prisma.weeklyCoachResponse.findMany({
      where: { clientId: userId },
      select: {
        id: true,
        weekStart: true,
        loomUrl: true,
        note: true,
        createdAt: true,
        coach: { select: { name: true } },
      },
    }),
    prisma.invoice.findMany({ where: { userId } }),
    prisma.creditTransaction.findMany({ where: { userId } }),
  ])

  await logAuditEvent({
    action: "EXPORT_USER_DATA",
    actorId: userId,
    targetId: userId,
    targetType: "User",
  })

  return {
    success: true,
    data: {
      exportDate: new Date().toISOString(),
      profile: user,
      entries,
      healthKitWorkouts,
      sleepRecords,
      appointments,
      workouts,
      cohortMemberships,
      questionnaireResponses,
      coachNotesReceived,
      weeklyResponsesReceived,
      invoices,
      creditTransactions,
    },
  }
}

export async function deleteAccount(input: z.infer<typeof deleteAccountSchema>) {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const result = deleteAccountSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true },
  })

  if (!user) {
    return { error: "User not found" }
  }

  // If user has a password, verify it
  if (user.password) {
    if (!result.data.password) {
      return { error: "Password is required to delete your account" }
    }

    const isValid = await bcrypt.compare(result.data.password, user.password)
    if (!isValid) {
      return { error: "Incorrect password" }
    }
  }

  // Log audit event BEFORE deletion
  await logAuditEvent({
    action: "DELETE_ACCOUNT",
    actorId: userId,
    targetId: userId,
    targetType: "User",
    details: { email: user.email },
  })

  // Delete user - cascades handle all related data
  await prisma.user.delete({
    where: { id: userId },
  })

  return { success: true }
}
