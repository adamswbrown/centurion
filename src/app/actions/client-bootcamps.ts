"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { auth } from "@/auth"

export async function getAvailableBootcamps() {
  await requireAuth()
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = Number(session.user.id)
  if (isNaN(userId)) throw new Error("Invalid user ID")

  const now = new Date()
  const [bootcamps, user] = await prisma.$transaction([
    prisma.bootcamp.findMany({
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
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    }),
  ])

  return {
    bootcamps,
    credits: user?.credits ?? 0,
  }
}

export async function registerForBootcamp(bootcampId: number) {
  await requireAuth()
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = Number(session.user.id)
  if (isNaN(userId)) throw new Error("Invalid user ID")

  return prisma.$transaction(async (tx) => {
    const bootcamp = await tx.bootcamp.findUnique({
      where: { id: bootcampId },
      include: { attendees: true },
    })

    if (!bootcamp) throw new Error("Bootcamp not found")
    if (bootcamp.capacity && bootcamp.attendees.length >= bootcamp.capacity) {
      throw new Error("Bootcamp is full")
    }

    const existing = bootcamp.attendees.find((a) => a.userId === userId)
    if (existing) throw new Error("Already registered")

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user || user.credits <= 0) {
      throw new Error("No credits remaining")
    }

    await tx.bootcampAttendee.create({
      data: {
        bootcampId,
        userId,
      },
    })

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
      select: { credits: true },
    })

    return { success: true, credits: updatedUser.credits }
  })
}

export async function unregisterFromBootcamp(bootcampId: number) {
  await requireAuth()
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = Number(session.user.id)
  if (isNaN(userId)) throw new Error("Invalid user ID")

  return prisma.$transaction(async (tx) => {
    await tx.bootcampAttendee.delete({
      where: {
        bootcampId_userId: {
          bootcampId,
          userId,
        },
      },
    })

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: 1 } },
      select: { credits: true },
    })

    return { success: true, credits: updatedUser.credits }
  })
}
