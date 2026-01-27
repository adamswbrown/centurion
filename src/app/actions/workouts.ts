"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import type { Prisma, WorkoutStatus } from "@prisma/client"

const createWorkoutSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable().or(z.literal("")),
  scheduledAt: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
})

const updateWorkoutSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  scheduledAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
})

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>

/**
 * Get workouts - coaches see their assigned workouts, clients see their own
 */
export async function getWorkouts(params?: {
  userId?: number
  coachId?: number
  status?: WorkoutStatus
  limit?: number
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const where: Prisma.WorkoutWhereInput = {}

  if (session.user.role === "CLIENT") {
    // Clients can only see their own workouts
    where.userId = Number(session.user.id)
  } else {
    // Coaches/admins can filter
    if (params?.userId) where.userId = params.userId
    if (params?.coachId) where.coachId = params.coachId
  }

  if (params?.status) {
    where.status = params.status
  }

  return prisma.workout.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: params?.limit || 50,
  })
}

/**
 * Get a single workout by ID
 */
export async function getWorkoutById(id: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const workout = await prisma.workout.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!workout) {
    throw new Error("Workout not found")
  }

  // Clients can only view their own workouts
  if (
    session.user.role === "CLIENT" &&
    workout.userId !== Number(session.user.id)
  ) {
    throw new Error("Forbidden")
  }

  return workout
}

/**
 * Create a workout - coach/admin assigns to a client
 */
export async function createWorkout(input: CreateWorkoutInput) {
  const user = await requireCoach()

  const result = createWorkoutSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { userId, title, description, videoUrl, scheduledAt, duration } =
    result.data

  return prisma.workout.create({
    data: {
      userId,
      coachId: Number(user.id),
      title,
      description: description || null,
      videoUrl: videoUrl || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      duration: duration || null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

/**
 * Update a workout - coaches can update any field, clients can update status only
 */
export async function updateWorkout(input: UpdateWorkoutInput) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const result = updateWorkoutSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, ...updates } = result.data

  const existing = await prisma.workout.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Workout not found")
  }

  // Clients can only update status of their own workouts
  if (session.user.role === "CLIENT") {
    if (existing.userId !== Number(session.user.id)) {
      throw new Error("Forbidden")
    }
    // Clients can only update status
    const data: Prisma.WorkoutUpdateInput = {}
    if (updates.status) {
      data.status = updates.status
      if (updates.status === "COMPLETED") {
        data.completedAt = new Date()
      }
    }
    return prisma.workout.update({ where: { id }, data })
  }

  // Coach/admin can update all fields
  const data: Prisma.WorkoutUpdateInput = {}
  if (updates.title) data.title = updates.title
  if (updates.description !== undefined)
    data.description = updates.description || null
  if (updates.videoUrl !== undefined) data.videoUrl = updates.videoUrl || null
  if (updates.status) {
    data.status = updates.status
    if (updates.status === "COMPLETED") {
      data.completedAt = new Date()
    }
  }
  if (updates.scheduledAt !== undefined) {
    data.scheduledAt = updates.scheduledAt ? new Date(updates.scheduledAt) : null
  }
  if (updates.completedAt !== undefined) {
    data.completedAt = updates.completedAt ? new Date(updates.completedAt) : null
  }
  if (updates.duration !== undefined) data.duration = updates.duration || null

  return prisma.workout.update({
    where: { id },
    data,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

/**
 * Delete a workout - coach/admin only
 */
export async function deleteWorkout(id: number) {
  await requireCoach()

  const workout = await prisma.workout.findUnique({ where: { id } })
  if (!workout) {
    throw new Error("Workout not found")
  }

  await prisma.workout.delete({ where: { id } })
  return { success: true }
}
