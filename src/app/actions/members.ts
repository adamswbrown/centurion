"use server"

import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"
import { z } from "zod"

const createMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  image: z.string().optional(),
})

const updateMemberSchema = createMemberSchema.partial()

export async function getMembers() {
  await requireCoach()

  return await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          appointmentsAsClient: true,
          cohortMemberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMemberById(id: number) {
  await requireCoach()

  return await prisma.user.findUnique({
    where: { id, role: "CLIENT" },
    include: {
      appointmentsAsClient: {
        orderBy: { startTime: "desc" },
        take: 20,
        include: {
          coach: { select: { id: true, name: true } },
        },
      },
      cohortMemberships: {
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
              checkInFrequencyDays: true,
            },
          },
        },
      },
      invoices: {
        orderBy: { month: "desc" },
        take: 10,
      },
      entries: {
        orderBy: { date: "desc" },
        take: 30,
      },
      questionnaireResponses: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          bundle: {
            select: {
              id: true,
              weekNumber: true,
              cohort: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
}

export async function createMember(formData: FormData) {
  await requireCoach()

  const result = createMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    image: formData.get("image"),
  })

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    }
  }

  const { name, email, image } = result.data

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    return {
      error: "User with this email already exists",
    }
  }

  const member = await prisma.user.create({
    data: {
      name,
      email,
      image,
      role: "CLIENT",
      emailVerified: false,
    },
  })

  return { success: true, member }
}

export async function updateMember(id: number, formData: FormData) {
  await requireCoach()

  const result = updateMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    image: formData.get("image"),
  })

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    }
  }

  const member = await prisma.user.findUnique({
    where: { id },
  })

  if (!member || member.role !== "CLIENT") {
    return {
      error: "Member not found",
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: result.data,
  })

  return { success: true, member: updated }
}

export async function deleteMember(id: number) {
  await requireCoach()

  const member = await prisma.user.findUnique({
    where: { id },
  })

  if (!member || member.role !== "CLIENT") {
    return {
      error: "Member not found",
    }
  }

  await prisma.user.delete({
    where: { id },
  })

  return { success: true }
}

/**
 * Update a member's check-in frequency override
 * This overrides the cohort default for this specific member
 */
const updateCheckInFrequencySchema = z.object({
  memberId: z.number().int().positive(),
  frequencyDays: z.number().int().min(1).max(7).nullable(),
})

export async function updateMemberCheckInFrequency(input: {
  memberId: number
  frequencyDays: number | null
}) {
  await requireCoach()

  const result = updateCheckInFrequencySchema.safeParse(input)
  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    }
  }

  const { memberId, frequencyDays } = result.data

  const member = await prisma.user.findUnique({
    where: { id: memberId },
  })

  if (!member || member.role !== "CLIENT") {
    return {
      error: "Member not found",
    }
  }

  const updated = await prisma.user.update({
    where: { id: memberId },
    data: {
      checkInFrequencyDays: frequencyDays,
    },
    select: {
      id: true,
      checkInFrequencyDays: true,
    },
  })

  return { success: true, member: updated }
}

/**
 * Get a member's effective check-in frequency
 * Returns the user override, cohort default, or system default
 */
export async function getMemberEffectiveFrequency(memberId: number): Promise<{
  frequencyDays: number
  source: "user" | "cohort" | "system"
}> {
  await requireCoach()

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      checkInFrequencyDays: true,
      cohortMemberships: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          cohort: {
            select: {
              checkInFrequencyDays: true,
            },
          },
        },
      },
    },
  })

  if (!member) {
    return { frequencyDays: 1, source: "system" }
  }

  // User override takes precedence
  if (member.checkInFrequencyDays !== null) {
    return { frequencyDays: member.checkInFrequencyDays, source: "user" }
  }

  // Cohort default is second
  const cohortFrequency = member.cohortMemberships[0]?.cohort?.checkInFrequencyDays
  if (cohortFrequency !== null && cohortFrequency !== undefined) {
    return { frequencyDays: cohortFrequency, source: "cohort" }
  }

  // System default is fallback
  const systemSettings = await prisma.systemSettings.findUnique({
    where: { key: "defaultCheckInFrequencyDays" },
  })
  const systemDefault = (systemSettings?.value as number) || 1

  return { frequencyDays: systemDefault, source: "system" }
}
