"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"

const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["ADMIN", "COACH", "CLIENT"]).default("CLIENT"),
  password: z.string().min(8).optional(),
  credits: z.number().int().min(0).optional(),
})

const updateUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "COACH", "CLIENT"]).optional(),
  password: z.string().min(8).optional(),
  credits: z.number().int().min(0).optional(),
})

export async function getAdminUsers(params?: { query?: string }) {
  await requireAdmin()

  const where = params?.query
    ? {
        OR: [
          { name: { contains: params.query, mode: "insensitive" as const } },
          { email: { contains: params.query, mode: "insensitive" as const } },
        ],
      }
    : {}

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          appointments: true,
          cohortMemberships: true,
          invoices: true,
        },
      },
      credits: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAdminUserById(id: number) {
  await requireAdmin()

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { startTime: "desc" }, take: 10 },
      cohortMemberships: { include: { cohort: true } },
      invoices: { orderBy: { month: "desc" }, take: 10 },
      bootcampAttendees: { include: { bootcamp: true } },
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  return user
}

export async function createAdminUser(input: z.infer<typeof createUserSchema>) {
  await requireAdmin()

  const result = createUserSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { name, email, role, password } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("User with this email already exists")
  }

  const hashed = password ? await bcrypt.hash(password, 10) : null

  return prisma.user.create({
    data: {
      name,
      email,
      role: role as Role,
      password: hashed,
      emailVerified: false,
      credits: result.data.credits ?? 0,
    },
  })
}

export async function updateAdminUser(input: z.infer<typeof updateUserSchema>) {
  await requireAdmin()

  const result = updateUserSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, name, email, role, password, credits } = result.data
  const hashed = password ? await bcrypt.hash(password, 10) : undefined

  return prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(role !== undefined ? { role: role as Role } : {}),
      ...(hashed !== undefined ? { password: hashed } : {}),
      ...(credits !== undefined ? { credits } : {}),
    },
  })
}
