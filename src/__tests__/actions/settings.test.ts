/**
 * Tests for settings server actions
 *
 * Covers:
 * - getSystemSetting: Get individual setting with default fallback
 * - getSystemSettings: Get all settings merged with defaults (admin-only)
 * - updateSystemSettings: Update settings via upsert with validation (admin-only)
 * - getUserSettings: Get user profile by ID
 * - updateUserProfile: Update user profile with password hashing (auth required)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  resetAuthMocks,
} from "../mocks"

// Mock audit log
vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: vi.fn(),
}))

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}))

// Now import the functions to test (after mocks are set up)
import {
  getSystemSetting,
  getSystemSettings,
  updateSystemSettings,
  getUserSettings,
  updateUserProfile,
} from "@/app/actions/settings"

describe("Settings Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    vi.clearAllMocks()
  })

  // ============================================
  // getSystemSetting
  // ============================================

  describe("getSystemSetting", () => {
    it("returns value from database if setting exists", async () => {
      const mockSetting = {
        id: 1,
        key: "maxClientsPerCoach",
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.systemSettings.findUnique.mockResolvedValue(mockSetting)

      const result = await getSystemSetting("maxClientsPerCoach", 50)

      expect(result).toBe(100)
      expect(mockPrisma.systemSettings.findUnique).toHaveBeenCalledWith({
        where: { key: "maxClientsPerCoach" },
      })
    })

    it("returns default value if setting not found", async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null)

      const result = await getSystemSetting("maxClientsPerCoach", 50)

      expect(result).toBe(50)
      expect(mockPrisma.systemSettings.findUnique).toHaveBeenCalledWith({
        where: { key: "maxClientsPerCoach" },
      })
    })

    it("handles boolean settings correctly", async () => {
      const mockSetting = {
        id: 2,
        key: "healthkitEnabled",
        value: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.systemSettings.findUnique.mockResolvedValue(mockSetting)

      const result = await getSystemSetting("healthkitEnabled", true)

      expect(result).toBe(false)
    })
  })

  // ============================================
  // getSystemSettings
  // ============================================

  describe("getSystemSettings", () => {
    it("returns defaults merged with database values", async () => {
      setupAuthMock(mockAdminUser)

      const dbSettings = [
        { id: 1, key: "maxClientsPerCoach", value: 75, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, key: "healthkitEnabled", value: false, createdAt: new Date(), updatedAt: new Date() },
      ]
      mockPrisma.systemSettings.findMany.mockResolvedValue(dbSettings)

      const result = await getSystemSettings()

      expect(result.maxClientsPerCoach).toBe(75) // Overridden from DB
      expect(result.healthkitEnabled).toBe(false) // Overridden from DB
      expect(result.minClientsPerCoach).toBe(10) // From defaults
      expect(result.recentActivityDays).toBe(14) // From defaults
    })

    it("returns all defaults when no settings in database", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.systemSettings.findMany.mockResolvedValue([])

      const result = await getSystemSettings()

      expect(result.maxClientsPerCoach).toBe(50)
      expect(result.minClientsPerCoach).toBe(10)
      expect(result.recentActivityDays).toBe(14)
      expect(result.healthkitEnabled).toBe(true)
    })

    it("requires admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getSystemSettings()).rejects.toThrow("Forbidden")
    })

    it("requires authentication", async () => {
      setupAuthMock(null)

      await expect(getSystemSettings()).rejects.toThrow("Unauthorized")
    })
  })

  // ============================================
  // updateSystemSettings
  // ============================================

  describe("updateSystemSettings", () => {
    it("validates and upserts settings successfully", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        maxClientsPerCoach: 100,
        healthkitEnabled: false,
        adherenceGreenMinimum: 8,
      }

      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 1,
        key: "maxClientsPerCoach",
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateSystemSettings(input)

      expect(result).toEqual(input)
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledTimes(3)
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith({
        where: { key: "maxClientsPerCoach" },
        update: { value: 100 },
        create: { key: "maxClientsPerCoach", value: 100 },
      })
    })

    it("logs audit event after update", async () => {
      setupAuthMock(mockAdminUser)
      const { logAuditEvent } = await import("@/lib/audit-log")

      const input = {
        maxClientsPerCoach: 100,
      }

      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 1,
        key: "maxClientsPerCoach",
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await updateSystemSettings(input)

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "UPDATE_SYSTEM_SETTINGS",
        actorId: 1,
        targetType: "SystemSettings",
        details: input,
      })
    })

    it("rejects invalid data types", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        maxClientsPerCoach: "not a number",
      }

      await expect(updateSystemSettings(input as unknown as Record<string, unknown>)).rejects.toThrow()
    })

    it("rejects out-of-range values", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        bodyFatLowPercent: 150, // Out of 0-100 range
      }

      await expect(updateSystemSettings(input)).rejects.toThrow()
    })

    it("rejects negative values for positive-only fields", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        maxClientsPerCoach: -10,
      }

      await expect(updateSystemSettings(input)).rejects.toThrow()
    })

    it("allows partial updates", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        healthkitEnabled: false,
      }

      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 1,
        key: "healthkitEnabled",
        value: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateSystemSettings(input)

      expect(result).toEqual(input)
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledTimes(1)
    })

    it("requires admin role", async () => {
      setupAuthMock(mockCoachUser)

      const input = {
        maxClientsPerCoach: 100,
      }

      await expect(updateSystemSettings(input)).rejects.toThrow("Forbidden")
    })
  })

  // ============================================
  // getUserSettings
  // ============================================

  describe("getUserSettings", () => {
    it("returns user data successfully", async () => {
      const mockUser = {
        id: 5,
        name: "Test User",
        email: "test@example.com",
        billingEmail: "billing@example.com",
        credits: 10,
        creditsExpiry: new Date("2026-12-31"),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await getUserSettings(5)

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
        select: {
          id: true,
          name: true,
          email: true,
          billingEmail: true,
          credits: true,
          creditsExpiry: true,
        },
      })
    })

    it("throws error if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(getUserSettings(999)).rejects.toThrow("User not found")
    })

    it("returns user with null billingEmail", async () => {
      const mockUser = {
        id: 5,
        name: "Test User",
        email: "test@example.com",
        billingEmail: null,
        credits: 0,
        creditsExpiry: null,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await getUserSettings(5)

      expect(result.billingEmail).toBeNull()
    })
  })

  // ============================================
  // updateUserProfile
  // ============================================

  describe("updateUserProfile", () => {
    it("updates user name and email", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        name: "Updated Name",
        email: "updated@example.com",
      }

      const updatedUser = {
        id: 1,
        name: "Updated Name",
        email: "updated@example.com",
        billingEmail: null,
        password: "old_hashed_password",
        role: "ADMIN",
        credits: 0,
        creditsExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTestUser: false,
      }

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      const result = await updateUserProfile(input)

      expect(result).toEqual(updatedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "Updated Name",
          email: "updated@example.com",
        },
      })
    })

    it("hashes password when provided", async () => {
      setupAuthMock(mockAdminUser)
      const bcrypt = (await import("bcryptjs")).default

      const input = {
        password: "newpassword123",
      }

      const updatedUser = {
        id: 1,
        name: "Admin User",
        email: "admin@test.com",
        billingEmail: null,
        password: "hashed_password",
        role: "ADMIN",
        credits: 0,
        creditsExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTestUser: false,
      }

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      await updateUserProfile(input)

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: "hashed_password",
        },
      })
    })

    it("handles billingEmail set to null", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        billingEmail: null,
      }

      const updatedUser = {
        id: 1,
        name: "Admin User",
        email: "admin@test.com",
        billingEmail: null,
        password: "hashed_password",
        role: "ADMIN",
        credits: 0,
        creditsExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTestUser: false,
      }

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      await updateUserProfile(input)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          billingEmail: null,
        },
      })
    })

    it("sets billingEmail to valid email", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        billingEmail: "billing@example.com",
      }

      const updatedUser = {
        id: 1,
        name: "Admin User",
        email: "admin@test.com",
        billingEmail: "billing@example.com",
        password: "hashed_password",
        role: "ADMIN",
        credits: 0,
        creditsExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTestUser: false,
      }

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      await updateUserProfile(input)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          billingEmail: "billing@example.com",
        },
      })
    })

    it("logs audit event after update", async () => {
      setupAuthMock(mockAdminUser)
      const { logAuditEvent } = await import("@/lib/audit-log")

      const input = {
        name: "Updated Name",
        email: "updated@example.com",
        billingEmail: "billing@example.com",
      }

      const updatedUser = {
        id: 1,
        name: "Updated Name",
        email: "updated@example.com",
        billingEmail: "billing@example.com",
        password: "hashed_password",
        role: "ADMIN",
        credits: 0,
        creditsExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTestUser: false,
      }

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      await updateUserProfile(input)

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "UPDATE_USER_PROFILE",
        actorId: 1,
        targetId: 1,
        targetType: "User",
        details: {
          name: "Updated Name",
          email: "updated@example.com",
          billingEmail: "billing@example.com",
        },
      })
    })

    it("rejects invalid email", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        email: "not-an-email",
      }

      await expect(updateUserProfile(input)).rejects.toThrow()
    })

    it("rejects short password", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        password: "short",
      }

      await expect(updateUserProfile(input)).rejects.toThrow()
    })

    it("rejects short name", async () => {
      setupAuthMock(mockAdminUser)

      const input = {
        name: "a",
      }

      await expect(updateUserProfile(input)).rejects.toThrow()
    })

    it("requires authentication", async () => {
      setupAuthMock(null)

      const input = {
        name: "Updated Name",
      }

      await expect(updateUserProfile(input)).rejects.toThrow("Unauthorized")
    })
  })

  // ============================================
  // Auth edge cases
  // ============================================

  describe("Authorization edge cases", () => {
    it("client users cannot access system settings", async () => {
      setupAuthMock(mockClientUser)

      await expect(getSystemSettings()).rejects.toThrow("Forbidden")
    })

    it("client users cannot update system settings", async () => {
      setupAuthMock(mockClientUser)

      const input = {
        maxClientsPerCoach: 100,
      }

      await expect(updateSystemSettings(input)).rejects.toThrow("Forbidden")
    })

    it("unauthenticated users cannot update profile", async () => {
      setupAuthMock(null)

      const input = {
        name: "Hacker",
      }

      await expect(updateUserProfile(input)).rejects.toThrow("Unauthorized")
    })
  })
})
