/**
 * Admin Users Server Actions Tests
 *
 * Tests for admin-only user management server actions including
 * user CRUD operations and bulk actions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

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

import {
  createMockUser,
  createMockAdmin,
  createMockCoach,
  createMockClient,
  resetIdCounters,
} from "../utils/test-data"

// Mock next/cache and next/navigation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

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
  getAdminUsers,
  getAdminUserById,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  bulkAdminUserAction,
} from "@/app/actions/admin-users"

// Import bcrypt and audit log to access the mocks
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit-log"

describe("Admin Users Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetIdCounters()
    vi.mocked(logAuditEvent).mockReset()
    vi.mocked(bcrypt.hash).mockReset().mockResolvedValue("hashed_password")

    // Default: authenticated as admin
    setupAuthMock(mockAdminUser)
  })

  describe("getAdminUsers", () => {
    it("should return all users with counts", async () => {
      const mockUsers = [
        {
          ...createMockAdmin({ id: 1, name: "Admin User" }),
          _count: {
            appointmentsAsClient: 5,
            cohortMemberships: 2,
            invoices: 3,
          },
        },
        {
          ...createMockCoach({ id: 2, name: "Coach User" }),
          _count: {
            appointmentsAsClient: 10,
            cohortMemberships: 1,
            invoices: 5,
          },
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers)

      const result = await getAdminUsers()

      expect(result).toHaveLength(2)
      expect(result[0]._count.appointmentsAsClient).toBe(5)
      expect(result[1]._count.cohortMemberships).toBe(1)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              appointmentsAsClient: true,
              cohortMemberships: true,
              invoices: true,
            },
          },
          credits: true,
        },
        orderBy: { createdAt: "desc" },
      })
    })

    it("should filter users by search query", async () => {
      const mockUsers = [
        {
          ...createMockUser({ id: 1, name: "John Doe", email: "john@test.com" }),
          _count: {
            appointmentsAsClient: 0,
            cohortMemberships: 0,
            invoices: 0,
          },
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers)

      const result = await getAdminUsers({ query: "john" })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("John Doe")
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
          ],
        },
        select: expect.any(Object),
        orderBy: { createdAt: "desc" },
      })
    })

    it("should require admin authentication", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getAdminUsers()).rejects.toThrow("Forbidden")
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
    })

    it("should return empty array when no users match query", async () => {
      mockPrisma.user.findMany.mockResolvedValue([])

      const result = await getAdminUsers({ query: "nonexistent" })

      expect(result).toHaveLength(0)
    })
  })

  describe("getAdminUserById", () => {
    it("should return user with all relations", async () => {
      const mockUser = {
        ...createMockUser({ id: 1, name: "Test User" }),
        appointmentsAsClient: [],
        cohortMemberships: [],
        invoices: [],
        sessionRegistrations: [],
        entries: [],
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await getAdminUserById(1)

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          appointmentsAsClient: {
            orderBy: { startTime: "desc" },
            take: 20,
            include: {
              coach: { select: { id: true, name: true } },
            },
          },
          cohortMemberships: { include: { cohort: true } },
          invoices: { orderBy: { month: "desc" }, take: 10 },
          sessionRegistrations: { include: { session: { include: { classType: true } } }, take: 20 },
          entries: { orderBy: { date: "desc" }, take: 30 },
        },
      })
    })

    it("should throw error if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(getAdminUserById(999)).rejects.toThrow("User not found")
    })

    it("should require admin authentication", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getAdminUserById(1)).rejects.toThrow("Forbidden")
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe("createAdminUser", () => {
    it("should create user with hashed password", async () => {
      const newUser = createMockUser({
        id: 1,
        name: "New User",
        email: "new@test.com",
        role: "CLIENT",
      })

      mockPrisma.user.findUnique.mockResolvedValue(null) // No existing user
      mockPrisma.user.create.mockResolvedValue(newUser)

      const result = await createAdminUser({
        name: "New User",
        email: "new@test.com",
        role: "CLIENT",
        password: "password123",
        credits: 10,
      })

      expect(result).toEqual(newUser)
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "New User",
          email: "new@test.com",
          role: "CLIENT",
          password: "hashed_password",
          emailVerified: false,
          credits: 10,
        },
      })
    })

    it("should create user without password", async () => {
      const newUser = createMockUser({
        id: 1,
        name: "OAuth User",
        email: "oauth@test.com",
        password: null,
      })

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(newUser)

      const result = await createAdminUser({
        name: "OAuth User",
        email: "oauth@test.com",
        role: "CLIENT",
      })

      expect(result).toEqual(newUser)
      expect(bcrypt.hash).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "OAuth User",
          email: "oauth@test.com",
          role: "CLIENT",
          password: null,
          emailVerified: false,
          credits: 0,
        },
      })
    })

    it("should throw error if email already exists", async () => {
      const existingUser = createMockUser({ email: "existing@test.com" })
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)

      await expect(
        createAdminUser({
          name: "New User",
          email: "existing@test.com",
          role: "CLIENT",
        })
      ).rejects.toThrow("User with this email already exists")

      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it("should validate input with Zod schema", async () => {
      await expect(
        createAdminUser({
          name: "A", // Too short
          email: "new@test.com",
          role: "CLIENT",
        })
      ).rejects.toThrow()
    })

    it("should validate email format", async () => {
      await expect(
        createAdminUser({
          name: "New User",
          email: "invalid-email",
          role: "CLIENT",
        })
      ).rejects.toThrow()
    })

    it("should log audit event", async () => {
      const newUser = createMockUser({
        id: 5,
        name: "New User",
        email: "new@test.com",
      })

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(newUser)

      await createAdminUser({
        name: "New User",
        email: "new@test.com",
        role: "CLIENT",
      })

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "CREATE_USER",
        actorId: 1, // mockAdminUser.id
        targetId: 5,
        targetType: "User",
        details: { name: "New User", email: "new@test.com", role: "CLIENT" },
      })
    })

    it("should require admin authentication", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        createAdminUser({
          name: "New User",
          email: "new@test.com",
          role: "CLIENT",
        })
      ).rejects.toThrow("Forbidden")
    })
  })

  describe("updateAdminUser", () => {
    it("should update user fields", async () => {
      const updatedUser = createMockUser({
        id: 1,
        name: "Updated Name",
        email: "updated@test.com",
        role: "COACH",
      })

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      const result = await updateAdminUser({
        id: 1,
        name: "Updated Name",
        email: "updated@test.com",
        role: "COACH",
      })

      expect(result).toEqual(updatedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "Updated Name",
          email: "updated@test.com",
          role: "COACH",
        },
      })
    })

    it("should hash password if provided", async () => {
      const updatedUser = createMockUser({ id: 1, name: "Test User" })
      mockPrisma.user.update.mockResolvedValue(updatedUser)

      await updateAdminUser({
        id: 1,
        password: "newpassword123",
      })

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: "hashed_password",
        },
      })
    })

    it("should validate input with Zod schema", async () => {
      await expect(
        updateAdminUser({
          id: 1,
          name: "A", // Too short
        })
      ).rejects.toThrow()
    })

    it("should log audit event", async () => {
      const updatedUser = createMockUser({
        id: 5,
        name: "Updated User",
      })

      mockPrisma.user.update.mockResolvedValue(updatedUser)

      await updateAdminUser({
        id: 5,
        name: "Updated User",
        credits: 20,
      })

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "UPDATE_USER",
        actorId: 1, // mockAdminUser.id
        targetId: 5,
        targetType: "User",
        details: { id: 5, name: "Updated User", credits: 20, email: undefined, role: undefined },
      })
    })

    it("should require admin authentication", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        updateAdminUser({
          id: 1,
          name: "Updated Name",
        })
      ).rejects.toThrow("Forbidden")
    })
  })

  describe("deleteAdminUser", () => {
    it("should delete user and log audit event", async () => {
      const deletedUser = createMockUser({
        id: 5,
        name: "To Delete",
        email: "delete@test.com",
        role: "CLIENT",
      })

      mockPrisma.user.delete.mockResolvedValue(deletedUser)

      const result = await deleteAdminUser(5)

      expect(result).toEqual(deletedUser)
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      })
      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "DELETE_USER",
        actorId: 1, // mockAdminUser.id
        targetId: 5,
        targetType: "User",
        details: {
          id: 5,
          email: "delete@test.com",
          name: "To Delete",
          role: "CLIENT",
        },
      })
    })

    it("should throw error if user not found", async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error("Record not found"))

      await expect(deleteAdminUser(999)).rejects.toThrow("Record not found")
    })

    it("should require admin authentication", async () => {
      setupAuthMock(mockCoachUser)

      await expect(deleteAdminUser(1)).rejects.toThrow("Forbidden")
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })
  })

  describe("bulkAdminUserAction", () => {
    it("should bulk delete users", async () => {
      const usersToDelete = [
        createMockUser({ id: 1, name: "User 1", email: "user1@test.com" }),
        createMockUser({ id: 2, name: "User 2", email: "user2@test.com" }),
        createMockUser({ id: 3, name: "User 3", email: "user3@test.com" }),
      ]

      mockPrisma.user.findMany.mockResolvedValue(usersToDelete)
      mockPrisma.user.deleteMany.mockResolvedValue({ count: 3 })

      const result = await bulkAdminUserAction({
        ids: [1, 2, 3],
        action: "delete",
      })

      expect(result).toEqual({ deleted: 3 })
      expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
      })
      expect(logAuditEvent).toHaveBeenCalledTimes(3)
    })

    it("should bulk update user roles", async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 })

      const result = await bulkAdminUserAction({
        ids: [1, 2],
        action: "role",
        value: "COACH",
      })

      expect(result).toEqual({ updated: 2 })
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { role: "COACH" },
      })
      expect(logAuditEvent).toHaveBeenCalledTimes(2)
    })

    it("should log audit event for each user in bulk delete", async () => {
      const usersToDelete = [
        createMockUser({ id: 5, name: "User 5", email: "user5@test.com", role: "CLIENT" }),
        createMockUser({ id: 6, name: "User 6", email: "user6@test.com", role: "COACH" }),
      ]

      mockPrisma.user.findMany.mockResolvedValue(usersToDelete)
      mockPrisma.user.deleteMany.mockResolvedValue({ count: 2 })

      await bulkAdminUserAction({
        ids: [5, 6],
        action: "delete",
      })

      expect(logAuditEvent).toHaveBeenNthCalledWith(1, {
        action: "BULK_DELETE_USER",
        actorId: 1,
        targetId: 5,
        targetType: "User",
        details: { id: 5, email: "user5@test.com", name: "User 5", role: "CLIENT" },
      })
      expect(logAuditEvent).toHaveBeenNthCalledWith(2, {
        action: "BULK_DELETE_USER",
        actorId: 1,
        targetId: 6,
        targetType: "User",
        details: { id: 6, email: "user6@test.com", name: "User 6", role: "COACH" },
      })
    })

    it("should log audit event for each user in bulk role update", async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 })

      await bulkAdminUserAction({
        ids: [7, 8],
        action: "role",
        value: "ADMIN",
      })

      expect(logAuditEvent).toHaveBeenNthCalledWith(1, {
        action: "BULK_UPDATE_ROLE",
        actorId: 1,
        targetId: 7,
        targetType: "User",
        details: { id: 7, newRole: "ADMIN" },
      })
      expect(logAuditEvent).toHaveBeenNthCalledWith(2, {
        action: "BULK_UPDATE_ROLE",
        actorId: 1,
        targetId: 8,
        targetType: "User",
        details: { id: 8, newRole: "ADMIN" },
      })
    })

    it("should require admin authentication", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        bulkAdminUserAction({
          ids: [1, 2],
          action: "delete",
        })
      ).rejects.toThrow("Forbidden")
    })
  })

  describe("Auth edge cases", () => {
    it("should prevent coach from accessing getAdminUsers", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getAdminUsers()).rejects.toThrow("Forbidden")
    })

    it("should prevent client from accessing createAdminUser", async () => {
      setupAuthMock(mockClientUser)

      await expect(
        createAdminUser({
          name: "New User",
          email: "new@test.com",
          role: "CLIENT",
        })
      ).rejects.toThrow("Forbidden")
    })

    it("should prevent unauthenticated access to deleteAdminUser", async () => {
      setupAuthMock(null)

      await expect(deleteAdminUser(1)).rejects.toThrow("Unauthorized")
    })
  })
})
