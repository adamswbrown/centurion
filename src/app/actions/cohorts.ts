"use server"

import { z } from "zod"
import { CohortStatus, MembershipStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireCoach } from "@/lib/auth"
import { sendSystemEmail } from "@/lib/email"
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email-templates"

const createCohortSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
})

const updateCohortSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type CreateCohortInput = z.infer<typeof createCohortSchema>
export type UpdateCohortInput = z.infer<typeof updateCohortSchema>

export async function getCohorts(params?: { status?: CohortStatus }) {
  await requireCoach()

  return prisma.cohort.findMany({
    where: {
      ...(params?.status ? { status: params.status } : {}),
    },
    include: {
      _count: {
        select: {
          members: true,
          coaches: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  })
}

export async function getCohortById(id: number) {
  await requireCoach()

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      coaches: {
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  return cohort
}

export async function createCohort(input: CreateCohortInput) {
  await requireAdmin()

  const result = createCohortSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { name, description, startDate, endDate } = result.data

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end <= start) {
    throw new Error("End date must be after start date")
  }

  const existing = await prisma.cohort.findFirst({
    where: { name },
  })

  if (existing) {
    throw new Error("A cohort with this name already exists")
  }

  const cohort = await prisma.cohort.create({
    data: {
      name,
      description: description || null,
      startDate: start,
      endDate: end,
      status: "ACTIVE",
    },
  })

  return cohort
}

export async function updateCohort(input: UpdateCohortInput) {
  await requireAdmin()

  const result = updateCohortSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, name, description, startDate, endDate } = result.data

  const cohort = await prisma.cohort.findUnique({
    where: { id },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  const updateData: {
    name?: string
    description?: string | null
    startDate?: Date
    endDate?: Date
  } = {}

  if (name !== undefined) {
    const existing = await prisma.cohort.findFirst({
      where: {
        name,
        id: { not: id },
      },
    })

    if (existing) {
      throw new Error("A cohort with this name already exists")
    }

    updateData.name = name
  }

  if (description !== undefined) {
    updateData.description = description || null
  }

  if (startDate !== undefined) {
    updateData.startDate = new Date(startDate)
  }

  if (endDate !== undefined) {
    updateData.endDate = new Date(endDate)
  }

  const finalStartDate = updateData.startDate || cohort.startDate
  const finalEndDate = updateData.endDate || cohort.endDate

  if (finalEndDate && finalEndDate <= finalStartDate) {
    throw new Error("End date must be after start date")
  }

  const updated = await prisma.cohort.update({
    where: { id },
    data: updateData,
  })

  return updated
}

export async function updateCohortStatus(id: number, status: CohortStatus) {
  await requireAdmin()

  const cohort = await prisma.cohort.findUnique({
    where: { id },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  const updated = await prisma.cohort.update({
    where: { id },
    data: { status },
  })

  return updated
}

export async function deleteCohort(id: number) {
  await requireAdmin()

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      members: true,
      coaches: true,
    },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  await prisma.$transaction([
    prisma.cohortMembership.deleteMany({
      where: { cohortId: id },
    }),
    prisma.coachCohortMembership.deleteMany({
      where: { cohortId: id },
    }),
    prisma.cohort.delete({
      where: { id },
    }),
  ])

  return { success: true }
}

export async function addMemberToCohort(cohortId: number, userId: number) {
  const session = await requireAdmin()

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      members: true,
    },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  const existing = cohort.members.find((m) => m.userId === userId)
  if (existing) {
    throw new Error("Member is already in this cohort")
  }

  const membership = await prisma.cohortMembership.create({
    data: {
      cohortId,
      userId,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  })

  // Send cohort invite email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, isTestUser: true },
  })

  const coach = await prisma.user.findUnique({
    where: { id: Number(session.id) },
    select: { name: true },
  })

  if (user?.email) {
    await sendSystemEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.COHORT_INVITE,
      to: user.email,
      variables: {
        userName: user.name || "Member",
        cohortName: cohort.name,
        coachName: coach?.name || "Your Coach",
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/client/cohorts`,
      },
      isTestUser: user.isTestUser ?? false,
    })
  }

  return membership
}

export async function removeMemberFromCohort(cohortId: number, userId: number) {
  await requireAdmin()

  await prisma.cohortMembership.delete({
    where: {
      cohortId_userId: {
        cohortId,
        userId,
      },
    },
  })

  return { success: true }
}

export async function updateMembershipStatus(
  cohortId: number,
  userId: number,
  status: MembershipStatus,
) {
  await requireAdmin()

  const membership = await prisma.cohortMembership.findUnique({
    where: {
      cohortId_userId: {
        cohortId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new Error("Membership not found")
  }

  const updated = await prisma.cohortMembership.update({
    where: {
      cohortId_userId: {
        cohortId,
        userId,
      },
    },
    data: {
      status,
      ...(status === "INACTIVE" ? { leftAt: new Date() } : {}),
    },
  })

  return updated
}

export async function addCoachToCohort(cohortId: number, coachId: number) {
  await requireAdmin()

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      coaches: true,
    },
  })

  if (!cohort) {
    throw new Error("Cohort not found")
  }

  const existing = cohort.coaches.find((c) => c.coachId === coachId)
  if (existing) {
    throw new Error("Coach is already assigned to this cohort")
  }

  const assignment = await prisma.coachCohortMembership.create({
    data: {
      cohortId,
      coachId,
    },
  })

  return assignment
}

export async function removeCoachFromCohort(cohortId: number, coachId: number) {
  await requireAdmin()

  await prisma.coachCohortMembership.delete({
    where: {
      cohortId_coachId: {
        cohortId,
        coachId,
      },
    },
  })

  return { success: true }
}

export async function getAllCoaches() {
  await requireAdmin()

  return prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "COACH"],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  })
}

// ============================================
// CHECK-IN CONFIG
// ============================================

import {
  MANDATORY_PROMPTS,
  OPTIONAL_PROMPTS,
} from "@/lib/check-in-prompts"

const checkInConfigSchema = z.object({
  enabledPrompts: z.array(z.string()).optional(),
  customPrompt1: z.string().max(100).optional().nullable(),
  customPrompt1Type: z.enum(["scale", "text", "number"]).optional().nullable(),
})

export type CheckInConfig = z.infer<typeof checkInConfigSchema>

export async function getCheckInConfig(cohortId: number) {
  await requireCoach()

  const config = await prisma.cohortCheckInConfig.findUnique({
    where: { cohortId },
  })

  if (!config) {
    // Return default config
    return {
      enabledPrompts: [...MANDATORY_PROMPTS, ...OPTIONAL_PROMPTS],
      customPrompt1: null,
      customPrompt1Type: null,
    }
  }

  // Parse the JSON prompts field
  const prompts = config.prompts as CheckInConfig | null

  // Ensure mandatory prompts are always included
  const enabledPrompts = Array.from(
    new Set([
      ...MANDATORY_PROMPTS,
      ...(prompts?.enabledPrompts || OPTIONAL_PROMPTS),
    ])
  )

  return {
    enabledPrompts,
    customPrompt1: prompts?.customPrompt1 || null,
    customPrompt1Type: prompts?.customPrompt1Type || null,
  }
}

export async function updateCheckInConfig(cohortId: number, config: CheckInConfig) {
  await requireCoach()

  const result = checkInConfigSchema.safeParse(config)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { enabledPrompts, customPrompt1, customPrompt1Type } = result.data

  // Ensure mandatory prompts are always included
  const finalEnabledPrompts = Array.from(
    new Set([
      ...MANDATORY_PROMPTS,
      ...(enabledPrompts || []).filter((p) => !MANDATORY_PROMPTS.includes(p)),
    ])
  )

  const prompts: CheckInConfig = {
    enabledPrompts: finalEnabledPrompts,
    customPrompt1: customPrompt1 ?? null,
    customPrompt1Type: customPrompt1Type ?? null,
  }

  const updated = await prisma.cohortCheckInConfig.upsert({
    where: { cohortId },
    update: { prompts },
    create: { cohortId, prompts },
  })

  return updated
}
