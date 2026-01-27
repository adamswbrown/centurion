"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { ResponseStatus, MembershipStatus } from "@prisma/client"

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

// Get all questionnaires for coach's cohorts
export async function getAllQuestionnaires() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only coaches/admins can view questionnaires
  if (session.user.role === "CLIENT") {
    throw new Error("Forbidden: only coaches can view questionnaires")
  }

  // Get all cohorts for this coach
  const coachMemberships = await prisma.coachCohortMembership.findMany({
    where: { coachId: Number(session.user.id) },
    select: { cohortId: true },
  })

  const cohortIds = coachMemberships.map((m) => m.cohortId)

  if (cohortIds.length === 0) {
    return []
  }

  return prisma.questionnaireBundle.findMany({
    where: {
      cohortId: { in: cohortIds },
    },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
    orderBy: [{ cohortId: "asc" }, { weekNumber: "asc" }],
  })
}

// Admin function to get all questionnaire bundles
export async function getAllQuestionnaireBundlesAdmin() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only admins can view all bundles
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: only admins can view all questionnaire bundles")
  }

  return prisma.questionnaireBundle.findMany({
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
          startDate: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
    orderBy: [{ cohortId: "asc" }, { weekNumber: "asc" }],
  })
}

export async function deleteQuestionnaireBundle(cohortId: number, weekNumber: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only admins can delete bundles
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: only admins can delete questionnaire bundles")
  }

  // Check if bundle exists
  const bundle = await prisma.questionnaireBundle.findUnique({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  })

  if (!bundle) {
    throw new Error("Questionnaire bundle not found")
  }

  // Warn if there are responses
  if (bundle._count.responses > 0) {
    throw new Error(
      `Cannot delete: ${bundle._count.responses} response(s) exist for this questionnaire. Delete responses first.`
    )
  }

  await prisma.questionnaireBundle.delete({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
  })

  return { success: true }
}

// Get or create questionnaire bundle for a cohort/week
export async function getOrCreateQuestionnaireBundle(cohortId: number, weekNumber: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only admins can create bundles
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: only admins can manage questionnaire bundles")
  }

  // Try to find existing
  let bundle = await prisma.questionnaireBundle.findUnique({
    where: {
      cohortId_weekNumber: {
        cohortId,
        weekNumber,
      },
    },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // If not found, create with default template
  if (!bundle) {
    const { DEFAULT_TEMPLATES } = await import("@/lib/default-questionnaire-templates")
    const weekKey = `week${weekNumber}` as keyof typeof DEFAULT_TEMPLATES
    const defaultQuestions = DEFAULT_TEMPLATES[weekKey] || DEFAULT_TEMPLATES.week1

    bundle = await prisma.questionnaireBundle.create({
      data: {
        cohortId,
        weekNumber,
        questions: defaultQuestions,
      },
      include: {
        cohort: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  return bundle
}

/**
 * Per-member questionnaire completion status for coach dashboard.
 */
export interface QuestionnaireStatusRow {
  memberId: number
  memberName: string | null
  memberEmail: string
  cohortName: string
  weekNumber: number
  status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"
  submittedAt: Date | null
  responseCount: number
}

export async function getQuestionnaireStatusForCoach(
  cohortId?: number,
  weekNumber?: number
): Promise<QuestionnaireStatusRow[]> {
  const user = await requireCoach()
  const isAdmin = user.role === "ADMIN"

  // Get cohorts the coach can see
  let cohortIds: number[]
  if (cohortId) {
    cohortIds = [cohortId]
  } else if (isAdmin) {
    const allCohorts = await prisma.cohort.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    })
    cohortIds = allCohorts.map((c) => c.id)
  } else {
    const coachCohorts = await prisma.coachCohortMembership.findMany({
      where: { coachId: Number(user.id) },
      select: { cohortId: true },
    })
    cohortIds = coachCohorts.map((c) => c.cohortId)
  }

  if (cohortIds.length === 0) return []

  // Get active bundles for these cohorts
  const bundles = await prisma.questionnaireBundle.findMany({
    where: {
      cohortId: { in: cohortIds },
      isActive: true,
      ...(weekNumber ? { weekNumber } : {}),
    },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
          members: {
            where: { status: MembershipStatus.ACTIVE },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      responses: {
        select: {
          userId: true,
          status: true,
          updatedAt: true,
          responses: true,
        },
      },
    },
    orderBy: [{ cohortId: "asc" }, { weekNumber: "desc" }],
  })

  const rows: QuestionnaireStatusRow[] = []

  for (const bundle of bundles) {
    const responseMap = new Map(
      bundle.responses.map((r) => [r.userId, r])
    )

    for (const membership of bundle.cohort.members) {
      const response = responseMap.get(membership.user.id)
      const responseData = response?.responses as Record<string, unknown> | null

      rows.push({
        memberId: membership.user.id,
        memberName: membership.user.name,
        memberEmail: membership.user.email,
        cohortName: bundle.cohort.name,
        weekNumber: bundle.weekNumber,
        status: response
          ? (response.status as "COMPLETED" | "IN_PROGRESS")
          : "NOT_STARTED",
        submittedAt: response?.updatedAt || null,
        responseCount: responseData ? Object.keys(responseData).length : 0,
      })
    }
  }

  return rows
}
