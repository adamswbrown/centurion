"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit-log"

const allocateCreditsSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(),
  reason: z.string().min(1, "Reason is required").max(200),
  expiryDate: z.string().optional().nullable(),
})

export type AllocateCreditsInput = z.infer<typeof allocateCreditsSchema>

export interface CreditTransaction {
  id: number
  userId: number
  amount: number
  reason: string
  createdAt: Date
  expiresAt: Date | null
  createdById: number
  createdBy: {
    name: string | null
    email: string
  }
}

/**
 * Allocate credits to a user (add or deduct)
 * Positive amount = add credits
 * Negative amount = deduct credits
 */
export async function allocateCredits(input: AllocateCreditsInput) {
  const session = await requireAdmin()

  const result = allocateCreditsSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { userId, amount, reason, expiryDate } = result.data
  const actorId = Number.parseInt(session.id, 10)

  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, name: true, email: true },
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Check if deducting would result in negative balance
  const newBalance = user.credits + amount
  if (newBalance < 0) {
    throw new Error(`Cannot deduct ${Math.abs(amount)} credits. User only has ${user.credits} credits.`)
  }

  // Create transaction record and update user balance in a transaction
  const [transaction, updatedUser] = await prisma.$transaction([
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        reason,
        expiresAt: expiryDate ? new Date(expiryDate) : null,
        createdById: actorId,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    }),
  ])

  // Audit log
  await logAuditEvent({
    action: amount > 0 ? "ALLOCATE_CREDITS" : "DEDUCT_CREDITS",
    actorId,
    targetId: userId,
    targetType: "User",
    details: {
      amount,
      reason,
      previousBalance: user.credits,
      newBalance,
      expiryDate,
    },
  })

  return {
    transaction,
    newBalance: updatedUser.credits,
  }
}

/**
 * Get credit transaction history for a user
 */
export async function getCreditsHistory(userId: number): Promise<CreditTransaction[]> {
  await requireAdmin()

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return transactions
}

/**
 * Get credit summary for a user
 */
export async function getCreditsSummary(userId: number) {
  await requireAdmin()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Get total allocated and used
  const stats = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: {
      amount: true,
    },
  })

  // Get recent transactions
  const recentTransactions = await prisma.creditTransaction.findMany({
    where: { userId },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return {
    currentBalance: user.credits,
    totalAllocated: stats._sum.amount || 0,
    recentTransactions,
  }
}
