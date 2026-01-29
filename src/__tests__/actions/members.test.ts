/**
 * Members Server Actions Tests
 *
 * Tests for member management server actions including
 * listing, creating, updating, and deleting CLIENT users.
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

// Mock next/cache and next/navigation
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Now import the functions to test (after mocks are set up)
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from "@/app/actions/members"

// Helper to create FormData from object
function createFormData(data: Record<string, string | undefined>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      formData.append(key, value)
    }
  }
  return formData
}

describe("Members Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()

    // Default: authenticated as coach
    setupAuthMock(mockCoachUser)
  })

  describe("getMembers", () => {
    it("should return all CLIENT users with counts", async () => {
      const mockMembers = [
        {
          id: 1,
          name: "Member One",
          email: "member1@test.com",
          image: null,
          createdAt: new Date(),
          _count: {
            appointmentsAsClient: 5,
            cohortMemberships: 2,
          },
        },
        {
          id: 2,
          name: "Member Two",
          email: "member2@test.com",
          image: "avatar.jpg",
          createdAt: new Date(),
          _count: {
            appointmentsAsClient: 3,
            cohortMemberships: 1,
          },
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockMembers)

      const result = await getMembers()

      expect(result).toEqual(mockMembers)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: "CLIENT" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          _count: {
            select: {
              appointmentsAsClient: true,
              cohortMemberships: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    })

    it("should return empty array when no members exist", async () => {
      mockPrisma.user.findMany.mockResolvedValue([])

      const result = await getMembers()

      expect(result).toEqual([])
      expect(mockPrisma.user.findMany).toHaveBeenCalled()
    })

    it("should require coach authentication", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMembers()).rejects.toThrow()
    })
  })

  describe("getMemberById", () => {
    it("should return member with full relations", async () => {
      const mockMember = {
        id: 1,
        name: "Test Member",
        email: "member@test.com",
        image: null,
        role: "CLIENT",
        createdAt: new Date(),
        appointmentsAsClient: [],
        cohortMemberships: [],
        invoices: [],
        entries: [],
        questionnaireResponses: [],
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockMember)

      const result = await getMemberById(1)

      expect(result).toEqual(mockMember)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1, role: "CLIENT" },
        include: {
          appointmentsAsClient: {
            orderBy: { startTime: "desc" },
            take: 20,
            include: {
              coach: { select: { id: true, name: true } },
            },
          },
          cohortMemberships: {
            include: {
              cohort: {
                select: {
                  id: true,
                  name: true,
                  checkInFrequencyDays: true,
                },
              },
            },
          },
          invoices: {
            orderBy: { month: "desc" },
            take: 10,
          },
          entries: {
            orderBy: { date: "desc" },
            take: 30,
          },
          questionnaireResponses: {
            orderBy: { updatedAt: "desc" },
            take: 20,
            include: {
              bundle: {
                select: {
                  id: true,
                  weekNumber: true,
                  cohort: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })
    })

    it("should return null when member not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getMemberById(999)

      expect(result).toBeNull()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 999, role: "CLIENT" },
        })
      )
    })

    it("should require coach authentication", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMemberById(1)).rejects.toThrow()
    })
  })

  describe("createMember", () => {
    it("should create member successfully with valid data", async () => {
      const formData = createFormData({
        name: "New Member",
        email: "new@test.com",
        image: "photo.jpg",
      })

      const mockCreatedMember = {
        id: 1,
        name: "New Member",
        email: "new@test.com",
        image: "photo.jpg",
        role: "CLIENT",
        emailVerified: false,
        createdAt: new Date(),
      }

      // Mock no existing user with this email
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedMember)

      const result = await createMember(formData)

      expect(result.success).toBe(true)
      expect(result.member).toEqual(mockCreatedMember)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "new@test.com" },
      })
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "New Member",
          email: "new@test.com",
          image: "photo.jpg",
          role: "CLIENT",
          emailVerified: false,
        },
      })
    })

    it("should create member without image field", async () => {
      const formData = createFormData({
        name: "New Member",
        email: "new@test.com",
        image: "", // Empty string for optional field
      })

      const mockCreatedMember = {
        id: 1,
        name: "New Member",
        email: "new@test.com",
        image: undefined,
        role: "CLIENT",
        emailVerified: false,
        createdAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedMember)

      const result = await createMember(formData)

      expect(result.success).toBe(true)
      expect(result.member).toEqual(mockCreatedMember)
    })

    it("should return error for duplicate email", async () => {
      const formData = createFormData({
        name: "Duplicate Member",
        email: "existing@test.com",
        image: "",
      })

      // Mock existing user with same email
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 5,
        name: "Existing User",
        email: "existing@test.com",
        image: null,
        role: "CLIENT",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await createMember(formData)

      expect(result.error).toBe("User with this email already exists")
      expect(result.success).toBeUndefined()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it("should return error for invalid name (too short)", async () => {
      const formData = createFormData({
        name: "A",
        email: "valid@test.com",
      })

      const result = await createMember(formData)

      expect(result.error).toBe("Name must be at least 2 characters")
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it("should return error for invalid email format", async () => {
      const formData = createFormData({
        name: "Valid Name",
        email: "not-an-email",
      })

      const result = await createMember(formData)

      expect(result.error).toBe("Invalid email address")
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it("should allow coach to create member", async () => {
      setupAuthMock(mockCoachUser)

      const formData = createFormData({
        name: "Coach Created",
        email: "coach-created@test.com",
        image: "",
      })

      const mockCreatedMember = {
        id: 10,
        name: "Coach Created",
        email: "coach-created@test.com",
        image: undefined,
        role: "CLIENT",
        emailVerified: false,
        createdAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedMember)

      const result = await createMember(formData)

      expect(result.success).toBe(true)
      expect(result.member).toEqual(mockCreatedMember)
    })

    it("should allow admin to create member", async () => {
      setupAuthMock(mockAdminUser)

      const formData = createFormData({
        name: "Admin Created",
        email: "admin-created@test.com",
        image: "",
      })

      const mockCreatedMember = {
        id: 11,
        name: "Admin Created",
        email: "admin-created@test.com",
        image: undefined,
        role: "CLIENT",
        emailVerified: false,
        createdAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedMember)

      const result = await createMember(formData)

      expect(result.success).toBe(true)
      expect(result.member).toEqual(mockCreatedMember)
    })
  })

  describe("updateMember", () => {
    it("should update member successfully", async () => {
      const formData = createFormData({
        name: "Updated Name",
        email: "updated@test.com",
        image: "",
      })

      const existingMember = {
        id: 1,
        name: "Old Name",
        email: "old@test.com",
        image: null,
        role: "CLIENT",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedMember = {
        ...existingMember,
        name: "Updated Name",
        email: "updated@test.com",
      }

      mockPrisma.user.findUnique.mockResolvedValue(existingMember)
      mockPrisma.user.update.mockResolvedValue(updatedMember)

      const result = await updateMember(1, formData)

      expect(result.success).toBe(true)
      expect(result.member).toEqual(updatedMember)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "Updated Name",
          email: "updated@test.com",
          image: "", // Empty string is included
        },
      })
    })

    it("should update partial fields", async () => {
      // Update name, keep email as is (form would submit current value)
      const formData = new FormData()
      formData.append("name", "Only Name Updated")
      formData.append("email", "same@test.com") // Current email value
      formData.append("image", "")

      const existingMember = {
        id: 1,
        name: "Old Name",
        email: "same@test.com",
        image: null,
        role: "CLIENT",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedMember = {
        ...existingMember,
        name: "Only Name Updated",
      }

      mockPrisma.user.findUnique.mockResolvedValue(existingMember)
      mockPrisma.user.update.mockResolvedValue(updatedMember)

      const result = await updateMember(1, formData)

      expect(result.success).toBe(true)
      expect(result.member?.name).toBe("Only Name Updated")
    })

    it("should return error if member not found", async () => {
      const formData = new FormData()
      formData.append("name", "New Name")
      formData.append("email", "valid@test.com")
      formData.append("image", "")

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await updateMember(999, formData)

      expect(result.error).toBe("Member not found")
      expect(result.success).toBeUndefined()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("should return error if user is not CLIENT role", async () => {
      const formData = new FormData()
      formData.append("name", "Coach Name")
      formData.append("email", "coach@test.com")
      formData.append("image", "")

      const coachUser = {
        id: 2,
        name: "Coach",
        email: "coach@test.com",
        image: null,
        role: "COACH",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(coachUser)

      const result = await updateMember(2, formData)

      expect(result.error).toBe("Member not found")
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("should return error for invalid input (name too short)", async () => {
      const formData = createFormData({
        name: "X",
      })

      const result = await updateMember(1, formData)

      expect(result.error).toBe("Name must be at least 2 characters")
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("should return error for invalid email format", async () => {
      const formData = new FormData()
      formData.append("name", "Valid Name")
      formData.append("email", "bad-email")
      formData.append("image", "")

      const result = await updateMember(1, formData)

      expect(result.error).toBe("Invalid email address")
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe("deleteMember", () => {
    it("should delete member successfully", async () => {
      const existingMember = {
        id: 1,
        name: "Member to Delete",
        email: "delete@test.com",
        image: null,
        role: "CLIENT",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(existingMember)
      mockPrisma.user.delete.mockResolvedValue(existingMember)

      const result = await deleteMember(1)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it("should return error if member not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await deleteMember(999)

      expect(result.error).toBe("Member not found")
      expect(result.success).toBeUndefined()
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it("should return error if user is not CLIENT role", async () => {
      const adminUser = {
        id: 1,
        name: "Admin",
        email: "admin@test.com",
        image: null,
        role: "ADMIN",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(adminUser)

      const result = await deleteMember(1)

      expect(result.error).toBe("Member not found")
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it("should require coach authentication", async () => {
      setupAuthMock(mockClientUser)

      await expect(deleteMember(1)).rejects.toThrow()
    })
  })

  describe("Auth edge cases", () => {
    it("should prevent client from calling getMembers", async () => {
      setupAuthMock(mockClientUser)

      await expect(getMembers()).rejects.toThrow()
    })

    it("should prevent client from calling createMember", async () => {
      setupAuthMock(mockClientUser)

      const formData = createFormData({
        name: "Test",
        email: "test@test.com",
      })

      await expect(createMember(formData)).rejects.toThrow()
    })

    it("should prevent client from calling updateMember", async () => {
      setupAuthMock(mockClientUser)

      const formData = createFormData({
        name: "Test",
      })

      await expect(updateMember(1, formData)).rejects.toThrow()
    })
  })
})
