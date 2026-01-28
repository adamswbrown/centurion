"use server"

import { MembershipPlanType, MembershipTierStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { stripe, ensureStripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { addDays } from "date-fns"
import { z } from "zod"

// Schema for validating webhook metadata
const membershipMetadataSchema = z.object({
  type: z.literal("membership"),
  planId: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()),
  userId: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()),
  planType: z.nativeEnum(MembershipPlanType),
})

// ============================================
// CHECKOUT SESSION CREATION
// ============================================

export async function createMembershipCheckoutSession(planId: number) {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)
  const stripeClient = ensureStripe()

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) throw new Error("Plan not found")
  if (!plan.isActive) throw new Error("Plan is no longer available")
  if (!plan.purchasableByClient) throw new Error("This plan is not available for self-purchase")

  if (!plan.allowRepeatPurchase) {
    const existing = await prisma.userMembership.findFirst({
      where: { userId, planId },
    })
    if (existing) throw new Error("You have already purchased this plan")
  }

  // Ensure Stripe Product and Price exist
  let stripePriceId = plan.stripePriceId

  if (!stripePriceId) {
    const { priceId, productId } = await createStripeProductAndPrice(plan)
    stripePriceId = priceId

    await prisma.membershipPlan.update({
      where: { id: planId },
      data: { stripeProductId: productId, stripePriceId: priceId },
    })
  }

  const metadata = {
    type: "membership",
    planId: planId.toString(),
    userId: userId.toString(),
    planType: plan.type,
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  if (plan.type === MembershipPlanType.RECURRING) {
    const checkoutSession = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${baseUrl}/client/membership?success=true`,
      cancel_url: `${baseUrl}/client/membership/plans?cancelled=true`,
    })

    return { url: checkoutSession.url }
  }

  // PACK or PREPAID — one-time payment
  const checkoutSession = await stripeClient.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata,
    success_url: `${baseUrl}/client/membership?success=true`,
    cancel_url: `${baseUrl}/client/membership/plans?cancelled=true`,
  })

  return { url: checkoutSession.url }
}

// ============================================
// STRIPE PRODUCT/PRICE CREATION
// ============================================

async function createStripeProductAndPrice(plan: {
  id: number
  name: string
  description: string | null
  type: MembershipPlanType
  monthlyPrice: unknown
  packPrice: unknown
  prepaidPrice: unknown
}) {
  const stripeClient = ensureStripe()

  const product = await stripeClient.products.create({
    name: plan.name,
    description: plan.description || undefined,
    metadata: { planId: plan.id.toString(), planType: plan.type },
  })

  let priceParams: Record<string, unknown> = {
    product: product.id,
    currency: "gbp",
    metadata: { planId: plan.id.toString() },
  }

  if (plan.type === MembershipPlanType.RECURRING) {
    const amount = Math.round(Number(plan.monthlyPrice) * 100)
    priceParams = {
      ...priceParams,
      unit_amount: amount,
      recurring: { interval: "month" as const },
    }
  } else if (plan.type === MembershipPlanType.PACK) {
    const amount = Math.round(Number(plan.packPrice) * 100)
    priceParams = { ...priceParams, unit_amount: amount }
  } else {
    const amount = Math.round(Number(plan.prepaidPrice) * 100)
    priceParams = { ...priceParams, unit_amount: amount }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const price = await stripeClient.prices.create(priceParams as any)

  return { productId: product.id, priceId: price.id }
}

// ============================================
// ADMIN STRIPE SYNC
// ============================================

export async function syncPlanToStripe(planId: number) {
  await requireAdmin()
  const stripeClient = ensureStripe()

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) throw new Error("Plan not found")

  const { productId, priceId } = await createStripeProductAndPrice(plan)

  await prisma.membershipPlan.update({
    where: { id: planId },
    data: { stripeProductId: productId, stripePriceId: priceId },
  })

  revalidatePath("/admin/memberships")
  return { productId, priceId }
}

export async function pauseStripeSubscription(membershipId: number) {
  await requireAdmin()
  const stripeClient = ensureStripe()

  const membership = await prisma.userMembership.findUnique({
    where: { id: membershipId },
  })

  if (!membership?.stripeSubscriptionId) {
    throw new Error("No Stripe subscription found for this membership")
  }

  await stripeClient.subscriptions.update(membership.stripeSubscriptionId, {
    pause_collection: { behavior: "void" },
  })

  await prisma.userMembership.update({
    where: { id: membershipId },
    data: { status: MembershipTierStatus.PAUSED },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")
}

export async function resumeStripeSubscription(membershipId: number) {
  await requireAdmin()
  const stripeClient = ensureStripe()

  const membership = await prisma.userMembership.findUnique({
    where: { id: membershipId },
  })

  if (!membership?.stripeSubscriptionId) {
    throw new Error("No Stripe subscription found for this membership")
  }

  await stripeClient.subscriptions.update(membership.stripeSubscriptionId, {
    pause_collection: "",
  })

  await prisma.userMembership.update({
    where: { id: membershipId },
    data: { status: MembershipTierStatus.ACTIVE },
  })

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")
}

export async function cancelStripeSubscription(
  membershipId: number,
  atPeriodEnd: boolean = true
) {
  await requireAdmin()
  const stripeClient = ensureStripe()

  const membership = await prisma.userMembership.findUnique({
    where: { id: membershipId },
  })

  if (!membership?.stripeSubscriptionId) {
    throw new Error("No Stripe subscription found for this membership")
  }

  if (atPeriodEnd) {
    await stripeClient.subscriptions.update(membership.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    await stripeClient.subscriptions.cancel(membership.stripeSubscriptionId)
  }

  if (!atPeriodEnd) {
    await prisma.userMembership.update({
      where: { id: membershipId },
      data: {
        status: MembershipTierStatus.CANCELLED,
        endDate: new Date(),
      },
    })
  }

  revalidatePath("/admin/memberships")
  revalidatePath("/client/membership")
}

// ============================================
// WEBHOOK HANDLERS (called from API route)
// ============================================

export async function handleCheckoutCompleted(
  metadata: Record<string, string>,
  stripeCheckoutSessionId: string
) {
  if (metadata.type !== "membership") return

  const parsed = membershipMetadataSchema.safeParse(metadata)
  if (!parsed.success) {
    console.error("handleCheckoutCompleted: Invalid metadata", parsed.error.flatten())
    return
  }

  const { planId, userId, planType } = parsed.data

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) {
    console.error(`handleCheckoutCompleted: Plan ${planId} not found`)
    return
  }

  // Only handle PACK and PREPAID here (RECURRING handled by subscription.created)
  if (planType === MembershipPlanType.RECURRING) return

  const endDate =
    planType === MembershipPlanType.PREPAID && plan.durationDays
      ? addDays(new Date(), plan.durationDays)
      : null

  await prisma.userMembership.create({
    data: {
      userId,
      planId,
      startDate: new Date(),
      endDate,
      status: MembershipTierStatus.ACTIVE,
      sessionsRemaining:
        planType === MembershipPlanType.PACK ? plan.totalSessions : null,
      stripeCheckoutSessionId,
    },
  })
}

export async function handleSubscriptionCreated(
  subscriptionId: string,
  metadata: Record<string, string>
) {
  if (metadata.type !== "membership") return

  const parsed = membershipMetadataSchema.safeParse(metadata)
  if (!parsed.success) {
    console.error("handleSubscriptionCreated: Invalid metadata", parsed.error.flatten())
    return
  }

  const { planId, userId } = parsed.data

  await prisma.userMembership.create({
    data: {
      userId,
      planId,
      startDate: new Date(),
      status: MembershipTierStatus.ACTIVE,
      stripeSubscriptionId: subscriptionId,
    },
  })
}

export async function handleSubscriptionUpdated(
  subscriptionId: string,
  status: string,
  cancelAtPeriodEnd: boolean
) {
  const membership = await prisma.userMembership.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!membership) return

  let newStatus: MembershipTierStatus = membership.status

  if (status === "active" && !cancelAtPeriodEnd) {
    newStatus = MembershipTierStatus.ACTIVE
  } else if (status === "paused") {
    newStatus = MembershipTierStatus.PAUSED
  } else if (status === "canceled" || status === "unpaid") {
    newStatus = MembershipTierStatus.CANCELLED
  }

  await prisma.userMembership.update({
    where: { id: membership.id },
    data: { status: newStatus },
  })
}

export async function handleSubscriptionDeleted(subscriptionId: string) {
  const membership = await prisma.userMembership.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!membership) return

  await prisma.userMembership.update({
    where: { id: membership.id },
    data: {
      status: MembershipTierStatus.CANCELLED,
      endDate: new Date(),
    },
  })
}

export async function handleInvoicePaid(subscriptionId: string | null) {
  if (!subscriptionId) return

  // Confirm continued access
  const membership = await prisma.userMembership.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (membership && membership.status !== MembershipTierStatus.ACTIVE) {
    await prisma.userMembership.update({
      where: { id: membership.id },
      data: { status: MembershipTierStatus.ACTIVE },
    })
  }
}

export async function handleInvoicePaymentFailed(subscriptionId: string | null) {
  if (!subscriptionId) return

  const membership = await prisma.userMembership.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!membership) return

  // Pause membership on payment failure
  await prisma.userMembership.update({
    where: { id: membership.id },
    data: { status: MembershipTierStatus.PAUSED },
  })
}
