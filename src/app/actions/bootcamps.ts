"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"

const createBootcampSchema = z.object({
  name: z.string().min(2, "Name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
})

const updateBootcampSchema = createBootcampSchema.extend({
  id: z.number().int().positive(),
})

const attendeeSchema = z.object({
  bootcampId: z.number().int().positive(),
  memberId: z.number().int().positive(),
})

function ensureValidRange(start: Date, end: Date) {
  if (end <= start) {
    throw new Error("End time must be after start time")
  }
}

export async function getBootcamps(params?: { from?: Date; to?: Date }) {
  await requireCoach()

  return prisma.bootcamp.findMany({
    where: {
      ...(params?.from && params?.to
        ? {
            startTime: { gte: params.from },
            endTime: { lte: params.to },
          }
        : {}),
    },
    include: {
      attendees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { startTime: "desc" },
  })
}

export async function getBootcampById(id: number) {
  await requireCoach()

  return prisma.bootcamp.findUnique({
    where: { id },
    include: {
      attendees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  })
}

export async function createBootcamp(input: z.infer<typeof createBootcampSchema>) {
  await requireCoach()

  const result = createBootcampSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { name, startTime, endTime, location, capacity, description } = result.data
  const start = new Date(startTime)
  const end = new Date(endTime)
  ensureValidRange(start, end)

  return prisma.bootcamp.create({
    data: {
      name,
      startTime: start,
      endTime: end,
      location: location || null,
      capacity: capacity ?? null,
      description: description || null,
    },
  })
}

export async function updateBootcamp(input: z.infer<typeof updateBootcampSchema>) {
  await requireCoach()

  const result = updateBootcampSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, name, startTime, endTime, location, capacity, description } = result.data
  const start = new Date(startTime)
  const end = new Date(endTime)
  ensureValidRange(start, end)

  return prisma.bootcamp.update({
    where: { id },
    data: {
      name,
      startTime: start,
      endTime: end,
      location: location || null,
      capacity: capacity ?? null,
      description: description || null,
    },
  })
}

export async function deleteBootcamp(id: number) {
  await requireCoach()
  return prisma.bootcamp.delete({ where: { id } })
}

export async function addBootcampAttendee(input: z.infer<typeof attendeeSchema>) {
  await requireCoach()

  const result = attendeeSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { bootcampId, memberId } = result.data

  const bootcamp = await prisma.bootcamp.findUnique({
    where: { id: bootcampId },
    include: { attendees: true },
  })

  if (!bootcamp) {
    throw new Error("Bootcamp not found")
  }

  if (bootcamp.capacity && bootcamp.attendees.length >= bootcamp.capacity) {
    throw new Error("Bootcamp is at capacity")
  }

  // Check credits
  const user = await prisma.user.findUnique({ where: { id: memberId } })
  if (!user) throw new Error("User not found")
  if ((user.credits ?? 0) < 1) throw new Error("Insufficient credits to register for bootcamp")

  // Consume credit
  await prisma.user.update({ where: { id: memberId }, data: { credits: { decrement: 1 } } })

  return prisma.bootcampAttendee.create({
    data: {
      bootcampId,
      userId: memberId,
    },
  })
}

export async function removeBootcampAttendee(input: z.infer<typeof attendeeSchema>) {
  await requireCoach()

  const result = attendeeSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { bootcampId, memberId } = result.data

  // Refund credit if bootcamp not started yet
  const bootcamp = await prisma.bootcamp.findUnique({ where: { id: bootcampId } })
  if (bootcamp && new Date(bootcamp.startTime) > new Date()) {
    await prisma.user.update({ where: { id: memberId }, data: { credits: { increment: 1 } } })
  }

  return prisma.bootcampAttendee.delete({
    where: { bootcampId_userId: { bootcampId, userId: memberId } },
  })
}

// Unified event fetcher for calendar (appointments + bootcamps)
export async function getUnifiedEvents({ userId, from, to }: { userId: number, from: Date, to: Date }) {
  // Appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      startTime: { gte: from },
      endTime: { lte: to },
    },
  })
  // Bootcamps (as attendee)
  const bootcamps = await prisma.bootcampAttendee.findMany({
    where: {
      userId,
      bootcamp: {
        startTime: { gte: from },
        endTime: { lte: to },
      },
    },
    include: { bootcamp: true },
  })
  return {
    appointments,
    bootcamps: bootcamps.map((b) => b.bootcamp),
  }
}
