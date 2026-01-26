"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getMyAppointments(dateRange?: { from?: Date; to?: Date }) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId || Number.isNaN(userId)) {
    throw new Error("Must be logged in")
  }

  return prisma.appointment.findMany({
    where: {
      userId,
      ...(dateRange?.from && dateRange?.to
        ? {
            startTime: { gte: dateRange.from },
            endTime: { lte: dateRange.to },
          }
        : {}),
    },
    orderBy: { startTime: "asc" },
  })
}
