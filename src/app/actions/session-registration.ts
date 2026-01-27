"use server"

import { z } from "zod"
import {
  RegistrationStatus,
  MembershipPlanType,
  MembershipTierStatus,
  SessionStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireCoach } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { startOfWeek, endOfWeek, differenceInDays } from "date-fns"

// ============================================
// SCHEMAS
// ============================================

const registerSchema = z.object({
  sessionId: z.number().int().positive(),
})

const cancelRegistrationSchema = z.object({
  registrationId: z.number().int().positive(),
})

const markAttendanceSchema = z.object({
  registrationId: z.number().int().positive(),
  status: z.enum(["ATTENDED", "NO_SHOW"]),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type CancelRegistrationInput = z.infer<typeof cancelRegistrationSchema>
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>

// ============================================
// CLIENT ACTIONS
// ============================================

export async function registerForSession(input: RegisterInput) {
  const session = await requireAuth()
  const data = registerSchema.parse(input)
  const userId = Number.parseInt(session.id, 10)

  // 1. Find the session
  const classSession = await prisma.classSession.findUnique({
    where: { id: data.sessionId },
    include: {
      classType: true,
      registrations: {
        where: {
          status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED] },
        },
      },
      _count: {
        select: {
          registrations: {
            where: {
              status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED] },
            },
          },
        },
      },
    },
  })

  if (!classSession) {
    throw new Error("Session not found")
  }

  if (classSession.status !== SessionStatus.SCHEDULED) {
    throw new Error("Session is not available for registration")
  }

  // Check if already registered
  const existing = await prisma.sessionRegistration.findUnique({
    where: {
      sessionId_userId: { sessionId: data.sessionId, userId },
    },
  })

  if (existing && existing.status !== RegistrationStatus.CANCELLED) {
    throw new Error("Already registered for this session")
  }

  // 2. Find user's active membership
  const membership = await prisma.userMembership.findFirst({
    where: {
      userId,
      status: MembershipTierStatus.ACTIVE,
    },
    include: {
      plan: {
        include: {
          allowances: true,
        },
      },
    },
  })

  if (!membership) {
    throw new Error("No active membership found")
  }

  // 3. Verify class type is allowed by membership
  if (membership.plan.allowances.length > 0 && classSession.classTypeId) {
    const allowed = membership.plan.allowances.some(
      (a) => a.classTypeId === classSession.classTypeId
    )
    if (!allowed) {
      throw new Error("Your membership plan does not include this class type")
    }
  }

  // 4. Check membership limits by type
  switch (membership.plan.type) {
    case MembershipPlanType.RECURRING: {
      if (membership.plan.sessionsPerWeek) {
        const weekStart = startOfWeek(classSession.startTime, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(classSession.startTime, { weekStartsOn: 1 })

        const weeklyCount = await prisma.sessionRegistration.count({
          where: {
            userId,
            status: {
              in: [RegistrationStatus.REGISTERED, RegistrationStatus.LATE_CANCELLED, RegistrationStatus.ATTENDED],
            },
            session: {
              startTime: { gte: weekStart, lte: weekEnd },
            },
          },
        })

        if (weeklyCount >= membership.plan.sessionsPerWeek) {
          throw new Error(
            `Weekly session limit reached (${membership.plan.sessionsPerWeek} per week)`
          )
        }
      }
      break
    }

    case MembershipPlanType.PACK: {
      if (membership.sessionsRemaining !== null && membership.sessionsRemaining <= 0) {
        throw new Error("No sessions remaining in your pack")
      }
      break
    }

    case MembershipPlanType.PREPAID: {
      if (membership.endDate && new Date() > membership.endDate) {
        throw new Error("Your prepaid membership has expired")
      }
      break
    }
  }

  // 5. Determine if session is full
  const registeredCount = classSession._count.registrations
  const isFull = registeredCount >= classSession.maxOccupancy

  if (isFull) {
    // Add to waitlist
    const maxWaitlistPos = await prisma.sessionRegistration.aggregate({
      where: {
        sessionId: data.sessionId,
        status: RegistrationStatus.WAITLISTED,
      },
      _max: { waitlistPosition: true },
    })

    const nextPosition = (maxWaitlistPos._max.waitlistPosition ?? 0) + 1

    const registration = existing
      ? await prisma.sessionRegistration.update({
          where: { id: existing.id },
          data: {
            status: RegistrationStatus.WAITLISTED,
            waitlistPosition: nextPosition,
            cancelledAt: null,
          },
        })
      : await prisma.sessionRegistration.create({
          data: {
            sessionId: data.sessionId,
            userId,
            status: RegistrationStatus.WAITLISTED,
            waitlistPosition: nextPosition,
          },
        })

    revalidatePath("/client/sessions")
    revalidatePath("/sessions")
    return { ...registration, waitlisted: true }
  }

  // 6. Register and decrement pack if needed
  const registration = await prisma.$transaction(async (tx) => {
    const reg = existing
      ? await tx.sessionRegistration.update({
          where: { id: existing.id },
          data: {
            status: RegistrationStatus.REGISTERED,
            waitlistPosition: null,
            cancelledAt: null,
          },
        })
      : await tx.sessionRegistration.create({
          data: {
            sessionId: data.sessionId,
            userId,
            status: RegistrationStatus.REGISTERED,
          },
        })

    // Decrement pack sessions
    if (membership.plan.type === MembershipPlanType.PACK && membership.sessionsRemaining !== null) {
      await tx.userMembership.update({
        where: { id: membership.id },
        data: { sessionsRemaining: membership.sessionsRemaining - 1 },
      })
    }

    return reg
  })

  revalidatePath("/client/sessions")
  revalidatePath("/sessions")
  return { ...registration, waitlisted: false }
}

export async function cancelRegistration(input: CancelRegistrationInput) {
  const session = await requireAuth()
  const data = cancelRegistrationSchema.parse(input)
  const userId = Number.parseInt(session.id, 10)

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: data.registrationId },
    include: {
      session: true,
    },
  })

  if (!registration) {
    throw new Error("Registration not found")
  }

  if (registration.userId !== userId) {
    throw new Error("Not authorized to cancel this registration")
  }

  if (
    registration.status !== RegistrationStatus.REGISTERED &&
    registration.status !== RegistrationStatus.WAITLISTED
  ) {
    throw new Error("Cannot cancel this registration")
  }

  // If waitlisted, simply cancel
  if (registration.status === RegistrationStatus.WAITLISTED) {
    await prisma.sessionRegistration.update({
      where: { id: data.registrationId },
      data: {
        status: RegistrationStatus.CANCELLED,
        cancelledAt: new Date(),
        waitlistPosition: null,
      },
    })

    revalidatePath("/client/sessions")
    revalidatePath("/sessions")
    return { lateCancelled: false }
  }

  // Check late cancel cutoff
  const membership = await prisma.userMembership.findFirst({
    where: { userId, status: MembershipTierStatus.ACTIVE },
    include: { plan: true },
  })

  const cutoffHours = membership?.plan.lateCancelCutoffHours ?? 2
  const now = new Date()
  const sessionStart = registration.session.startTime
  const hoursUntilSession =
    (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  const isLateCancellation = hoursUntilSession < cutoffHours

  await prisma.$transaction(async (tx) => {
    await tx.sessionRegistration.update({
      where: { id: data.registrationId },
      data: {
        status: isLateCancellation
          ? RegistrationStatus.LATE_CANCELLED
          : RegistrationStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    })

    // Refund pack session if NOT late cancel
    if (
      !isLateCancellation &&
      membership?.plan.type === MembershipPlanType.PACK &&
      membership.sessionsRemaining !== null
    ) {
      await tx.userMembership.update({
        where: { id: membership.id },
        data: { sessionsRemaining: membership.sessionsRemaining + 1 },
      })
    }

    // Auto-promote first waitlisted
    const nextWaitlisted = await tx.sessionRegistration.findFirst({
      where: {
        sessionId: registration.sessionId,
        status: RegistrationStatus.WAITLISTED,
      },
      orderBy: { waitlistPosition: "asc" },
    })

    if (nextWaitlisted) {
      await tx.sessionRegistration.update({
        where: { id: nextWaitlisted.id },
        data: {
          status: RegistrationStatus.REGISTERED,
          waitlistPosition: null,
          promotedFromWaitlistAt: new Date(),
        },
      })
    }
  })

  revalidatePath("/client/sessions")
  revalidatePath("/sessions")
  return { lateCancelled: isLateCancellation }
}

export async function getMyRegistrations(params?: {
  status?: RegistrationStatus
  upcoming?: boolean
}) {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const where: Record<string, unknown> = { userId }

  if (params?.status) {
    where.status = params.status
  }

  if (params?.upcoming) {
    where.session = {
      startTime: { gte: new Date() },
      status: SessionStatus.SCHEDULED,
    }
  }

  return prisma.sessionRegistration.findMany({
    where,
    include: {
      session: {
        include: {
          classType: true,
          coach: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              registrations: {
                where: {
                  status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED] },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { session: { startTime: "asc" } },
  })
}

export async function getSessionUsage(userId?: number) {
  const session = await requireAuth()
  const targetUserId = userId ?? Number.parseInt(session.id, 10)

  const membership = await prisma.userMembership.findFirst({
    where: {
      userId: targetUserId,
      status: MembershipTierStatus.ACTIVE,
    },
    include: { plan: true },
  })

  if (!membership) {
    return null
  }

  switch (membership.plan.type) {
    case MembershipPlanType.RECURRING: {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

      const used = await prisma.sessionRegistration.count({
        where: {
          userId: targetUserId,
          status: {
            in: [RegistrationStatus.REGISTERED, RegistrationStatus.LATE_CANCELLED, RegistrationStatus.ATTENDED],
          },
          session: {
            startTime: { gte: weekStart, lte: weekEnd },
          },
        },
      })

      const limit = membership.plan.sessionsPerWeek ?? 0
      return {
        type: "recurring" as const,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        planName: membership.plan.name,
      }
    }

    case MembershipPlanType.PACK: {
      return {
        type: "pack" as const,
        sessionsRemaining: membership.sessionsRemaining ?? 0,
        totalSessions: membership.plan.totalSessions ?? 0,
        planName: membership.plan.name,
      }
    }

    case MembershipPlanType.PREPAID: {
      const daysRemaining = membership.endDate
        ? Math.max(0, differenceInDays(membership.endDate, new Date()))
        : 0

      return {
        type: "prepaid" as const,
        daysRemaining,
        endDate: membership.endDate?.toISOString() ?? null,
        planName: membership.plan.name,
      }
    }
  }
}

// ============================================
// COACH ACTIONS
// ============================================

export async function markAttendance(input: MarkAttendanceInput) {
  await requireCoach()
  const data = markAttendanceSchema.parse(input)

  const registration = await prisma.sessionRegistration.update({
    where: { id: data.registrationId },
    data: {
      status: data.status === "ATTENDED"
        ? RegistrationStatus.ATTENDED
        : RegistrationStatus.NO_SHOW,
    },
  })

  revalidatePath("/sessions")
  return registration
}

export async function getSessionRegistrations(sessionId: number) {
  await requireCoach()

  return prisma.sessionRegistration.findMany({
    where: { sessionId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: [
      { status: "asc" },
      { waitlistPosition: "asc" },
      { registeredAt: "asc" },
    ],
  })
}
