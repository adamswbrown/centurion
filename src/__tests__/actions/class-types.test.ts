/**
 * ClassType Server Actions Tests
 *
 * Tests for class type CRUD server actions including
 * creation, updating, deletion (soft), and queries.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockPrisma, resetPrismaMocks } from "../mocks/prisma"

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
  requireAdmin: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
  requireCoach: vi.fn().mockResolvedValue({ id: "1", role: "COACH" }),
  requireRole: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Import functions under test after mocks
import {
  getClassTypes,
  getClassTypeById,
  createClassType,
  updateClassType,
  deleteClassType,
} from "@/app/actions/class-types"
import { requireAdmin, requireCoach } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mockClassType(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "HIIT",
    description: "High Intensity Interval Training",
    color: "#FF0000",
    defaultCapacity: 12,
    defaultDurationMins: 60,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ClassType Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // getClassTypes
  // -------------------------------------------------------------------------

  describe("getClassTypes", () => {
    it("should return all class types ordered by name", async () => {
      const types = [
        mockClassType({ id: 1, name: "HIIT" }),
        mockClassType({ id: 2, name: "Yoga" }),
      ]
      mockPrisma.classType.findMany.mockResolvedValue(types)

      const result = await getClassTypes()

      expect(result).toHaveLength(2)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classType.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: "asc" },
      })
    })

    it("should filter active-only class types when activeOnly is true", async () => {
      mockPrisma.classType.findMany.mockResolvedValue([])

      await getClassTypes({ activeOnly: true })

      expect(mockPrisma.classType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: "asc" },
      })
    })

    it("should return all class types when activeOnly is false or undefined", async () => {
      mockPrisma.classType.findMany.mockResolvedValue([])

      await getClassTypes({ activeOnly: false })

      expect(mockPrisma.classType.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: "asc" },
      })
    })

    it("should require coach auth", async () => {
      mockPrisma.classType.findMany.mockResolvedValue([])

      await getClassTypes()

      expect(requireCoach).toHaveBeenCalled()
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireCoach).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(getClassTypes()).rejects.toThrow("Unauthorized")
    })
  })

  // -------------------------------------------------------------------------
  // getClassTypeById
  // -------------------------------------------------------------------------

  describe("getClassTypeById", () => {
    it("should return a class type by id", async () => {
      const ct = mockClassType({ id: 5 })
      mockPrisma.classType.findUniqueOrThrow.mockResolvedValue(ct)

      const result = await getClassTypeById(5)

      expect(result).toEqual(ct)
      expect(requireCoach).toHaveBeenCalled()
      expect(mockPrisma.classType.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 5 },
      })
    })

    it("should throw when class type not found", async () => {
      mockPrisma.classType.findUniqueOrThrow.mockRejectedValue(
        new Error("No ClassType found")
      )

      await expect(getClassTypeById(999)).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // createClassType
  // -------------------------------------------------------------------------

  describe("createClassType", () => {
    it("should create a class type with valid input", async () => {
      const created = mockClassType({ id: 10, name: "Pilates" })
      mockPrisma.classType.create.mockResolvedValue(created)

      const result = await createClassType({
        name: "Pilates",
        description: "Core strength",
        color: "#00FF00",
        defaultCapacity: 15,
        defaultDurationMins: 45,
      })

      expect(result).toEqual(created)
      expect(requireAdmin).toHaveBeenCalled()
      expect(mockPrisma.classType.create).toHaveBeenCalledWith({
        data: {
          name: "Pilates",
          description: "Core strength",
          color: "#00FF00",
          defaultCapacity: 15,
          defaultDurationMins: 45,
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should use defaults for capacity and duration when not provided", async () => {
      const created = mockClassType({ id: 11, name: "Spin" })
      mockPrisma.classType.create.mockResolvedValue(created)

      await createClassType({ name: "Spin" })

      expect(mockPrisma.classType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Spin",
          defaultCapacity: 12,
          defaultDurationMins: 60,
        }),
      })
    })

    it("should require admin auth", async () => {
      const created = mockClassType()
      mockPrisma.classType.create.mockResolvedValue(created)

      await createClassType({ name: "Test" })

      expect(requireAdmin).toHaveBeenCalled()
    })

    it("should reject when name is empty", async () => {
      await expect(
        createClassType({ name: "", defaultCapacity: 12, defaultDurationMins: 60 })
      ).rejects.toThrow()
    })

    it("should reject when defaultCapacity is less than 1", async () => {
      await expect(
        createClassType({
          name: "Test",
          defaultCapacity: 0,
          defaultDurationMins: 60,
        })
      ).rejects.toThrow()
    })

    it("should reject when defaultDurationMins is less than 1", async () => {
      await expect(
        createClassType({
          name: "Test",
          defaultCapacity: 12,
          defaultDurationMins: 0,
        })
      ).rejects.toThrow()
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(createClassType({ name: "Test" })).rejects.toThrow(
        "Unauthorized"
      )
    })
  })

  // -------------------------------------------------------------------------
  // updateClassType
  // -------------------------------------------------------------------------

  describe("updateClassType", () => {
    it("should update a class type with valid input", async () => {
      const updated = mockClassType({
        id: 1,
        name: "Updated HIIT",
        defaultCapacity: 20,
      })
      mockPrisma.classType.update.mockResolvedValue(updated)

      const result = await updateClassType({
        id: 1,
        name: "Updated HIIT",
        description: "Updated description",
        color: "#FF0000",
        defaultCapacity: 20,
        defaultDurationMins: 60,
        isActive: true,
      })

      expect(result).toEqual(updated)
      expect(requireAdmin).toHaveBeenCalled()
      expect(mockPrisma.classType.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "Updated HIIT",
          description: "Updated description",
          color: "#FF0000",
          defaultCapacity: 20,
          defaultDurationMins: 60,
          isActive: true,
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should reject when name is empty", async () => {
      await expect(
        updateClassType({
          id: 1,
          name: "",
          defaultCapacity: 12,
          defaultDurationMins: 60,
          isActive: true,
        })
      ).rejects.toThrow()
    })

    it("should reject when defaultCapacity is less than 1", async () => {
      await expect(
        updateClassType({
          id: 1,
          name: "Test",
          defaultCapacity: 0,
          defaultDurationMins: 60,
          isActive: true,
        })
      ).rejects.toThrow()
    })

    it("should reject non-integer id", async () => {
      await expect(
        updateClassType({
          id: 1.5,
          name: "Test",
          defaultCapacity: 12,
          defaultDurationMins: 60,
          isActive: true,
        })
      ).rejects.toThrow()
    })

    it("should require admin auth", async () => {
      const updated = mockClassType()
      mockPrisma.classType.update.mockResolvedValue(updated)

      await updateClassType({
        id: 1,
        name: "Test",
        defaultCapacity: 12,
        defaultDurationMins: 60,
        isActive: true,
      })

      expect(requireAdmin).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // deleteClassType (soft delete)
  // -------------------------------------------------------------------------

  describe("deleteClassType", () => {
    it("should soft-delete a class type by setting isActive to false", async () => {
      const deactivated = mockClassType({ id: 3, isActive: false })
      mockPrisma.classType.update.mockResolvedValue(deactivated)

      const result = await deleteClassType(3)

      expect(result).toEqual(deactivated)
      expect(requireAdmin).toHaveBeenCalled()
      expect(mockPrisma.classType.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { isActive: false },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/sessions")
    })

    it("should require admin auth", async () => {
      const deactivated = mockClassType({ isActive: false })
      mockPrisma.classType.update.mockResolvedValue(deactivated)

      await deleteClassType(1)

      expect(requireAdmin).toHaveBeenCalled()
    })

    it("should reject unauthenticated users", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(deleteClassType(1)).rejects.toThrow("Unauthorized")
    })

    it("should propagate Prisma errors when class type not found", async () => {
      mockPrisma.classType.update.mockRejectedValue(
        new Error("Record to update not found")
      )

      await expect(deleteClassType(999)).rejects.toThrow()
    })
  })
})
