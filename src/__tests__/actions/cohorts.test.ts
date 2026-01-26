/**
 * Cohorts Server Actions Tests
 *
 * Tests for cohort-related server actions including
 * CRUD operations and membership management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { CohortStatus, MembershipStatus } from "@prisma/client"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  resetAuthMocks,
  resetEmailMocks,
  sentEmails,
} from "../mocks"

import {
  createMockUser,
  createMockCohort,
  createMockCohortMembership,
  createMockCoachCohortMembership,
  resetIdCounters,
} from "../utils/test-data"

// Now import the functions to test
import {
  getCohorts,
  getCohortById,
  createCohort,
  updateCohort,
  updateCohortStatus,
  deleteCohort,
  addMemberToCohort,
  removeMemberFromCohort,
  updateMembershipStatus,
  addCoachToCohort,
  removeCoachFromCohort,
  getAllCoaches,
  getCheckInConfig,
  updateCheckInConfig,
} from "@/app/actions/cohorts"

describe("Cohorts Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetEmailMocks()
    resetIdCounters()

    // Default: authenticated as admin
    setupAuthMock(mockAdminUser)
  })

  describe("getCohorts", () => {
    it("should return all cohorts with counts", async () => {
      const cohorts = [
        {
          ...createMockCohort({ id: 1, name: "Spring 2024" }),
          _count: { members: 10, coaches: 2 },
        },
        {
          ...createMockCohort({ id: 2, name: "Summer 2024" }),
          _count: { members: 8, coaches: 1 },
        },
      ]

      mockPrisma.cohort.findMany.mockResolvedValue(cohorts)

      // Coach can view cohorts
      setupAuthMock(mockCoachUser)
      const result = await getCohorts()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Spring 2024")
      expect(result[0]._count.members).toBe(10)
    })

    it("should filter by status", async () => {
      mockPrisma.cohort.findMany.mockResolvedValue([])

      await getCohorts({ status: CohortStatus.ACTIVE })

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CohortStatus.ACTIVE },
        })
      )
    })

    it("should reject unauthenticated requests", async () => {
      setupAuthMock(null)

      await expect(getCohorts()).rejects.toThrow()
    })

    it("should reject client role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getCohorts()).rejects.toThrow()
    })
  })

  describe("getCohortById", () => {
    it("should return cohort with members and coaches", async () => {
      const member = createMockUser({ id: 10, name: "Member User" })
      const coach = createMockUser({ id: 20, name: "Coach User" })

      const cohort = {
        ...createMockCohort({ id: 1, name: "Spring 2024" }),
        members: [
          {
            ...createMockCohortMembership({ userId: 10, cohortId: 1 }),
            user: { id: 10, name: member.name, email: member.email, image: null },
          },
        ],
        coaches: [
          {
            ...createMockCoachCohortMembership({ coachId: 20, cohortId: 1 }),
            coach: { id: 20, name: coach.name, email: coach.email },
          },
        ],
      }

      mockPrisma.cohort.findUnique.mockResolvedValue(cohort)
      setupAuthMock(mockCoachUser)

      const result = await getCohortById(1)

      expect(result.name).toBe("Spring 2024")
      expect(result.members).toHaveLength(1)
      expect(result.coaches).toHaveLength(1)
    })

    it("should throw error when cohort not found", async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null)
      setupAuthMock(mockCoachUser)

      await expect(getCohortById(999)).rejects.toThrow("Cohort not found")
    })
  })

  describe("createCohort", () => {
    it("should create a new cohort", async () => {
      const newCohort = createMockCohort({
        id: 1,
        name: "Fall 2024",
        description: "New cohort for fall",
      })

      mockPrisma.cohort.findFirst.mockResolvedValue(null) // No existing cohort with same name
      mockPrisma.cohort.create.mockResolvedValue(newCohort)

      const result = await createCohort({
        name: "Fall 2024",
        description: "New cohort for fall",
        startDate: "2024-09-01",
        endDate: "2024-12-01",
      })

      expect(result.name).toBe("Fall 2024")
      expect(mockPrisma.cohort.create).toHaveBeenCalled()
    })

    it("should require admin role", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        createCohort({
          name: "Fall 2024",
          startDate: "2024-09-01",
          endDate: "2024-12-01",
        })
      ).rejects.toThrow()
    })

    it("should validate end date is after start date", async () => {
      mockPrisma.cohort.findFirst.mockResolvedValue(null)

      await expect(
        createCohort({
          name: "Fall 2024",
          startDate: "2024-12-01",
          endDate: "2024-09-01", // End before start
        })
      ).rejects.toThrow("End date must be after start date")
    })

    it("should prevent duplicate cohort names", async () => {
      const existingCohort = createMockCohort({ name: "Fall 2024" })
      mockPrisma.cohort.findFirst.mockResolvedValue(existingCohort)

      await expect(
        createCohort({
          name: "Fall 2024",
          startDate: "2024-09-01",
          endDate: "2024-12-01",
        })
      ).rejects.toThrow("A cohort with this name already exists")
    })

    it("should validate required fields", async () => {
      await expect(
        createCohort({
          name: "", // Empty name
          startDate: "2024-09-01",
          endDate: "2024-12-01",
        })
      ).rejects.toThrow()
    })
  })

  describe("updateCohort", () => {
    it("should update cohort details", async () => {
      const existingCohort = createMockCohort({ id: 1, name: "Fall 2024" })
      const updatedCohort = { ...existingCohort, name: "Fall 2024 Updated" }

      mockPrisma.cohort.findUnique.mockResolvedValue(existingCohort)
      mockPrisma.cohort.findFirst.mockResolvedValue(null) // No name conflict
      mockPrisma.cohort.update.mockResolvedValue(updatedCohort)

      const result = await updateCohort({
        id: 1,
        name: "Fall 2024 Updated",
      })

      expect(result.name).toBe("Fall 2024 Updated")
    })

    it("should throw error when cohort not found", async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null)

      await expect(
        updateCohort({
          id: 999,
          name: "Updated Name",
        })
      ).rejects.toThrow("Cohort not found")
    })

    it("should prevent duplicate names when updating", async () => {
      const existingCohort = createMockCohort({ id: 1, name: "Fall 2024" })
      const conflictingCohort = createMockCohort({ id: 2, name: "Spring 2024" })

      mockPrisma.cohort.findUnique.mockResolvedValue(existingCohort)
      mockPrisma.cohort.findFirst.mockResolvedValue(conflictingCohort) // Name already taken

      await expect(
        updateCohort({
          id: 1,
          name: "Spring 2024",
        })
      ).rejects.toThrow("A cohort with this name already exists")
    })
  })

  describe("updateCohortStatus", () => {
    it("should update cohort status", async () => {
      const existingCohort = createMockCohort({
        id: 1,
        status: CohortStatus.ACTIVE,
      })
      const updatedCohort = { ...existingCohort, status: CohortStatus.COMPLETED }

      mockPrisma.cohort.findUnique.mockResolvedValue(existingCohort)
      mockPrisma.cohort.update.mockResolvedValue(updatedCohort)

      const result = await updateCohortStatus(1, CohortStatus.COMPLETED)

      expect(result.status).toBe(CohortStatus.COMPLETED)
    })

    it("should throw error when cohort not found", async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null)

      await expect(
        updateCohortStatus(999, CohortStatus.COMPLETED)
      ).rejects.toThrow("Cohort not found")
    })
  })

  describe("deleteCohort", () => {
    it("should delete cohort and its memberships", async () => {
      const existingCohort = {
        ...createMockCohort({ id: 1 }),
        members: [createMockCohortMembership({ cohortId: 1, userId: 10 })],
        coaches: [createMockCoachCohortMembership({ cohortId: 1, coachId: 20 })],
      }

      mockPrisma.cohort.findUnique.mockResolvedValue(existingCohort)
      mockPrisma.$transaction.mockResolvedValue([])

      const result = await deleteCohort(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it("should throw error when cohort not found", async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null)

      await expect(deleteCohort(999)).rejects.toThrow("Cohort not found")
    })
  })

  describe("addMemberToCohort", () => {
    it("should add a member to a cohort", async () => {
      const cohort = {
        ...createMockCohort({ id: 1, name: "Spring 2024" }),
        members: [],
      }
      const member = createMockUser({ id: 10, email: "member@test.com" })
      const coach = createMockUser({ id: 1, name: "Admin User" })
      const membership = createMockCohortMembership({ cohortId: 1, userId: 10 })

      mockPrisma.cohort.findUnique.mockResolvedValue(cohort)
      mockPrisma.cohortMembership.create.mockResolvedValue(membership)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(member) // First call for member
        .mockResolvedValueOnce(coach) // Second call for coach

      const result = await addMemberToCohort(1, 10)

      expect(result.userId).toBe(10)
      expect(mockPrisma.cohortMembership.create).toHaveBeenCalled()
    })

    it("should prevent adding duplicate members", async () => {
      const cohort = {
        ...createMockCohort({ id: 1 }),
        members: [{ userId: 10 }],
      }

      mockPrisma.cohort.findUnique.mockResolvedValue(cohort)

      await expect(addMemberToCohort(1, 10)).rejects.toThrow(
        "Member is already in this cohort"
      )
    })

    it("should send cohort invite email", async () => {
      const cohort = {
        ...createMockCohort({ id: 1, name: "Spring 2024" }),
        members: [],
      }
      const member = createMockUser({
        id: 10,
        email: "member@test.com",
        isTestUser: true,
      })
      const coach = createMockUser({ id: 1, name: "Admin User" })
      const membership = createMockCohortMembership({ cohortId: 1, userId: 10 })

      mockPrisma.cohort.findUnique.mockResolvedValue(cohort)
      mockPrisma.cohortMembership.create.mockResolvedValue(membership)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(coach)

      await addMemberToCohort(1, 10)

      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].templateKey).toBe("cohort_invite")
      expect(sentEmails[0].to).toBe("member@test.com")
    })
  })

  describe("removeMemberFromCohort", () => {
    it("should remove a member from a cohort", async () => {
      mockPrisma.cohortMembership.delete.mockResolvedValue({})

      const result = await removeMemberFromCohort(1, 10)

      expect(result.success).toBe(true)
      expect(mockPrisma.cohortMembership.delete).toHaveBeenCalledWith({
        where: {
          cohortId_userId: { cohortId: 1, userId: 10 },
        },
      })
    })
  })

  describe("updateMembershipStatus", () => {
    it("should update membership status", async () => {
      const membership = createMockCohortMembership({
        cohortId: 1,
        userId: 10,
        status: MembershipStatus.ACTIVE,
      })
      const updatedMembership = {
        ...membership,
        status: MembershipStatus.INACTIVE,
        leftAt: expect.any(Date),
      }

      mockPrisma.cohortMembership.findUnique.mockResolvedValue(membership)
      mockPrisma.cohortMembership.update.mockResolvedValue(updatedMembership)

      const result = await updateMembershipStatus(1, 10, MembershipStatus.INACTIVE)

      expect(result.status).toBe(MembershipStatus.INACTIVE)
    })

    it("should throw error when membership not found", async () => {
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(null)

      await expect(
        updateMembershipStatus(1, 10, MembershipStatus.INACTIVE)
      ).rejects.toThrow("Membership not found")
    })

    it("should set leftAt when status becomes INACTIVE", async () => {
      const membership = createMockCohortMembership({
        cohortId: 1,
        userId: 10,
      })

      mockPrisma.cohortMembership.findUnique.mockResolvedValue(membership)
      mockPrisma.cohortMembership.update.mockResolvedValue({
        ...membership,
        status: MembershipStatus.INACTIVE,
      })

      await updateMembershipStatus(1, 10, MembershipStatus.INACTIVE)

      expect(mockPrisma.cohortMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MembershipStatus.INACTIVE,
            leftAt: expect.any(Date),
          }),
        })
      )
    })
  })

  describe("addCoachToCohort", () => {
    it("should add a coach to a cohort", async () => {
      const cohort = {
        ...createMockCohort({ id: 1 }),
        coaches: [],
      }
      const assignment = createMockCoachCohortMembership({ cohortId: 1, coachId: 20 })

      mockPrisma.cohort.findUnique.mockResolvedValue(cohort)
      mockPrisma.coachCohortMembership.create.mockResolvedValue(assignment)

      const result = await addCoachToCohort(1, 20)

      expect(result.coachId).toBe(20)
    })

    it("should prevent adding duplicate coaches", async () => {
      const cohort = {
        ...createMockCohort({ id: 1 }),
        coaches: [{ coachId: 20 }],
      }

      mockPrisma.cohort.findUnique.mockResolvedValue(cohort)

      await expect(addCoachToCohort(1, 20)).rejects.toThrow(
        "Coach is already assigned to this cohort"
      )
    })
  })

  describe("removeCoachFromCohort", () => {
    it("should remove a coach from a cohort", async () => {
      mockPrisma.coachCohortMembership.delete.mockResolvedValue({})

      const result = await removeCoachFromCohort(1, 20)

      expect(result.success).toBe(true)
    })
  })

  describe("getAllCoaches", () => {
    it("should return all admin and coach users", async () => {
      const coaches = [
        { id: 1, name: "Admin User", email: "admin@test.com" },
        { id: 2, name: "Coach User", email: "coach@test.com" },
      ]

      mockPrisma.user.findMany.mockResolvedValue(coaches)

      const result = await getAllCoaches()

      expect(result).toHaveLength(2)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: { in: ["ADMIN", "COACH"] } },
        })
      )
    })
  })

  describe("Check-in Config", () => {
    describe("getCheckInConfig", () => {
      it("should return default config when none exists", async () => {
        setupAuthMock(mockCoachUser)
        mockPrisma.cohortCheckInConfig.findUnique.mockResolvedValue(null)

        const result = await getCheckInConfig(1)

        expect(result.enabledPrompts).toBeDefined()
        expect(result.customPrompt1).toBeNull()
      })

      it("should return saved config with mandatory prompts included", async () => {
        setupAuthMock(mockCoachUser)
        mockPrisma.cohortCheckInConfig.findUnique.mockResolvedValue({
          id: 1,
          cohortId: 1,
          prompts: {
            enabledPrompts: ["weight", "steps"],
            customPrompt1: "Custom question?",
            customPrompt1Type: "text",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await getCheckInConfig(1)

        expect(result.enabledPrompts).toContain("weight")
        expect(result.customPrompt1).toBe("Custom question?")
      })
    })

    describe("updateCheckInConfig", () => {
      it("should update check-in config", async () => {
        setupAuthMock(mockCoachUser)
        mockPrisma.cohortCheckInConfig.upsert.mockResolvedValue({
          id: 1,
          cohortId: 1,
          prompts: {
            enabledPrompts: ["weight", "steps", "calories"],
            customPrompt1: "How are you feeling?",
            customPrompt1Type: "scale",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const result = await updateCheckInConfig(1, {
          enabledPrompts: ["weight", "steps", "calories"],
          customPrompt1: "How are you feeling?",
          customPrompt1Type: "scale",
        })

        expect(result.prompts).toBeDefined()
        expect(mockPrisma.cohortCheckInConfig.upsert).toHaveBeenCalled()
      })
    })
  })
})
