"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { auth } from "@/auth"

export async function getAvailableBootcamps() {
  await requireAuth()
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const now = new Date()
  return prisma.bootcamp.findMany({
    where: {
      startTime: { gte: now },
    },
    include: {
      attendees: {
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  })
}

export async function registerForBootcamp(bootcampId: number) {
  await requireAuth()
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = Number(session.user.id)
  if (isNaN(userId)) throw new Error("Invalid user ID")

  const bootcamp = await prisma.bootcamp.findUnique({
    where: { id: bootcampId },
    include: { attendees: true },
  })

  if (!bootcamp) throw new Error("Bootcamp not found")
  if (bootcamp.capacity && bootcamp.attendees.length >= bootcamp.capacity) {
    throw new Error("Bootcamp is full")
  }

  const existing = bootcamp.attendees.find((a) => a.userId === userId)
  if (existing) throw new Error("Already registered")

  await prisma.bootcampAttendee.create({
    data: {
      bootcampId,
      userId,
    },
  })

  return { success: true }
}

export async function unregisterFromBootcamp(bootcampId: number) {
  await requireAuth()
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = Number(session.user.id)
  if (isNaN(userId)) throw new Error("Invalid user ID")

  await prisma.bootcampAttendee.delete({
    where: {
      bootcampId_userId: {
        bootcampId,
        userId,
      },
    },
  })

  return { success: true }
}
