"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const setCohortAccessSchema = z.object({
  cohortId: z.number().int().positive(),
  classTypeIds: z.array(z.number().int().positive()),
})

export type SetCohortAccessInput = z.infer<typeof setCohortAccessSchema>

export async function getCohortSessionAccess(cohortId: number) {
  await requireAdmin()

  return prisma.cohortSessionAccess.findMany({
    where: { cohortId },
    include: {
      classType: true,
    },
    orderBy: { classType: { name: "asc" } },
  })
}

export async function setCohortSessionAccess(input: SetCohortAccessInput) {
  await requireAdmin()

  const { cohortId, classTypeIds } = setCohortAccessSchema.parse(input)

  await prisma.$transaction(async (tx) => {
    // Remove all existing access for this cohort
    await tx.cohortSessionAccess.deleteMany({
      where: { cohortId },
    })

    // Create new access records
    if (classTypeIds.length > 0) {
      await tx.cohortSessionAccess.createMany({
        data: classTypeIds.map((classTypeId) => ({
          cohortId,
          classTypeId,
        })),
      })
    }
  })

  revalidatePath(`/cohorts/${cohortId}`)
  revalidatePath("/sessions")
  revalidatePath("/client/sessions")
}
