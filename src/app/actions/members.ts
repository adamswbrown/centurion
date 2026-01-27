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
        include: { cohort: true },
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
