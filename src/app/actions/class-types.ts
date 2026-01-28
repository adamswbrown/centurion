"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireCoach } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Schemas (not exported - "use server" files can only export async functions)
// ---------------------------------------------------------------------------

const createClassTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  defaultCapacity: z.number().int().min(1).default(12),
  defaultDurationMins: z.number().int().min(1).default(60),
})

const updateClassTypeSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  defaultCapacity: z.number().int().min(1),
  defaultDurationMins: z.number().int().min(1),
  isActive: z.boolean(),
})

// ---------------------------------------------------------------------------
// Types (inferred from schemas)
// ---------------------------------------------------------------------------

type CreateClassTypeInput = z.infer<typeof createClassTypeSchema>
type UpdateClassTypeInput = z.infer<typeof updateClassTypeSchema>

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getClassTypes(params?: { activeOnly?: boolean }) {
  await requireCoach()

  const where = params?.activeOnly ? { isActive: true } : {}

  return prisma.classType.findMany({
    where,
    orderBy: { name: "asc" },
  })
}

export async function getClassTypeById(id: number) {
  await requireCoach()

  return prisma.classType.findUniqueOrThrow({
    where: { id },
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createClassType(input: CreateClassTypeInput) {
  await requireAdmin()

  const parsed = createClassTypeSchema.parse(input)

  const classType = await prisma.classType.create({
    data: parsed,
  })

  revalidatePath("/sessions")

  return classType
}

export async function updateClassType(input: UpdateClassTypeInput) {
  await requireAdmin()

  const { id, ...data } = updateClassTypeSchema.parse(input)

  const classType = await prisma.classType.update({
    where: { id },
    data,
  })

  revalidatePath("/sessions")

  return classType
}

export async function deleteClassType(id: number) {
  await requireAdmin()

  const classType = await prisma.classType.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath("/sessions")

  return classType
}
