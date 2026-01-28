/**
 * HealthKit Pairing Tests
 *
 * Tests for the HealthKit pairing code utilities including generation,
 * validation, creation, and lifecycle management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock Prisma before importing the module under test
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  pairingCode: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

// Now import the functions to test
import {
  generatePairingCode,
  generateExpirationTime,
  isValidCodeFormat,
  createPairingCode,
  regeneratePairingCode,
  validateAndUsePairingCode,
  getActivePairingCodes,
  cleanupExpiredCodes,
} from "@/lib/healthkit/pairing"

describe("HealthKit Pairing", () => {
  beforeEach(() => {
    // Reset all mocks between tests
    vi.clearAllMocks()
  })

  describe("generatePairingCode", () => {
    it("should return a 6-character string", () => {
      const code = generatePairingCode()
      expect(code).toHaveLength(6)
    })

    it("should only contain valid characters (no 0, O, I, l, 1)", () => {
      const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      const code = generatePairingCode()

      for (const char of code) {
        expect(validChars).toContain(char)
      }

      // Ensure excluded characters are not present
      expect(code).not.toMatch(/[0OIl1]/)
    })

    it("should generate different codes on successive calls", () => {
      const codes = new Set<string>()

      // Generate 10 codes
      for (let i = 0; i < 10; i++) {
        codes.add(generatePairingCode())
      }

      // At least some should be different (probabilistic check)
      // With 32^6 possibilities, we expect all 10 to be unique
      expect(codes.size).toBeGreaterThan(1)
    })
  })

  describe("generateExpirationTime", () => {
    it("should return a Date in the future", () => {
      const expirationTime = generateExpirationTime()
      const now = new Date()

      expect(expirationTime).toBeInstanceOf(Date)
      expect(expirationTime.getTime()).toBeGreaterThan(now.getTime())
    })

    it("should default to approximately 24 hours from now", () => {
      const expirationTime = generateExpirationTime()
      const now = new Date()
      const expectedTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Allow 1 second tolerance for test execution time
      const diff = Math.abs(expirationTime.getTime() - expectedTime.getTime())
      expect(diff).toBeLessThan(1000)
    })

    it("should respect custom hours parameter", () => {
      const customHours = 48
      const expirationTime = generateExpirationTime(customHours)
      const now = new Date()
      const expectedTime = new Date(now.getTime() + customHours * 60 * 60 * 1000)

      // Allow 1 second tolerance
      const diff = Math.abs(expirationTime.getTime() - expectedTime.getTime())
      expect(diff).toBeLessThan(1000)
    })
  })

  describe("isValidCodeFormat", () => {
    it("should return true for valid 6-char uppercase code", () => {
      expect(isValidCodeFormat("ABC234")).toBe(true)
      expect(isValidCodeFormat("XYZ789")).toBe(true)
      expect(isValidCodeFormat("HJKLMN")).toBe(true)
    })

    it("should return true for valid lowercase code (case-insensitive)", () => {
      expect(isValidCodeFormat("abc234")).toBe(true)
      expect(isValidCodeFormat("xyz789")).toBe(true)
      expect(isValidCodeFormat("hjklmn")).toBe(true)
    })

    it("should return true for mixed case code", () => {
      expect(isValidCodeFormat("AbC234")).toBe(true)
      expect(isValidCodeFormat("XyZ789")).toBe(true)
    })

    it("should return false for empty string", () => {
      expect(isValidCodeFormat("")).toBe(false)
    })

    it("should return false for wrong length", () => {
      expect(isValidCodeFormat("ABC23")).toBe(false) // 5 chars
      expect(isValidCodeFormat("ABC2345")).toBe(false) // 7 chars
      expect(isValidCodeFormat("ABC")).toBe(false) // 3 chars
    })

    it("should return false for code with excluded characters", () => {
      expect(isValidCodeFormat("ABC0DE")).toBe(false) // Contains 0
      expect(isValidCodeFormat("ABCODE")).toBe(false) // Contains O
      expect(isValidCodeFormat("ABC1DE")).toBe(false) // Contains 1
      expect(isValidCodeFormat("ABCIDE")).toBe(false) // Contains I
    })

    it("should return false for code with invalid characters", () => {
      expect(isValidCodeFormat("ABC@DE")).toBe(false) // Contains @
      expect(isValidCodeFormat("ABC-DE")).toBe(false) // Contains -
      expect(isValidCodeFormat("ABC DE")).toBe(false) // Contains space
    })
  })

  describe("createPairingCode", () => {
    const mockClient = {
      id: 10,
      role: "CLIENT",
      name: "Test Client",
      email: "client@test.com",
    }

    const mockCreatedCode = {
      id: 1,
      code: "ABC234",
      userId: 10,
      createdBy: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
      user: {
        id: 10,
        name: "Test Client",
        email: "client@test.com",
      },
    }

    it("should throw when client not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(createPairingCode(1, 999)).rejects.toThrow("Client not found")
    })

    it("should throw when user is not a CLIENT", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 5,
        role: "COACH",
      })

      await expect(createPairingCode(1, 5)).rejects.toThrow("User is not a client")
    })

    it("should create pairing code on first attempt (no collision)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockClient)
      mockPrisma.pairingCode.findUnique.mockResolvedValue(null) // No collision
      mockPrisma.pairingCode.create.mockResolvedValue(mockCreatedCode)

      const result = await createPairingCode(1, 10)

      expect(result).toEqual(mockCreatedCode)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { id: true, role: true },
      })
      expect(mockPrisma.pairingCode.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.pairingCode.create).toHaveBeenCalledWith({
        data: {
          code: expect.any(String),
          userId: 10,
          createdBy: 1,
          expiresAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    })

    it("should retry on code collision", async () => {
      const existingCode = { id: 99, code: "EXIST1" }

      mockPrisma.user.findUnique.mockResolvedValue(mockClient)
      mockPrisma.pairingCode.findUnique
        .mockResolvedValueOnce(existingCode) // First attempt: collision
        .mockResolvedValueOnce(null) // Second attempt: success
      mockPrisma.pairingCode.create.mockResolvedValue(mockCreatedCode)

      const result = await createPairingCode(1, 10)

      expect(result).toEqual(mockCreatedCode)
      expect(mockPrisma.pairingCode.findUnique).toHaveBeenCalledTimes(2)
      expect(mockPrisma.pairingCode.create).toHaveBeenCalledTimes(1)
    })

    it("should throw after max attempts (10 collisions)", async () => {
      const existingCode = { id: 99, code: "EXIST1" }

      mockPrisma.user.findUnique.mockResolvedValue(mockClient)
      // Mock 10 consecutive collisions
      mockPrisma.pairingCode.findUnique.mockResolvedValue(existingCode)

      await expect(createPairingCode(1, 10)).rejects.toThrow(
        "Failed to generate unique pairing code"
      )

      expect(mockPrisma.pairingCode.findUnique).toHaveBeenCalledTimes(10)
      expect(mockPrisma.pairingCode.create).not.toHaveBeenCalled()
    })
  })

  describe("regeneratePairingCode", () => {
    const mockClient = {
      id: 10,
      role: "CLIENT",
    }

    const mockNewCode = {
      id: 2,
      code: "NEW456",
      userId: 10,
      createdBy: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
      user: {
        id: 10,
        name: "Test Client",
        email: "client@test.com",
      },
    }

    it("should invalidate existing codes first", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockClient)
      mockPrisma.pairingCode.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.pairingCode.findUnique.mockResolvedValue(null)
      mockPrisma.pairingCode.create.mockResolvedValue(mockNewCode)

      await regeneratePairingCode(1, 10)

      expect(mockPrisma.pairingCode.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 10,
          usedAt: null,
        },
        data: {
          expiresAt: new Date(0),
        },
      })
    })

    it("should then create new code", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockClient)
      mockPrisma.pairingCode.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.pairingCode.findUnique.mockResolvedValue(null)
      mockPrisma.pairingCode.create.mockResolvedValue(mockNewCode)

      const result = await regeneratePairingCode(1, 10)

      expect(result).toEqual(mockNewCode)
      expect(mockPrisma.pairingCode.create).toHaveBeenCalled()
    })
  })

  describe("validateAndUsePairingCode", () => {
    const mockValidCode = {
      id: 1,
      code: "ABC234",
      userId: 10,
      createdBy: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future
      usedAt: null,
      createdAt: new Date(),
      user: {
        id: 10,
        name: "Test Client",
        email: "client@test.com",
      },
    }

    const mockUpdatedCode = {
      ...mockValidCode,
      usedAt: new Date(),
    }

    it("should return error for invalid format", async () => {
      const result = await validateAndUsePairingCode("INVALID")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Invalid code format")
      }
      expect(mockPrisma.pairingCode.findUnique).not.toHaveBeenCalled()
    })

    it("should return error when code not found", async () => {
      mockPrisma.pairingCode.findUnique.mockResolvedValue(null)

      const result = await validateAndUsePairingCode("ABC234")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Pairing code not found")
      }
    })

    it("should return error when code already used", async () => {
      const usedCode = {
        ...mockValidCode,
        usedAt: new Date(Date.now() - 1000), // Already used
      }

      mockPrisma.pairingCode.findUnique.mockResolvedValue(usedCode)

      const result = await validateAndUsePairingCode("ABC234")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Pairing code has already been used")
      }
    })

    it("should return error when code expired", async () => {
      const expiredCode = {
        ...mockValidCode,
        expiresAt: new Date(Date.now() - 1000), // Expired
      }

      mockPrisma.pairingCode.findUnique.mockResolvedValue(expiredCode)

      const result = await validateAndUsePairingCode("ABC234")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Pairing code has expired")
      }
    })

    it("should return success and mark code as used when valid", async () => {
      mockPrisma.pairingCode.findUnique.mockResolvedValue(mockValidCode)
      mockPrisma.pairingCode.update.mockResolvedValue(mockUpdatedCode)

      const result = await validateAndUsePairingCode("ABC234")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.userId).toBe(10)
        expect(result.pairingCode).toEqual(mockUpdatedCode)
      }

      expect(mockPrisma.pairingCode.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { usedAt: expect.any(Date) },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    })

    it("should normalize code to uppercase", async () => {
      mockPrisma.pairingCode.findUnique.mockResolvedValue(mockValidCode)
      mockPrisma.pairingCode.update.mockResolvedValue(mockUpdatedCode)

      await validateAndUsePairingCode("abc234") // Lowercase input

      expect(mockPrisma.pairingCode.findUnique).toHaveBeenCalledWith({
        where: { code: "ABC234" }, // Uppercase lookup
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    })
  })

  describe("getActivePairingCodes", () => {
    const mockActiveCodes = [
      {
        id: 1,
        code: "ABC234",
        userId: 10,
        createdBy: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
        user: {
          id: 10,
          name: "Client 1",
          email: "client1@test.com",
        },
      },
      {
        id: 2,
        code: "XYZ789",
        userId: 11,
        createdBy: 2,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
        user: {
          id: 11,
          name: "Client 2",
          email: "client2@test.com",
        },
      },
    ]

    it("should return active codes filtered by unexpired and unused", async () => {
      mockPrisma.pairingCode.findMany.mockResolvedValue(mockActiveCodes)

      const result = await getActivePairingCodes()

      expect(result).toEqual(mockActiveCodes)
      expect(mockPrisma.pairingCode.findMany).toHaveBeenCalledWith({
        where: {
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    })

    it("should filter by createdBy when provided", async () => {
      const filteredCodes = [mockActiveCodes[0]]
      mockPrisma.pairingCode.findMany.mockResolvedValue(filteredCodes)

      const result = await getActivePairingCodes(1)

      expect(result).toEqual(filteredCodes)
      expect(mockPrisma.pairingCode.findMany).toHaveBeenCalledWith({
        where: {
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
          createdBy: 1,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    })

    it("should return all active when no createdBy", async () => {
      mockPrisma.pairingCode.findMany.mockResolvedValue(mockActiveCodes)

      const result = await getActivePairingCodes()

      expect(result).toHaveLength(2)
      expect(mockPrisma.pairingCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            createdBy: expect.anything(),
          }),
        })
      )
    })
  })

  describe("cleanupExpiredCodes", () => {
    it("should delete expired unused codes", async () => {
      mockPrisma.pairingCode.deleteMany.mockResolvedValue({ count: 5 })

      const result = await cleanupExpiredCodes()

      expect(result).toBe(5)
      expect(mockPrisma.pairingCode.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          usedAt: null,
        },
      })
    })

    it("should return count of deleted codes", async () => {
      mockPrisma.pairingCode.deleteMany.mockResolvedValue({ count: 3 })

      const result = await cleanupExpiredCodes()

      expect(result).toBe(3)
    })

    it("should return 0 when no codes to delete", async () => {
      mockPrisma.pairingCode.deleteMany.mockResolvedValue({ count: 0 })

      const result = await cleanupExpiredCodes()

      expect(result).toBe(0)
    })
  })
})
