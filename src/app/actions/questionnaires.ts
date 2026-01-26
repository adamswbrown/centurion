"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { ResponseStatus } from "@prisma/client"

const createBundleSchema = z.object({
  cohortId: z.number().int().positive(),
  weekNumber: z.number().int().min(1).max(12),
  questions: z.any(), // SurveyJS JSON format
})

const upsertResponseSchema = z.object({
  bundleId: z.number().int().positive(),
  weekNumber: z.number().int().min(1).max(12),
  responses: z.any(), // SurveyJS response format
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
})

export type CreateBundleInput = z.infer<typeof createBundleSchema>
export type UpsertResponseInput = z.infer<typeof upsertResponseSchema>

// Helper: calculate current week from cohort start date
function getCurrentWeek(startDate: Date): number {
  const start = new Date(startDate)
  const today = new Date()
  start.setUTCHours(0, 0, 0, 0)
  today.setUTCHours(0, 0, 0, 0)
  const diffMs = today.getTime() - start.getTime()
  if (diffMs < 0) return 0
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

export async function getQuestionnaireBundle(cohortId: number, weekNumber: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  return prisma.questionnaireBundle.findUnique({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
  })
}

export async function getQuestionnaireBundles(cohortId: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  return prisma.questionnaireBundle.findMany({
    where: { cohortId },
    orderBy: { weekNumber: "asc" },
  })
}

export async function createQuestionnaireBundle(input: CreateBundleInput) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only admins can create bundles
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: only admins can create questionnaire bundles")
  }

  const result = createBundleSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { cohortId, weekNumber, questions } = result.data

  return prisma.questionnaireBundle.create({
    data: {
      cohortId,
      weekNumber,
      questions,
    },
  })
}

export async function updateQuestionnaireBundle(
  cohortId: number,
  weekNumber: number,
  questions: any
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only admins can update bundles
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: only admins can update questionnaire bundles")
  }

  return prisma.questionnaireBundle.update({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
    data: { questions },
  })
}

export async function getQuestionnaireResponse(cohortId: number, weekNumber: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Verify user is member of cohort
  const membership = await prisma.cohortMembership.findUnique({
    where: {
      cohortId_userId: {
        cohortId,
        userId: Number(session.user.id),
      },
    },
    include: {
      cohort: {
        select: { startDate: true },
      },
    },
  })

  if (!membership) {
    throw new Error("Not a member of this cohort")
  }

  // Check if questionnaire is available for this week
  if (membership.cohort.startDate) {
    const currentWeek = getCurrentWeek(membership.cohort.startDate)
    if (weekNumber > currentWeek) {
      throw new Error("Questionnaire not available yet")
    }
  }

  // Get the bundle
  const bundle = await prisma.questionnaireBundle.findUnique({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
  })

  if (!bundle) {
    return null
  }

  // Get user's response
  const response = await prisma.weeklyQuestionnaireResponse.findUnique({
    where: {
      userId_bundleId: {
        userId: Number(session.user.id),
        bundleId: bundle.id,
      },
    },
  })

  return {
    bundle,
    response,
    currentWeek: membership.cohort.startDate
      ? getCurrentWeek(membership.cohort.startDate)
      : weekNumber,
  }
}

export async function upsertQuestionnaireResponse(input: UpsertResponseInput) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const result = upsertResponseSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { bundleId, weekNumber, responses, status } = result.data

  // Get bundle to find cohortId
  const bundle = await prisma.questionnaireBundle.findUnique({
    where: { id: bundleId },
    include: {
      cohort: {
        select: { startDate: true },
      },
    },
  })

  if (!bundle) {
    throw new Error("Questionnaire not found")
  }

  // Verify user is member
  const membership = await prisma.cohortMembership.findUnique({
    where: {
      cohortId_userId: {
        cohortId: bundle.cohortId,
        userId: Number(session.user.id),
      },
    },
  })

  if (!membership) {
    throw new Error("Not a member of this cohort")
  }

  // Check if week is available
  if (bundle.cohort.startDate) {
    const currentWeek = getCurrentWeek(bundle.cohort.startDate)
    if (weekNumber > currentWeek) {
      throw new Error("Questionnaire not available yet")
    }
    if (weekNumber < currentWeek) {
      throw new Error("Questionnaire is locked for past weeks")
    }
  }

  // Check if already completed
  const existing = await prisma.weeklyQuestionnaireResponse.findUnique({
    where: {
      userId_bundleId: {
        userId: Number(session.user.id),
        bundleId,
      },
    },
  })

  if (existing?.status === ResponseStatus.COMPLETED) {
    throw new Error("Questionnaire is locked after completion")
  }

  const finalStatus = status || ResponseStatus.IN_PROGRESS

  return prisma.weeklyQuestionnaireResponse.upsert({
    where: {
      userId_bundleId: {
        userId: Number(session.user.id),
        bundleId,
      },
    },
    create: {
      userId: Number(session.user.id),
      bundleId,
      weekNumber,
      responses,
      status: finalStatus,
    },
    update: {
      responses,
      status: finalStatus,
    },
  })
}

export async function getWeeklyResponses(cohortId: number, weekNumber: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only coaches/admins can view all responses
  if (session.user.role === "CLIENT") {
    throw new Error("Forbidden: only coaches can view member responses")
  }

  const bundle = await prisma.questionnaireBundle.findUnique({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
    include: {
      responses: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  return bundle
}
