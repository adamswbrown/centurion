import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
} from "../mocks/auth"

vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("@/lib/auth")
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

let getCustomCohortTypes: typeof import("@/app/actions/cohort-types").getCustomCohortTypes
let createCustomCohortType: typeof import("@/app/actions/cohort-types").createCustomCohortType
let updateCustomCohortType: typeof import("@/app/actions/cohort-types").updateCustomCohortType
let deleteCustomCohortType: typeof import("@/app/actions/cohort-types").deleteCustomCohortType

beforeEach(async () => {
  vi.resetModules()
  const mod = await import("@/app/actions/cohort-types")
  getCustomCohortTypes = mod.getCustomCohortTypes
  createCustomCohortType = mod.createCustomCohortType
  updateCustomCohortType = mod.updateCustomCohortType
  deleteCustomCohortType = mod.deleteCustomCohortType
})

// ---------------------------------------------------------------------------
// getCustomCohortTypes
// ---------------------------------------------------------------------------
describe("getCustomCohortTypes", () => {
  it("returns all types sorted by label", async () => {
    const types = [
      { id: 1, label: "Alpha", description: null, createdById: "1", _count: { cohorts: 2 }, createdBy: { name: "Admin" } },
      { id: 2, label: "Beta", description: "desc", createdById: "1", _count: { cohorts: 0 }, createdBy: { name: "Admin" } },
    ]
    mockPrisma.customCohortType.findMany.mockResolvedValue(types)

    const result = await getCustomCohortTypes()

    expect(result).toEqual(types)
    expect(mockPrisma.customCohortType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.objectContaining({ label: "asc" }),
      })
    )
  })

  it("includes _count and creator in results", async () => {
    const types = [
      { id: 1, label: "Type A", description: null, createdById: "1", _count: { cohorts: 5 }, createdBy: { name: "Admin" } },
    ]
    mockPrisma.customCohortType.findMany.mockResolvedValue(types)

    const result = await getCustomCohortTypes()

    expect(result[0]._count).toBeDefined()
    expect(result[0].createdBy).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// createCustomCohortType
// ---------------------------------------------------------------------------
describe("createCustomCohortType", () => {
  it("creates a new custom cohort type", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue(null)
    mockPrisma.customCohortType.create.mockResolvedValue({
      id: 1,
      label: "Wellness",
      description: "Wellness program",
      createdById: "1",
    })

    const result = await createCustomCohortType({
      label: "Wellness",
      description: "Wellness program",
    })

    expect(result.label).toBe("Wellness")
    expect(mockPrisma.customCohortType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          label: "Wellness",
          description: "Wellness program",
        }),
      })
    )
  })

  it("throws on duplicate label", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue({
      id: 1,
      label: "Wellness",
    })

    await expect(
      createCustomCohortType({ label: "Wellness", description: null })
    ).rejects.toThrow()
  })

  it("throws on empty label", async () => {
    setupAuthMock(mockAdminUser)

    await expect(
      createCustomCohortType({ label: "", description: null })
    ).rejects.toThrow()
  })

  it("requires admin role", async () => {
    setupAuthMock(mockCoachUser)

    await expect(
      createCustomCohortType({ label: "Wellness", description: null })
    ).rejects.toThrow()
  })

  it("forbids client role", async () => {
    setupAuthMock(mockClientUser)

    await expect(
      createCustomCohortType({ label: "Wellness", description: null })
    ).rejects.toThrow()
  })

  it("creates an audit log entry", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue(null)
    mockPrisma.customCohortType.create.mockResolvedValue({
      id: 1,
      label: "Wellness",
      description: "A wellness program",
      createdById: "1",
    })

    const { logAuditEvent } = await import("@/lib/audit-log")

    await createCustomCohortType({ label: "Wellness", description: "A wellness program" })

    expect(logAuditEvent).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// updateCustomCohortType
// ---------------------------------------------------------------------------
describe("updateCustomCohortType", () => {
  it("updates label", async () => {
    setupAuthMock(mockAdminUser)
    // First call: find by id, Second call: find by label (duplicate check)
    mockPrisma.customCohortType.findUnique
      .mockResolvedValueOnce({ id: 1, label: "Old", description: null })
      .mockResolvedValueOnce(null) // no duplicate
    mockPrisma.customCohortType.update.mockResolvedValue({
      id: 1,
      label: "New",
      description: null,
    })

    const result = await updateCustomCohortType({
      id: 1,
      label: "New",
    })

    expect(result.label).toBe("New")
    expect(mockPrisma.customCohortType.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ label: "New" }),
      })
    )
  })

  it("updates description", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue({
      id: 1,
      label: "Type",
      description: null,
    })
    mockPrisma.customCohortType.update.mockResolvedValue({
      id: 1,
      label: "Type",
      description: "Updated desc",
    })

    const result = await updateCustomCohortType({
      id: 1,
      label: "Type",
      description: "Updated desc",
    })

    expect(result.description).toBe("Updated desc")
  })

  it("throws when type not found", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue(null)

    await expect(
      updateCustomCohortType({ id: 999, label: "X", description: null })
    ).rejects.toThrow()
  })

  it("throws on duplicate label", async () => {
    setupAuthMock(mockAdminUser)
    // First call: find by id, Second call: find by label (duplicate exists)
    mockPrisma.customCohortType.findUnique
      .mockResolvedValueOnce({ id: 1, label: "Old", description: null })
      .mockResolvedValueOnce({ id: 2, label: "Taken" })

    await expect(
      updateCustomCohortType({ id: 1, label: "Taken" })
    ).rejects.toThrow()
  })

  it("requires admin role", async () => {
    setupAuthMock(mockCoachUser)

    await expect(
      updateCustomCohortType({ id: 1, label: "X", description: null })
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// deleteCustomCohortType
// ---------------------------------------------------------------------------
describe("deleteCustomCohortType", () => {
  it("deletes a custom cohort type", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue({
      id: 1,
      label: "Wellness",
      _count: { cohorts: 0 },
    })
    mockPrisma.customCohortType.delete.mockResolvedValue({ id: 1 })

    await deleteCustomCohortType(1)

    expect(mockPrisma.customCohortType.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    )
  })

  it("throws when type not found", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue(null)

    await expect(deleteCustomCohortType(999)).rejects.toThrow()
  })

  it("throws when cohorts are using the type", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue({
      id: 1,
      label: "Wellness",
      _count: { cohorts: 3 },
    })

    await expect(deleteCustomCohortType(1)).rejects.toThrow()
  })

  it("requires admin role", async () => {
    setupAuthMock(mockCoachUser)

    await expect(deleteCustomCohortType(1)).rejects.toThrow()
  })

  it("creates an audit log entry on deletion", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.customCohortType.findUnique.mockResolvedValue({
      id: 1,
      label: "Wellness",
      _count: { cohorts: 0 },
    })
    mockPrisma.customCohortType.delete.mockResolvedValue({ id: 1 })

    const { logAuditEvent } = await import("@/lib/audit-log")

    await deleteCustomCohortType(1)

    expect(logAuditEvent).toHaveBeenCalled()
  })
})
