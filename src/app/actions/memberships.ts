"use server"

import { z } from "zod"
import { MembershipPlanType, MembershipTierStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireCoach } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { addDays } from "date-fns"

const createMembershipPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(MembershipPlanType),
  sessionsPerWeek: z.number().int().positive().optional(),
  commitmentMonths: z.number().int().positive().optional(),
  monthlyPrice: z.number().positive().optional(),
  totalSessions: z.number().int().positive().optional(),
  packPrice: z.number().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  prepaidPrice: z.number().positive().optional(),
  lateCancelCutoffHours: z.number().int().min(0).default(2),
  allowRepeatPurchase: z.boolean().default(true),
  purchasableByClient: z.boolean().default(true),
  penaltySystemEnabled: z.boolean().default(false),
  classTypeIds: z.array(z.number().int().positive()).optional(),
})

const updateMembershipPlanSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sessionsPerWeek: z.number().int().positive().optional().nullable(),
  commitmentMonths: z.number().int().positive().optional().nullable(),
  monthlyPrice: z.number().positive().optional().nullable(),
  totalSessions: z.number().int().positive().optional().nullable(),
  packPrice: z.number().positive().optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
  prepaidPrice: z.number().positive().optional().nullable(),
  lateCancelCutoffHours: z.number().int().min(0).optional(),
  allowRepeatPurchase: z.boolean().optional(),
  purchasableByClient: z.boolean().optional(),
  penaltySystemEnabled: z.boolean().optional(),
  classTypeIds: z.array(z.number().int().positive()).optional(),
})

const assignMembershipSchema = z.object({
  userId: z.number().int().positive(),
  planId: z.number().int().positive(),
  startDate: z.string().optional(),
  sessionsRemaining: z.number().int().positive().optional(),
})

export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>
export type AssignMembershipInput = z.infer<typeof assignMembershipSchema>

export async function getMembershipPlans(params?: {
  type?: MembershipPlanType
  activeOnly?: boolean
}) {
  await requireCoach()

  return prisma.membershipPlan.findMany({
    where: {
      ...(params?.type ? { type: params.type } : {}),
      ...(params?.activeOnly ? { isActive: true } : {}),
    },
    include: {
      allowances: true,
      _count: {
        select: {
          userMemberships: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

export async function getMembershipPlanById(id: number) {
  await requireCoach()

  return prisma.membershipPlan.findUnique({
    where: { id },
    include: {
      allowances: {
        include: {
          classType: true,
        },
      },
      _count: {
        select: {
          userMemberships: true,
        },
      },
    },
  })
}

export async function createMembershipPlan(input: CreateMembershipPlanInput) {
  await requireAdmin()

  const parsed = createMembershipPlanSchema.parse(input)
  const { classTypeIds, ...planData } = parsed

  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.membershipPlan.create({
      data: planData,
    })

    if (classTypeIds && classTypeIds.length > 0) {
      await tx.membershipClassTypeAllowance.createMany({
        data: classTypeIds.map((classTypeId) => ({
          membershipPlanId: plan.id,
          classTypeId,
        })),
      })
    }

    return tx.membershipPlan.findUnique({
      where: { id: plan.id },
      include: {
        allowances: {
          include: {
            classType: true,
          },
        },
      },
    })
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}

export async function updateMembershipPlan(input: UpdateMembershipPlanInput) {
  await requireAdmin()

  const parsed = updateMembershipPlanSchema.parse(input)
  const { id, classTypeIds, ...planData } = parsed

  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.membershipPlan.update({
      where: { id },
      data: planData,
    })

    if (classTypeIds !== undefined) {
      await tx.membershipClassTypeAllowance.deleteMany({
        where: { membershipPlanId: id },
      })

      if (classTypeIds.length > 0) {
        await tx.membershipClassTypeAllowance.createMany({
          data: classTypeIds.map((classTypeId) => ({
            membershipPlanId: id,
            classTypeId,
          })),
        })
      }
    }

    return tx.membershipPlan.findUnique({
      where: { id: plan.id },
      include: {
        allowances: {
          include: {
            classType: true,
          },
        },
      },
    })
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}

export async function deactivateMembershipPlan(id: number) {
  await requireAdmin()

  const result = await prisma.membershipPlan.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}

export async function assignMembership(input: AssignMembershipInput) {
  await requireAdmin()

  const parsed = assignMembershipSchema.parse(input)

  const plan = await prisma.membershipPlan.findUniqueOrThrow({
    where: { id: parsed.planId },
  })

  const startDate = parsed.startDate ? new Date(parsed.startDate) : new Date()

  let endDate: Date | null = null
  let sessionsRemaining: number | null = null

  if (plan.type === MembershipPlanType.PACK) {
    sessionsRemaining = parsed.sessionsRemaining ?? plan.totalSessions
  } else if (plan.type === MembershipPlanType.PREPAID) {
    if (plan.durationDays) {
      endDate = addDays(startDate, plan.durationDays)
    }
  }
  // RECURRING: endDate stays null (ongoing)

  const result = await prisma.userMembership.create({
    data: {
      userId: parsed.userId,
      planId: parsed.planId,
      startDate,
      endDate,
      status: MembershipTierStatus.ACTIVE,
      sessionsRemaining,
    },
    include: {
      plan: true,
    },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}

export async function getUserActiveMembership(userId: number) {
  await requireCoach()

  return prisma.userMembership.findFirst({
    where: {
      userId,
      status: MembershipTierStatus.ACTIVE,
    },
    include: {
      plan: {
        include: {
          allowances: {
            include: {
              classType: true,
            },
          },
        },
      },
    },
  })
}

export async function getUserMembershipHistory(userId: number) {
  await requireCoach()

  return prisma.userMembership.findMany({
    where: { userId },
    include: {
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function pauseMembership(membershipId: number) {
  await requireAdmin()

  const result = await prisma.userMembership.update({
    where: { id: membershipId },
    data: { status: MembershipTierStatus.PAUSED },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}

export async function resumeMembership(membershipId: number) {
  await requireAdmin()

  const result = await prisma.userMembership.update({
    where: { id: membershipId },
    data: { status: MembershipTierStatus.ACTIVE },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}

export async function cancelMembership(membershipId: number) {
  await requireAdmin()

  const result = await prisma.userMembership.update({
    where: { id: membershipId },
    data: {
      status: MembershipTierStatus.CANCELLED,
      endDate: new Date(),
    },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")

  return result
}
