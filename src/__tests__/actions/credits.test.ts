/**
 * Credits Server Actions Tests
 *
 * Tests for credit allocation, deduction, history retrieval,
 * and summary generation with admin authorization.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import { setupAuthMock, mockAdminUser, mockCoachUser, mockClientUser } from "../mocks/auth"
import {
  allocateCredits,
  getCreditsHistory,
  getCreditsSummary,
} from "@/app/actions/credits"

// Mock modules
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }))

describe("Credits Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAuthMock(mockAdminUser)
  })

  describe("allocateCredits", () => {
    it("should add credits successfully", async () => {
      const mockUser = {
        id: 10,
        credits: 100,
        name: "Test User",
        email: "user@test.com",
      }

      const mockTransaction = {
        id: 1,
        userId: 10,
        amount: 50,
        reason: "Bonus credits",
        createdAt: new Date(),
        expiresAt: null,
        createdById: 1,
      }

      const mockUpdatedUser = {
        ...mockUser,
        credits: 150,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.create.mockResolvedValue(mockTransaction)
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser)

      const result = await allocateCredits({
        userId: 10,
        amount: 50,
        reason: "Bonus credits",
      })

      expect(result.transaction.amount).toBe(50)
      expect(result.newBalance).toBe(150)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { credits: true, name: true, email: true },
      })
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalled()
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { credits: 150 },
      })
    })

    it("should deduct credits successfully", async () => {
      const mockUser = {
        id: 10,
        credits: 100,
        name: "Test User",
        email: "user@test.com",
      }

      const mockTransaction = {
        id: 2,
        userId: 10,
        amount: -30,
        reason: "Used for session",
        createdAt: new Date(),
        expiresAt: null,
        createdById: 1,
      }

      const mockUpdatedUser = {
        ...mockUser,
        credits: 70,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.create.mockResolvedValue(mockTransaction)
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser)

      const result = await allocateCredits({
        userId: 10,
        amount: -30,
        reason: "Used for session",
      })

      expect(result.transaction.amount).toBe(-30)
      expect(result.newBalance).toBe(70)
    })

    it("should reject deduction that would result in negative balance", async () => {
      const mockUser = {
        id: 10,
        credits: 20,
        name: "Test User",
        email: "user@test.com",
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      await expect(
        allocateCredits({
          userId: 10,
          amount: -50,
          reason: "Attempted deduction",
        })
      ).rejects.toThrow("Cannot deduct 50 credits. User only has 20 credits.")
    })

    it("should validate missing reason", async () => {
      await expect(
        allocateCredits({
          userId: 10,
          amount: 50,
          reason: "",
        })
      ).rejects.toThrow("Reason is required")
    })

    it("should validate invalid userId", async () => {
      await expect(
        allocateCredits({
          userId: 0,
          amount: 50,
          reason: "Test",
        })
      ).rejects.toThrow()
    })

    it("should log ALLOCATE_CREDITS for positive amounts", async () => {
      const { logAuditEvent } = await import("@/lib/audit-log")

      const mockUser = {
        id: 10,
        credits: 100,
        name: "Test User",
        email: "user@test.com",
      }

      const mockTransaction = {
        id: 1,
        userId: 10,
        amount: 50,
        reason: "Bonus credits",
        createdAt: new Date(),
        expiresAt: null,
        createdById: 1,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.create.mockResolvedValue(mockTransaction)
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, credits: 150 })

      await allocateCredits({
        userId: 10,
        amount: 50,
        reason: "Bonus credits",
      })

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "ALLOCATE_CREDITS",
        actorId: 1,
        targetId: 10,
        targetType: "User",
        details: {
          amount: 50,
          reason: "Bonus credits",
          previousBalance: 100,
          newBalance: 150,
          expiryDate: undefined,
        },
      })
    })

    it("should log DEDUCT_CREDITS for negative amounts", async () => {
      const { logAuditEvent } = await import("@/lib/audit-log")

      const mockUser = {
        id: 10,
        credits: 100,
        name: "Test User",
        email: "user@test.com",
      }

      const mockTransaction = {
        id: 2,
        userId: 10,
        amount: -30,
        reason: "Used for session",
        createdAt: new Date(),
        expiresAt: null,
        createdById: 1,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.create.mockResolvedValue(mockTransaction)
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, credits: 70 })

      await allocateCredits({
        userId: 10,
        amount: -30,
        reason: "Used for session",
      })

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "DEDUCT_CREDITS",
        actorId: 1,
        targetId: 10,
        targetType: "User",
        details: {
          amount: -30,
          reason: "Used for session",
          previousBalance: 100,
          newBalance: 70,
          expiryDate: undefined,
        },
      })
    })

    it("should throw error if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(
        allocateCredits({
          userId: 999,
          amount: 50,
          reason: "Test",
        })
      ).rejects.toThrow("User not found")
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        allocateCredits({
          userId: 10,
          amount: 50,
          reason: "Test",
        })
      ).rejects.toThrow("Forbidden")
    })

    it("should support expiry date", async () => {
      const mockUser = {
        id: 10,
        credits: 100,
        name: "Test User",
        email: "user@test.com",
      }

      const expiryDate = "2024-12-31"
      const mockTransaction = {
        id: 1,
        userId: 10,
        amount: 50,
        reason: "Promotional credits",
        createdAt: new Date(),
        expiresAt: new Date(expiryDate),
        createdById: 1,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.create.mockResolvedValue(mockTransaction)
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, credits: 150 })

      const result = await allocateCredits({
        userId: 10,
        amount: 50,
        reason: "Promotional credits",
        expiryDate,
      })

      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          amount: 50,
          reason: "Promotional credits",
          expiresAt: new Date(expiryDate),
          createdById: 1,
        },
      })
    })
  })

  describe("getCreditsHistory", () => {
    it("should return transactions ordered by date", async () => {
      const mockTransactions = [
        {
          id: 3,
          userId: 10,
          amount: 20,
          reason: "Recent allocation",
          createdAt: new Date("2024-03-01"),
          expiresAt: null,
          createdById: 1,
          createdBy: {
            name: "Admin User",
            email: "admin@test.com",
          },
        },
        {
          id: 2,
          userId: 10,
          amount: -10,
          reason: "Session deduction",
          createdAt: new Date("2024-02-15"),
          expiresAt: null,
          createdById: 1,
          createdBy: {
            name: "Admin User",
            email: "admin@test.com",
          },
        },
        {
          id: 1,
          userId: 10,
          amount: 100,
          reason: "Initial credits",
          createdAt: new Date("2024-01-01"),
          expiresAt: null,
          createdById: 1,
          createdBy: {
            name: "Admin User",
            email: "admin@test.com",
          },
        },
      ]

      mockPrisma.creditTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await getCreditsHistory(10)

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe(3)
      expect(result[0].createdBy.name).toBe("Admin User")
      expect(mockPrisma.creditTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 10 },
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
    })

    it("should return empty array for user with no history", async () => {
      mockPrisma.creditTransaction.findMany.mockResolvedValue([])

      const result = await getCreditsHistory(10)

      expect(result).toHaveLength(0)
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getCreditsHistory(10)).rejects.toThrow("Forbidden")
    })
  })

  describe("getCreditsSummary", () => {
    it("should return balance and stats", async () => {
      const mockUser = {
        credits: 150,
      }

      const mockStats = {
        _sum: {
          amount: 200,
        },
      }

      const mockRecentTransactions = [
        {
          id: 5,
          userId: 10,
          amount: 50,
          reason: "Latest allocation",
          createdAt: new Date("2024-03-05"),
          expiresAt: null,
          createdById: 1,
          createdBy: {
            name: "Admin User",
            email: "admin@test.com",
          },
        },
        {
          id: 4,
          userId: 10,
          amount: -20,
          reason: "Session deduction",
          createdAt: new Date("2024-03-03"),
          expiresAt: null,
          createdById: 1,
          createdBy: {
            name: "Admin User",
            email: "admin@test.com",
          },
        },
      ]

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.aggregate.mockResolvedValue(mockStats)
      mockPrisma.creditTransaction.findMany.mockResolvedValue(mockRecentTransactions)

      const result = await getCreditsSummary(10)

      expect(result.currentBalance).toBe(150)
      expect(result.totalAllocated).toBe(200)
      expect(result.recentTransactions).toHaveLength(2)
      expect(mockPrisma.creditTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 10 },
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
    })

    it("should throw error if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(getCreditsSummary(999)).rejects.toThrow("User not found")
    })

    it("should handle zero transactions", async () => {
      const mockUser = {
        credits: 0,
      }

      const mockStats = {
        _sum: {
          amount: null,
        },
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.aggregate.mockResolvedValue(mockStats)
      mockPrisma.creditTransaction.findMany.mockResolvedValue([])

      const result = await getCreditsSummary(10)

      expect(result.currentBalance).toBe(0)
      expect(result.totalAllocated).toBe(0)
      expect(result.recentTransactions).toHaveLength(0)
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getCreditsSummary(10)).rejects.toThrow("Forbidden")
    })

    it("should limit to 5 recent transactions", async () => {
      const mockUser = { credits: 100 }
      const mockStats = { _sum: { amount: 500 } }
      const mockTransactions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        userId: 10,
        amount: 10,
        reason: `Transaction ${i + 1}`,
        createdAt: new Date(),
        expiresAt: null,
        createdById: 1,
        createdBy: {
          name: "Admin User",
          email: "admin@test.com",
        },
      }))

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.creditTransaction.aggregate.mockResolvedValue(mockStats)
      mockPrisma.creditTransaction.findMany.mockResolvedValue(
        mockTransactions.slice(0, 5)
      )

      const result = await getCreditsSummary(10)

      expect(result.recentTransactions).toHaveLength(5)
    })
  })

  describe("Auth edge cases", () => {
    it("should reject coach from allocating credits", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        allocateCredits({
          userId: 10,
          amount: 50,
          reason: "Test",
        })
      ).rejects.toThrow("Forbidden")
    })

    it("should reject client from allocating credits", async () => {
      setupAuthMock(mockClientUser)

      await expect(
        allocateCredits({
          userId: 10,
          amount: 50,
          reason: "Test",
        })
      ).rejects.toThrow()
    })

    it("should reject client from viewing history", async () => {
      setupAuthMock(mockClientUser)

      await expect(getCreditsHistory(10)).rejects.toThrow()
    })

    it("should reject unauthenticated from allocating", async () => {
      setupAuthMock(null)

      await expect(
        allocateCredits({
          userId: 10,
          amount: 50,
          reason: "Test",
        })
      ).rejects.toThrow("Unauthorized")
    })

    it("should reject unauthenticated from viewing summary", async () => {
      setupAuthMock(null)

      await expect(getCreditsSummary(10)).rejects.toThrow("Unauthorized")
    })
  })
})
