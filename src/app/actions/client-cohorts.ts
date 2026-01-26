"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getMyCohorts() {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  return prisma.cohortMembership.findMany({
    where: { userId },
    include: {
      cohort: true,
    },
    orderBy: { joinedAt: "desc" },
  })
}
