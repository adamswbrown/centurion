/**
 * Memberships Server Actions Tests
 *
 * Tests for membership plan CRUD, user membership assignment,
 * status changes (pause, resume, cancel), and history retrieval.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockCoachUser,
  mockAdminUser,
  mockClientUser,
  resetAuthMocks,
} from "../mocks"

// Now import the functions to test (after mocks are set up)
import {
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deactivateMembershipPlan,
  assignMembership,
  getUserActiveMembership,
  getUserMembershipHistory,
  pauseMembership,
  resumeMembership,
  cancelMembership,
} from "@/app/actions/memberships"

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
    createdAt: new Date(),
    updatedAt: new Date(),
    allowances: [],
    _count: { userMemberships: 5 },
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
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: createMockPlan(),
    ...overrides,
  }
}

// ============================================
// TESTS
// ============================================

describe("Memberships Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()

    // Default: authenticated as admin
    setupAuthMock(mockAdminUser)

    // Re-setup $transaction mock after reset
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(mockPrisma)
      }
      return Promise.all(fn as Promise<unknown>[])
    })
  })

  // ============================================
  // getMembershipPlans
  // ============================================

  describe("getMembershipPlans", () => {
    it("should return all membership plans", async () => {
      const plans = [
        createMockPlan({ id: 1, name: "Unlimited" }),
        createMockPlan({ id: 2, name: "10 Pack", type: "PACK" }),
      ]

      mockPrisma.membershipPlan.findMany.mockResolvedValue(plans)

      const result = await getMembershipPlans()

      expect(result).toHaveLength(2)
      expect(mockPrisma.membershipPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            allowances: true,
            _count: expect.any(Object),
          }),
          orderBy: { name: "asc" },
        })
      )
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMembershipPlans()).rejects.toThrow()
    })

    it("should filter by plan type when provided", async () => {
      mockPrisma.membershipPlan.findMany.mockResolvedValue([])

      await getMembershipPlans({ type: "PACK" as const })

      expect(mockPrisma.membershipPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "PACK" }),
        })
      )
    })

    it("should filter by active only when requested", async () => {
      mockPrisma.membershipPlan.findMany.mockResolvedValue([])

      await getMembershipPlans({ activeOnly: true })

      expect(mockPrisma.membershipPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      )
    })

    it("should allow coaches to view plans", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.membershipPlan.findMany.mockResolvedValue([])

      const result = await getMembershipPlans()

      expect(result).toEqual([])
    })
  })

  // ============================================
  // getMembershipPlanById
  // ============================================

  describe("getMembershipPlanById", () => {
    it("should return a plan with allowances and counts", async () => {
      const plan = createMockPlan({
        allowances: [
          { id: 1, membershipPlanId: 1, classTypeId: 10, classType: { id: 10, name: "Yoga" } },
        ],
      })

      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)

      const result = await getMembershipPlanById(1)

      expect(result).toBeDefined()
      expect(result!.name).toBe("Unlimited Monthly")
      expect(mockPrisma.membershipPlan.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            allowances: expect.objectContaining({
              include: { classType: true },
            }),
          }),
        })
      )
    })

    it("should return null if plan not found", async () => {
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(null)

      const result = await getMembershipPlanById(999)

      expect(result).toBeNull()
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMembershipPlanById(1)).rejects.toThrow()
    })
  })

  // ============================================
  // createMembershipPlan
  // ============================================

  describe("createMembershipPlan", () => {
    it("should create a RECURRING plan successfully", async () => {
      const plan = createMockPlan()

      mockPrisma.membershipPlan.create.mockResolvedValue(plan)
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)

      const result = await createMembershipPlan({
        name: "Unlimited Monthly",
        type: "RECURRING" as const,
        sessionsPerWeek: 5,
        monthlyPrice: 99.99,
        lateCancelCutoffHours: 2,
        allowRepeatPurchase: true,
        purchasableByClient: true,
        penaltySystemEnabled: false,
      })

      expect(result).toBeDefined()
      expect(mockPrisma.membershipPlan.create).toHaveBeenCalled()
    })

    it("should create a plan with class type allowances", async () => {
      const plan = createMockPlan({
        allowances: [
          { id: 1, membershipPlanId: 1, classTypeId: 10 },
          { id: 2, membershipPlanId: 1, classTypeId: 20 },
        ],
      })

      mockPrisma.membershipPlan.create.mockResolvedValue(plan)
      mockPrisma.membershipClassTypeAllowance.createMany.mockResolvedValue({
        count: 2,
      })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)

      const result = await createMembershipPlan({
        name: "Premium Plan",
        type: "RECURRING" as const,
        sessionsPerWeek: 7,
        lateCancelCutoffHours: 2,
        allowRepeatPurchase: true,
        purchasableByClient: true,
        penaltySystemEnabled: false,
        classTypeIds: [10, 20],
      })

      expect(result).toBeDefined()
      expect(
        mockPrisma.membershipClassTypeAllowance.createMany
      ).toHaveBeenCalledWith({
        data: [
          { membershipPlanId: plan.id, classTypeId: 10 },
          { membershipPlanId: plan.id, classTypeId: 20 },
        ],
      })
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        createMembershipPlan({
          name: "Test Plan",
          type: "RECURRING" as const,
          lateCancelCutoffHours: 2,
          allowRepeatPurchase: true,
          purchasableByClient: true,
          penaltySystemEnabled: false,
        })
      ).rejects.toThrow()
    })

    it("should reject empty name", async () => {
      await expect(
        createMembershipPlan({
          name: "",
          type: "RECURRING" as const,
          lateCancelCutoffHours: 2,
          allowRepeatPurchase: true,
          purchasableByClient: true,
          penaltySystemEnabled: false,
        })
      ).rejects.toThrow()
    })

    it("should create a PACK plan", async () => {
      const plan = createMockPlan({
        type: "PACK",
        sessionsPerWeek: null,
        monthlyPrice: null,
        totalSessions: 10,
        packPrice: 250,
      })

      mockPrisma.membershipPlan.create.mockResolvedValue(plan)
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)

      const result = await createMembershipPlan({
        name: "10 Pack",
        type: "PACK" as const,
        totalSessions: 10,
        packPrice: 250,
        lateCancelCutoffHours: 2,
        allowRepeatPurchase: true,
        purchasableByClient: true,
        penaltySystemEnabled: false,
      })

      expect(result).toBeDefined()
    })

    it("should create a PREPAID plan", async () => {
      const plan = createMockPlan({
        type: "PREPAID",
        sessionsPerWeek: null,
        monthlyPrice: null,
        durationDays: 30,
        prepaidPrice: 150,
      })

      mockPrisma.membershipPlan.create.mockResolvedValue(plan)
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(plan)

      const result = await createMembershipPlan({
        name: "30-Day Pass",
        type: "PREPAID" as const,
        durationDays: 30,
        prepaidPrice: 150,
        lateCancelCutoffHours: 2,
        allowRepeatPurchase: true,
        purchasableByClient: true,
        penaltySystemEnabled: false,
      })

      expect(result).toBeDefined()
    })
  })

  // ============================================
  // updateMembershipPlan
  // ============================================

  describe("updateMembershipPlan", () => {
    it("should update plan name and fields", async () => {
      const updatedPlan = createMockPlan({ name: "Updated Plan" })

      mockPrisma.membershipPlan.update.mockResolvedValue(updatedPlan)
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(updatedPlan)

      const result = await updateMembershipPlan({
        id: 1,
        name: "Updated Plan",
      })

      expect(result).toBeDefined()
      expect(mockPrisma.membershipPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: "Updated Plan" }),
        })
      )
    })

    it("should replace class type allowances when classTypeIds provided", async () => {
      const updatedPlan = createMockPlan({
        allowances: [{ id: 3, membershipPlanId: 1, classTypeId: 30 }],
      })

      mockPrisma.membershipPlan.update.mockResolvedValue(updatedPlan)
      mockPrisma.membershipClassTypeAllowance.deleteMany.mockResolvedValue({
        count: 2,
      })
      mockPrisma.membershipClassTypeAllowance.createMany.mockResolvedValue({
        count: 1,
      })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(updatedPlan)

      await updateMembershipPlan({
        id: 1,
        classTypeIds: [30],
      })

      expect(
        mockPrisma.membershipClassTypeAllowance.deleteMany
      ).toHaveBeenCalledWith({
        where: { membershipPlanId: 1 },
      })
      expect(
        mockPrisma.membershipClassTypeAllowance.createMany
      ).toHaveBeenCalledWith({
        data: [{ membershipPlanId: 1, classTypeId: 30 }],
      })
    })

    it("should clear all allowances when classTypeIds is empty array", async () => {
      const updatedPlan = createMockPlan({ allowances: [] })

      mockPrisma.membershipPlan.update.mockResolvedValue(updatedPlan)
      mockPrisma.membershipClassTypeAllowance.deleteMany.mockResolvedValue({
        count: 2,
      })
      mockPrisma.membershipPlan.findUnique.mockResolvedValue(updatedPlan)

      await updateMembershipPlan({
        id: 1,
        classTypeIds: [],
      })

      expect(
        mockPrisma.membershipClassTypeAllowance.deleteMany
      ).toHaveBeenCalled()
      expect(
        mockPrisma.membershipClassTypeAllowance.createMany
      ).not.toHaveBeenCalled()
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        updateMembershipPlan({ id: 1, name: "Updated" })
      ).rejects.toThrow()
    })

    it("should reject invalid id", async () => {
      await expect(
        updateMembershipPlan({ id: -1, name: "Invalid" })
      ).rejects.toThrow()
    })
  })

  // ============================================
  // deactivateMembershipPlan
  // ============================================

  describe("deactivateMembershipPlan", () => {
    it("should deactivate a plan", async () => {
      const deactivatedPlan = createMockPlan({ isActive: false })

      mockPrisma.membershipPlan.update.mockResolvedValue(deactivatedPlan)

      const result = await deactivateMembershipPlan(1)

      expect(result.isActive).toBe(false)
      expect(mockPrisma.membershipPlan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      })
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(deactivateMembershipPlan(1)).rejects.toThrow()
    })
  })

  // ============================================
  // assignMembership
  // ============================================

  describe("assignMembership", () => {
    it("should assign a RECURRING membership", async () => {
      const plan = createMockPlan({ type: "RECURRING" })
      const membership = createMockUserMembership()

      mockPrisma.membershipPlan.findUniqueOrThrow.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(membership)

      const result = await assignMembership({
        userId: 10,
        planId: 1,
      })

      expect(result).toBeDefined()
      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 10,
            planId: 1,
            status: "ACTIVE",
            sessionsRemaining: null,
            endDate: null,
          }),
        })
      )
    })

    it("should assign a PACK membership with sessionsRemaining", async () => {
      const plan = createMockPlan({
        type: "PACK",
        totalSessions: 10,
      })
      const membership = createMockUserMembership({
        sessionsRemaining: 10,
        plan,
      })

      mockPrisma.membershipPlan.findUniqueOrThrow.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(membership)

      const result = await assignMembership({
        userId: 10,
        planId: 1,
      })

      expect(result).toBeDefined()
      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionsRemaining: 10,
          }),
        })
      )
    })

    it("should assign PACK with custom sessionsRemaining", async () => {
      const plan = createMockPlan({
        type: "PACK",
        totalSessions: 10,
      })
      const membership = createMockUserMembership({
        sessionsRemaining: 5,
        plan,
      })

      mockPrisma.membershipPlan.findUniqueOrThrow.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(membership)

      await assignMembership({
        userId: 10,
        planId: 1,
        sessionsRemaining: 5,
      })

      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionsRemaining: 5,
          }),
        })
      )
    })

    it("should assign a PREPAID membership with calculated endDate", async () => {
      const plan = createMockPlan({
        type: "PREPAID",
        durationDays: 30,
      })
      const membership = createMockUserMembership({ plan })

      mockPrisma.membershipPlan.findUniqueOrThrow.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(membership)

      await assignMembership({
        userId: 10,
        planId: 1,
      })

      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endDate: expect.any(Date),
          }),
        })
      )
    })

    it("should use provided startDate", async () => {
      const plan = createMockPlan({ type: "RECURRING" })
      const membership = createMockUserMembership()

      mockPrisma.membershipPlan.findUniqueOrThrow.mockResolvedValue(plan)
      mockPrisma.userMembership.create.mockResolvedValue(membership)

      await assignMembership({
        userId: 10,
        planId: 1,
        startDate: "2025-06-01",
      })

      expect(mockPrisma.userMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: new Date("2025-06-01"),
          }),
        })
      )
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        assignMembership({ userId: 10, planId: 1 })
      ).rejects.toThrow()
    })

    it("should reject invalid userId", async () => {
      await expect(
        assignMembership({ userId: -1, planId: 1 })
      ).rejects.toThrow()
    })

    it("should reject invalid planId", async () => {
      await expect(
        assignMembership({ userId: 10, planId: 0 })
      ).rejects.toThrow()
    })

    it("should throw if plan not found", async () => {
      mockPrisma.membershipPlan.findUniqueOrThrow.mockRejectedValue(
        new Error("No MembershipPlan found")
      )

      await expect(
        assignMembership({ userId: 10, planId: 999 })
      ).rejects.toThrow()
    })
  })

  // ============================================
  // getUserActiveMembership
  // ============================================

  describe("getUserActiveMembership", () => {
    it("should return the active membership with plan details", async () => {
      setupAuthMock(mockCoachUser)

      const membership = createMockUserMembership({
        plan: createMockPlan({
          allowances: [
            {
              id: 1,
              membershipPlanId: 1,
              classTypeId: 10,
              classType: { id: 10, name: "Yoga" },
            },
          ],
        }),
      })

      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      const result = await getUserActiveMembership(10)

      expect(result).toBeDefined()
      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 10, status: "ACTIVE" },
          include: expect.objectContaining({
            plan: expect.objectContaining({
              include: expect.objectContaining({
                allowances: expect.any(Object),
              }),
            }),
          }),
        })
      )
    })

    it("should return null if no active membership", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      const result = await getUserActiveMembership(10)

      expect(result).toBeNull()
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getUserActiveMembership(10)).rejects.toThrow()
    })
  })

  // ============================================
  // getUserMembershipHistory
  // ============================================

  describe("getUserMembershipHistory", () => {
    it("should return all memberships for a user ordered by createdAt desc", async () => {
      setupAuthMock(mockCoachUser)

      const memberships = [
        createMockUserMembership({ id: 2, status: "ACTIVE" }),
        createMockUserMembership({ id: 1, status: "CANCELLED" }),
      ]

      mockPrisma.userMembership.findMany.mockResolvedValue(memberships)

      const result = await getUserMembershipHistory(10)

      expect(result).toHaveLength(2)
      expect(mockPrisma.userMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 10 },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
      )
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getUserMembershipHistory(10)).rejects.toThrow()
    })

    it("should return empty array if no memberships exist", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.userMembership.findMany.mockResolvedValue([])

      const result = await getUserMembershipHistory(10)

      expect(result).toEqual([])
    })
  })

  // ============================================
  // pauseMembership
  // ============================================

  describe("pauseMembership", () => {
    it("should pause an active membership", async () => {
      const pausedMembership = createMockUserMembership({
        status: "PAUSED",
      })

      mockPrisma.userMembership.findUnique.mockResolvedValue(
        createMockUserMembership({ id: 1, status: "ACTIVE" })
      )
      mockPrisma.userMembership.update.mockResolvedValue(pausedMembership)

      const result = await pauseMembership(1)

      expect(result.status).toBe("PAUSED")
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "PAUSED" },
      })
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(pauseMembership(1)).rejects.toThrow()
    })
  })

  // ============================================
  // resumeMembership
  // ============================================

  describe("resumeMembership", () => {
    it("should resume a paused membership", async () => {
      const activeMembership = createMockUserMembership({
        status: "ACTIVE",
      })

      mockPrisma.userMembership.findUnique.mockResolvedValue(
        createMockUserMembership({ id: 1, status: "PAUSED" })
      )
      mockPrisma.userMembership.update.mockResolvedValue(activeMembership)

      const result = await resumeMembership(1)

      expect(result.status).toBe("ACTIVE")
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "ACTIVE" },
      })
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(resumeMembership(1)).rejects.toThrow()
    })
  })

  // ============================================
  // cancelMembership
  // ============================================

  describe("cancelMembership", () => {
    it("should cancel a membership and set endDate", async () => {
      const cancelledMembership = createMockUserMembership({
        status: "CANCELLED",
        endDate: new Date(),
      })

      mockPrisma.userMembership.findUnique.mockResolvedValue(
        createMockUserMembership({ id: 1, status: "ACTIVE" })
      )
      mockPrisma.userMembership.update.mockResolvedValue(cancelledMembership)

      const result = await cancelMembership(1)

      expect(result.status).toBe("CANCELLED")
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "CANCELLED",
          endDate: expect.any(Date),
        },
      })
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(cancelMembership(1)).rejects.toThrow()
    })
  })
})
