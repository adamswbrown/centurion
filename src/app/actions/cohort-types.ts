"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit-log"

const createCustomTypeSchema = z.object({
  label: z.string().min(1, "Label is required").max(50, "Label too long"),
  description: z.string().max(255, "Description too long").optional(),
})

const updateCustomTypeSchema = z.object({
  id: z.number().int().positive(),
  label: z.string().min(1, "Label is required").max(50, "Label too long").optional(),
  description: z.string().max(255, "Description too long").optional().nullable(),
})

export async function getCustomCohortTypes() {
  return prisma.customCohortType.findMany({
    orderBy: { label: "asc" },
    include: {
      _count: {
        select: { cohorts: true },
      },
      creator: {
        select: { name: true, email: true },
      },
    },
  })
}

export async function createCustomCohortType(
  input: z.infer<typeof createCustomTypeSchema>
) {
  const session = await requireAdmin()

  const result = createCustomTypeSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { label, description } = result.data
  const actorId = Number.parseInt(session.id, 10)

  // Check for duplicate label
  const existing = await prisma.customCohortType.findUnique({ where: { label } })
  if (existing) {
    throw new Error("A custom cohort type with this label already exists")
  }

  const customType = await prisma.customCohortType.create({
    data: {
      label,
      description: description || null,
      createdBy: actorId,
    },
  })

  await logAuditEvent({
    action: "CREATE_CUSTOM_COHORT_TYPE",
    actorId,
    targetId: customType.id,
    targetType: "CustomCohortType",
    details: { label },
  })

  return customType
}

export async function updateCustomCohortType(
  input: z.infer<typeof updateCustomTypeSchema>
) {
  const session = await requireAdmin()

  const result = updateCustomTypeSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, label, description } = result.data
  const actorId = Number.parseInt(session.id, 10)

  const existing = await prisma.customCohortType.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Custom cohort type not found")
  }

  // Check for duplicate label if changing
  if (label && label !== existing.label) {
    const duplicate = await prisma.customCohortType.findUnique({ where: { label } })
    if (duplicate) {
      throw new Error("A custom cohort type with this label already exists")
    }
  }

  const updated = await prisma.customCohortType.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  })

  await logAuditEvent({
    action: "UPDATE_CUSTOM_COHORT_TYPE",
    actorId,
    targetId: id,
    targetType: "CustomCohortType",
    details: { label, description },
  })

  return updated
}

export async function deleteCustomCohortType(id: number) {
  const session = await requireAdmin()

  const existing = await prisma.customCohortType.findUnique({
    where: { id },
    include: { _count: { select: { cohorts: true } } },
  })

  if (!existing) {
    throw new Error("Custom cohort type not found")
  }

  if (existing._count.cohorts > 0) {
    throw new Error(
      `Cannot delete: ${existing._count.cohorts} cohort(s) are using this type. Reassign them first.`
    )
  }

  await prisma.customCohortType.delete({ where: { id } })

  const actorId = Number.parseInt(session.id, 10)
  await logAuditEvent({
    action: "DELETE_CUSTOM_COHORT_TYPE",
    actorId,
    targetId: id,
    targetType: "CustomCohortType",
    details: { label: existing.label },
  })

  return { success: true }
}
