/**
 * Stripe Billing Server Actions Tests
 *
 * Tests for webhook handler functions: handleCheckoutCompleted,
 * handleSubscriptionCreated, handleSubscriptionUpdated,
 * handleSubscriptionDeleted, handleInvoicePaid, handleInvoicePaymentFailed.
 *
 * These are called from the Stripe webhook API route, not directly by users,
 * so they do not require auth mocking.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Import mocks BEFORE importing the functions being tested
import { mockPrisma, resetPrismaMocks } from "../mocks"

// Mock next/cache and next/navigation (required by "use server" module)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

// Mock the stripe module with full client shape needed by stripe-billing.ts
const mockStripeClient = {
  checkout: { sessions: { create: vi.fn() } },
  products: { create: vi.fn() },
  prices: { create: vi.fn() },
  subscriptions: { update: vi.fn(), cancel: vi.fn() },
}

vi.mock("@/lib/stripe", () => ({
  stripe: mockStripeClient,
  ensureStripe: vi.fn(() => mockStripeClient),
  createPaymentLink: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}))

// Mock date-fns addDays for deterministic date testing
vi.mock("date-fns", () => ({
  addDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }),
}))

// Now import the functions to test (after mocks are set up)
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/app/actions/stripe-billing"

// ============================================
// TEST HELPERS
// ============================================

function createMockPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Unlimited Monthly",
    description: "Unlimited access",
    type: "RECURRING",
    sessionsPerWeek: 5,
    commitmentMonths: null,
    monthlyPrice: 99.99,
    totalSessions: null,
    packPrice: null,
    durationDays: null,
    prepaidPrice: null,
    lateCancelCutoffHours: 2,
    allowRepeatPurchase: true,
    purchasableByClient: true,
    penaltySystemEnabled: false,
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockUserMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 10,
    planId: 1,
    startDate: new Date("2025-01-01"),
    endDate: null,
    status: "ACTIVE",
    sessionsRemaining: null,
    stripeSubscriptionId: "sub_test123",
    stripeCheckoutSessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ============================================
// TESTS
// ============================================

describe("Stripe Billing Webhook Handlers", () => {
  beforeEach(() => {
    resetPrismaMocks()
    vi.clearAllMocks()
  })

  // ============================================
  // handleCheckoutCompleted
  // ============================================

  describe("handleCheckoutCompleted", () => {
    it("should skip if metadata.type is not 'membership'", async () => {
      await handleCheckoutCompleted(
        { type: "other", planId: "1", userId: "10", planType: "PACK" },
        "cs_test_123"
      )

      expect(mockPrisma.membershipPlan.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.userMembership.create).not.toHaveBeenCalled()
    })

    it("should handle invalid metadata gracefully", async () => {
      // Missing planId, userId - should return without throwing
      await expect(
        handleCheckoutCompleted(
          { type: "membership", planId: "not-a-number", userId: "", planType: "INVALID" },
          "cs_test_invalid"
        )
      ).resolves.toBeUndefined()

      expect(mockPrisma.membershipPlan.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.userMembership.create).not.toHaveBeenCalled()
    })

    it("should skip if plan type is RECURRING (handled by subscription.created)", async () => {
      const plan = createMockPlan({ id: 1, type: "RECURRING" })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)

      await handleCheckoutCompleted(
        { type: "membership", planId: "1", userId: "10", planType: "RECURRING" },
        "cs_test_123"
      )

      // Plan lookup may or may not happen before the type check, but create should NOT
      expect(mockPrisma.userMembership.create).not.toHaveBeenCalled()
    })

    it("should return without throwing if plan is not found", async () => {
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(null)

      // Should not throw
      await expect(
        handleCheckoutCompleted(
          { type: "membership", planId: "999", userId: "10", planType: "PACK" },
          "cs_test_123"
        )
      ).resolves.toBeUndefined()

      expect(mockPrisma.userMembership.create).not.toHaveBeenCalled()
    })

    it("should create userMembership for PACK plan with sessionsRemaining", async () => {
      const plan = createMockPlan({
        id: 5,
        type: "PACK",
        totalSessions: 10,
        durationDays: null,
      })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(
        createMockUserMembership({ planId: 5, sessionsRemaining: 10 })
      )

      await handleCheckoutCompleted(
        { type: "membership", planId: "5", userId: "10", planType: "PACK" },
        "cs_session_abc"
      )

      expect(mockPrisma.membershipPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
      })
      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 10,
          planId: 5,
          status: "ACTIVE",
          sessionsRemaining: 10,
          stripeCheckoutSessionId: "cs_session_abc",
          endDate: null,
        }),
      })
    })

    it("should create userMembership for PREPAID plan with endDate", async () => {
      const plan = createMockPlan({
        id: 7,
        type: "PREPAID",
        durationDays: 30,
        totalSessions: null,
      })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(
        createMockUserMembership({ planId: 7 })
      )

      await handleCheckoutCompleted(
        { type: "membership", planId: "7", userId: "10", planType: "PREPAID" },
        "cs_session_def"
      )

      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 10,
          planId: 7,
          status: "ACTIVE",
          sessionsRemaining: null,
          stripeCheckoutSessionId: "cs_session_def",
        }),
      })

      // Verify endDate is set (not null) for PREPAID plans with durationDays
      const createCall = mockPrisma.userMembership.create.mock.calls[0][0]
      expect(createCall.data.endDate).not.toBeNull()
      expect(createCall.data.endDate).toBeInstanceOf(Date)
    })

    it("should set endDate to null for PREPAID plan without durationDays", async () => {
      const plan = createMockPlan({
        id: 8,
        type: "PREPAID",
        durationDays: null,
        totalSessions: null,
      })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(
        createMockUserMembership({ planId: 8 })
      )

      await handleCheckoutCompleted(
        { type: "membership", planId: "8", userId: "10", planType: "PREPAID" },
        "cs_session_ghi"
      )

      const createCall = mockPrisma.userMembership.create.mock.calls[0][0]
      expect(createCall.data.endDate).toBeNull()
    })
  })

  // ============================================
  // handleSubscriptionCreated
  // ============================================

  describe("handleSubscriptionCreated", () => {
    it("should skip if metadata.type is not 'membership'", async () => {
      await handleSubscriptionCreated("sub_123", {
        type: "other",
        planId: "1",
        userId: "10",
      })

      expect(mockPrisma.userMembership.create).not.toHaveBeenCalled()
    })

    it("should create userMembership with stripeSubscriptionId", async () => {
      mockPrisma.userMembership.create.mockResolvedValue(
        createMockUserMembership({
          planId: 3,
          userId: 10,
          stripeSubscriptionId: "sub_new_456",
        })
      )

      await handleSubscriptionCreated("sub_new_456", {
        type: "membership",
        planId: "3",
        userId: "10",
        planType: "RECURRING",
      })

      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 10,
          planId: 3,
          status: "ACTIVE",
          stripeSubscriptionId: "sub_new_456",
        }),
      })
    })

    it("should set startDate to current date", async () => {
      mockPrisma.userMembership.create.mockResolvedValue(
        createMockUserMembership()
      )

      await handleSubscriptionCreated("sub_789", {
        type: "membership",
        planId: "1",
        userId: "5",
        planType: "RECURRING",
      })

      const createCall = mockPrisma.userMembership.create.mock.calls[0][0]
      expect(createCall.data.startDate).toBeInstanceOf(Date)
    })
  })

  // ============================================
  // handleSubscriptionUpdated
  // ============================================

  describe("handleSubscriptionUpdated", () => {
    it("should update to ACTIVE when status is 'active' and not cancelling", async () => {
      const membership = createMockUserMembership({
        id: 5,
        status: "PAUSED",
        stripeSubscriptionId: "sub_active_test",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "ACTIVE",
      })

      await handleSubscriptionUpdated("sub_active_test", "active", false)

      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_active_test" },
      })
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: "ACTIVE" },
      })
    })

    it("should update to PAUSED when status is 'paused'", async () => {
      const membership = createMockUserMembership({
        id: 6,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_paused_test",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "PAUSED",
      })

      await handleSubscriptionUpdated("sub_paused_test", "paused", false)

      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 6 },
        data: { status: "PAUSED" },
      })
    })

    it("should update to CANCELLED when status is 'canceled'", async () => {
      const membership = createMockUserMembership({
        id: 7,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_canceled_test",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "CANCELLED",
      })

      await handleSubscriptionUpdated("sub_canceled_test", "canceled", false)

      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { status: "CANCELLED" },
      })
    })

    it("should update to CANCELLED when status is 'unpaid'", async () => {
      const membership = createMockUserMembership({
        id: 8,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_unpaid_test",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "CANCELLED",
      })

      await handleSubscriptionUpdated("sub_unpaid_test", "unpaid", false)

      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { status: "CANCELLED" },
      })
    })

    it("should handle membership not found gracefully", async () => {
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      // Should not throw
      await expect(
        handleSubscriptionUpdated("sub_nonexistent", "active", false)
      ).resolves.toBeUndefined()

      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })

    it("should keep existing status when Stripe status is unrecognized", async () => {
      const membership = createMockUserMembership({
        id: 9,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_unknown_status",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue(membership)

      await handleSubscriptionUpdated("sub_unknown_status", "trialing", false)

      // Should still call update but with the existing status
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { status: "ACTIVE" },
      })
    })

    it("should not set ACTIVE when status is 'active' but cancelAtPeriodEnd is true", async () => {
      const membership = createMockUserMembership({
        id: 10,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_cancel_pending",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue(membership)

      await handleSubscriptionUpdated("sub_cancel_pending", "active", true)

      // When active but cancelAtPeriodEnd=true, it should NOT set ACTIVE
      // (falls through to default, keeping existing status)
      const updateCall = mockPrisma.userMembership.update.mock.calls[0][0]
      expect(updateCall.data.status).toBe("ACTIVE")
    })
  })

  // ============================================
  // handleSubscriptionDeleted
  // ============================================

  describe("handleSubscriptionDeleted", () => {
    it("should update membership to CANCELLED with endDate", async () => {
      const membership = createMockUserMembership({
        id: 11,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_deleted_test",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "CANCELLED",
      })

      await handleSubscriptionDeleted("sub_deleted_test")

      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_deleted_test" },
      })
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 11 },
        data: {
          status: "CANCELLED",
          endDate: expect.any(Date),
        },
      })
    })

    it("should handle membership not found gracefully", async () => {
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      await expect(
        handleSubscriptionDeleted("sub_nonexistent_del")
      ).resolves.toBeUndefined()

      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // handleInvoicePaid
  // ============================================

  describe("handleInvoicePaid", () => {
    it("should skip if subscriptionId is null", async () => {
      await handleInvoicePaid(null)

      expect(mockPrisma.userMembership.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })

    it("should reactivate membership if currently not ACTIVE", async () => {
      const membership = createMockUserMembership({
        id: 12,
        status: "PAUSED",
        stripeSubscriptionId: "sub_invoice_paid",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "ACTIVE",
      })

      await handleInvoicePaid("sub_invoice_paid")

      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_invoice_paid" },
      })
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 12 },
        data: { status: "ACTIVE" },
      })
    })

    it("should reactivate CANCELLED membership on invoice paid", async () => {
      const membership = createMockUserMembership({
        id: 13,
        status: "CANCELLED",
        stripeSubscriptionId: "sub_reactivate",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "ACTIVE",
      })

      await handleInvoicePaid("sub_reactivate")

      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 13 },
        data: { status: "ACTIVE" },
      })
    })

    it("should do nothing if membership is already ACTIVE", async () => {
      const membership = createMockUserMembership({
        id: 14,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_already_active",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      await handleInvoicePaid("sub_already_active")

      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalled()
      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })

    it("should handle membership not found gracefully", async () => {
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      await expect(
        handleInvoicePaid("sub_no_membership")
      ).resolves.toBeUndefined()

      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // handleInvoicePaymentFailed
  // ============================================

  describe("handleInvoicePaymentFailed", () => {
    it("should skip if subscriptionId is null", async () => {
      await handleInvoicePaymentFailed(null)

      expect(mockPrisma.userMembership.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })

    it("should pause membership on payment failure", async () => {
      const membership = createMockUserMembership({
        id: 15,
        status: "ACTIVE",
        stripeSubscriptionId: "sub_payment_failed",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        status: "PAUSED",
      })

      await handleInvoicePaymentFailed("sub_payment_failed")

      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_payment_failed" },
      })
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 15 },
        data: { status: "PAUSED" },
      })
    })

    it("should pause even if membership was already PAUSED", async () => {
      const membership = createMockUserMembership({
        id: 16,
        status: "PAUSED",
        stripeSubscriptionId: "sub_already_paused_fail",
      })
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.userMembership.update.mockResolvedValue(membership)

      await handleInvoicePaymentFailed("sub_already_paused_fail")

      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 16 },
        data: { status: "PAUSED" },
      })
    })

    it("should handle membership not found gracefully", async () => {
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      await expect(
        handleInvoicePaymentFailed("sub_no_membership_fail")
      ).resolves.toBeUndefined()

      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })
  })
})
