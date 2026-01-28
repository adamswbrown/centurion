import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  createMockSession,
} from "../mocks/auth"
import {
  getQuestionnaireBundle,
  getQuestionnaireBundles,
  createQuestionnaireBundle,
  updateQuestionnaireBundle,
  getQuestionnaireResponse,
  upsertQuestionnaireResponse,
  getWeeklyResponses,
  getAllQuestionnaires,
  getAllQuestionnaireBundlesAdmin,
  deleteQuestionnaireBundle,
  getOrCreateQuestionnaireBundle,
  getQuestionnaireStatusForCoach,
} from "@/app/actions/questionnaires"

// Mock modules
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Mock default templates
vi.mock("@/lib/default-questionnaire-templates", () => ({
  DEFAULT_TEMPLATES: {
    week1: { pages: [{ elements: [{ type: "text", name: "q1" }] }] },
    week2: { pages: [{ elements: [{ type: "text", name: "q2" }] }] },
    week3: { pages: [{ elements: [{ type: "text", name: "q3" }] }] },
  },
}))

describe("Questionnaires Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getQuestionnaireBundle", () => {
    it("returns bundle when found", async () => {
      setupAuthMock(mockClientUser)
      const mockBundle = {
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: { pages: [] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)

      const result = await getQuestionnaireBundle(1, 1)

      expect(result).toEqual(mockBundle)
      expect(mockPrisma.questionnaireBundle.findUnique).toHaveBeenCalledWith({
        where: {
          cohortId_weekNumber: {
            cohortId: 1,
            weekNumber: 1,
          },
        },
      })
    })

    it("returns null when bundle not found", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(null)

      const result = await getQuestionnaireBundle(1, 1)

      expect(result).toBeNull()
    })

    it("requires authentication", async () => {
      setupAuthMock(null)

      await expect(getQuestionnaireBundle(1, 1)).rejects.toThrow("Unauthorized")
    })
  })

  describe("getQuestionnaireBundles", () => {
    it("returns bundles ordered by week number", async () => {
      setupAuthMock(mockClientUser)
      const mockBundles = [
        {
          id: 1,
          cohortId: 1,
          weekNumber: 1,
          questions: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          cohortId: 1,
          weekNumber: 2,
          questions: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue(mockBundles)

      const result = await getQuestionnaireBundles(1)

      expect(result).toEqual(mockBundles)
      expect(mockPrisma.questionnaireBundle.findMany).toHaveBeenCalledWith({
        where: { cohortId: 1 },
        orderBy: { weekNumber: "asc" },
      })
    })

    it("requires authentication", async () => {
      setupAuthMock(null)

      await expect(getQuestionnaireBundles(1)).rejects.toThrow("Unauthorized")
    })
  })

  describe("createQuestionnaireBundle", () => {
    it("creates bundle as admin", async () => {
      setupAuthMock(mockAdminUser)
      const input = {
        cohortId: 1,
        weekNumber: 1,
        questions: { pages: [{ elements: [] }] },
      }
      const mockBundle = { id: 1, ...input, isActive: true, createdAt: new Date(), updatedAt: new Date() }
      mockPrisma.questionnaireBundle.create.mockResolvedValue(mockBundle)

      const result = await createQuestionnaireBundle(input)

      expect(result).toEqual(mockBundle)
      expect(mockPrisma.questionnaireBundle.create).toHaveBeenCalledWith({
        data: input,
      })
    })

    it("rejects non-admin users", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        createQuestionnaireBundle({ cohortId: 1, weekNumber: 1, questions: {} })
      ).rejects.toThrow("Forbidden: only admins can create questionnaire bundles")
    })

    it("validates input", async () => {
      setupAuthMock(mockAdminUser)

      await expect(
        createQuestionnaireBundle({ cohortId: -1, weekNumber: 1, questions: {} })
      ).rejects.toThrow()
    })
  })

  describe("updateQuestionnaireBundle", () => {
    it("updates bundle as admin", async () => {
      setupAuthMock(mockAdminUser)
      const newQuestions = { pages: [{ elements: [{ type: "text", name: "q1" }] }] }
      const mockBundle = {
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: newQuestions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.questionnaireBundle.update.mockResolvedValue(mockBundle)

      const result = await updateQuestionnaireBundle(1, 1, newQuestions)

      expect(result).toEqual(mockBundle)
      expect(mockPrisma.questionnaireBundle.update).toHaveBeenCalledWith({
        where: {
          cohortId_weekNumber: {
            cohortId: 1,
            weekNumber: 1,
          },
        },
        data: { questions: newQuestions },
      })
    })

    it("rejects non-admin users", async () => {
      setupAuthMock(mockCoachUser)

      await expect(updateQuestionnaireBundle(1, 1, {})).rejects.toThrow(
        "Forbidden: only admins can update questionnaire bundles"
      )
    })
  })

  describe("getQuestionnaireResponse", () => {
    const mockMembership = {
      cohortId: 1,
      userId: 3,
      status: "ACTIVE" as const,
      cohort: {
        startDate: new Date("2025-01-01"),
      },
    }

    const mockBundle = {
      id: 1,
      cohortId: 1,
      weekNumber: 1,
      questions: { pages: [] },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it("returns bundle and response for member", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      const mockResponse = {
        id: 1,
        userId: 3,
        bundleId: 1,
        weekNumber: 1,
        responses: {},
        status: "IN_PROGRESS" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.weeklyQuestionnaireResponse.findUnique.mockResolvedValue(mockResponse)

      const result = await getQuestionnaireResponse(1, 1)

      expect(result).toEqual({
        bundle: mockBundle,
        response: mockResponse,
        currentWeek: expect.any(Number),
      })
    })

    it("rejects non-members", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(null)

      await expect(getQuestionnaireResponse(1, 1)).rejects.toThrow(
        "Not a member of this cohort"
      )
    })

    it("rejects future weeks", async () => {
      setupAuthMock(mockClientUser)
      const oldStartDate = new Date("2025-01-01")
      mockPrisma.cohortMembership.findUnique.mockResolvedValue({
        ...mockMembership,
        cohort: { startDate: oldStartDate },
      })

      await expect(getQuestionnaireResponse(1, 100)).rejects.toThrow(
        "Questionnaire not available yet"
      )
    })

    it("returns null when bundle not found", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(null)

      const result = await getQuestionnaireResponse(1, 1)

      expect(result).toBeNull()
    })
  })

  describe("upsertQuestionnaireResponse", () => {
    const mockBundle = {
      id: 1,
      cohortId: 1,
      weekNumber: 1,
      questions: {},
      isActive: true,
      cohort: {
        startDate: new Date("2025-01-15"), // Current week = 2
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockMembership = {
      cohortId: 1,
      userId: 3,
      status: "ACTIVE" as const,
    }

    beforeEach(() => {
      // Set a fixed date for consistent week calculation
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-01-22")) // Week 2 (7 days after start)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("saves response for current week", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)
      mockPrisma.weeklyQuestionnaireResponse.findUnique.mockResolvedValue(null)
      const mockResponse = {
        id: 1,
        userId: 3,
        bundleId: 1,
        weekNumber: 2,
        responses: { q1: "answer" },
        status: "IN_PROGRESS" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.weeklyQuestionnaireResponse.upsert.mockResolvedValue(mockResponse)

      const result = await upsertQuestionnaireResponse({
        bundleId: 1,
        weekNumber: 2,
        responses: { q1: "answer" },
      })

      expect(result).toEqual(mockResponse)
      expect(mockPrisma.weeklyQuestionnaireResponse.upsert).toHaveBeenCalled()
    })

    it("rejects future weeks", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)

      await expect(
        upsertQuestionnaireResponse({
          bundleId: 1,
          weekNumber: 10,
          responses: {},
        })
      ).rejects.toThrow("Questionnaire not available yet")
    })

    it("rejects past weeks", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)

      await expect(
        upsertQuestionnaireResponse({
          bundleId: 1,
          weekNumber: 1,
          responses: {},
        })
      ).rejects.toThrow("Questionnaire is locked for past weeks")
    })

    it("rejects if already completed", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)
      mockPrisma.weeklyQuestionnaireResponse.findUnique.mockResolvedValue({
        id: 1,
        userId: 3,
        bundleId: 1,
        weekNumber: 2,
        responses: {},
        status: "COMPLETED" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(
        upsertQuestionnaireResponse({
          bundleId: 1,
          weekNumber: 2,
          responses: {},
        })
      ).rejects.toThrow("Questionnaire is locked after completion")
    })

    it("rejects non-members", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(null)

      await expect(
        upsertQuestionnaireResponse({
          bundleId: 1,
          weekNumber: 1,
          responses: {},
        })
      ).rejects.toThrow("Not a member of this cohort")
    })

    it("defaults status to IN_PROGRESS", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)
      mockPrisma.cohortMembership.findUnique.mockResolvedValue(mockMembership)
      mockPrisma.weeklyQuestionnaireResponse.findUnique.mockResolvedValue(null)
      mockPrisma.weeklyQuestionnaireResponse.upsert.mockResolvedValue({
        id: 1,
        userId: 3,
        bundleId: 1,
        weekNumber: 2,
        responses: {},
        status: "IN_PROGRESS" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await upsertQuestionnaireResponse({
        bundleId: 1,
        weekNumber: 2,
        responses: {},
      })

      expect(mockPrisma.weeklyQuestionnaireResponse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: "IN_PROGRESS" }),
          update: expect.objectContaining({ status: "IN_PROGRESS" }),
        })
      )
    })
  })

  describe("getWeeklyResponses", () => {
    it("returns all responses for coaches", async () => {
      setupAuthMock(mockCoachUser)
      const mockBundleWithResponses = {
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        responses: [
          {
            id: 1,
            userId: 3,
            bundleId: 1,
            weekNumber: 1,
            responses: {},
            status: "COMPLETED" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              id: 3,
              name: "Client User",
              email: "client@test.com",
            },
          },
        ],
      }
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundleWithResponses)

      const result = await getWeeklyResponses(1, 1)

      expect(result).toEqual(mockBundleWithResponses)
      expect(mockPrisma.questionnaireBundle.findUnique).toHaveBeenCalledWith({
        where: {
          cohortId_weekNumber: {
            cohortId: 1,
            weekNumber: 1,
          },
        },
        include: {
          responses: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    })

    it("rejects clients", async () => {
      setupAuthMock(mockClientUser)

      await expect(getWeeklyResponses(1, 1)).rejects.toThrow(
        "Forbidden: only coaches can view member responses"
      )
    })

    it("allows admins", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue({
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        responses: [],
      })

      await getWeeklyResponses(1, 1)

      expect(mockPrisma.questionnaireBundle.findUnique).toHaveBeenCalled()
    })
  })

  describe("getAllQuestionnaires", () => {
    it("returns questionnaires for coach's cohorts", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { coachId: 2, cohortId: 1 },
        { coachId: 2, cohortId: 2 },
      ])
      const mockBundles = [
        {
          id: 1,
          cohortId: 1,
          weekNumber: 1,
          questions: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
          },
          _count: {
            responses: 5,
          },
        },
      ]
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue(mockBundles)

      const result = await getAllQuestionnaires()

      expect(result).toEqual(mockBundles)
      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalledWith({
        where: { coachId: 2 },
        select: { cohortId: true },
      })
      expect(mockPrisma.questionnaireBundle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cohortId: { in: [1, 2] } },
        })
      )
    })

    it("returns empty array if coach has no cohorts", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([])

      const result = await getAllQuestionnaires()

      expect(result).toEqual([])
      expect(mockPrisma.questionnaireBundle.findMany).not.toHaveBeenCalled()
    })

    it("rejects clients", async () => {
      setupAuthMock(mockClientUser)

      await expect(getAllQuestionnaires()).rejects.toThrow(
        "Forbidden: only coaches can view questionnaires"
      )
    })
  })

  describe("getAllQuestionnaireBundlesAdmin", () => {
    it("returns all bundles for admins", async () => {
      setupAuthMock(mockAdminUser)
      const mockBundles = [
        {
          id: 1,
          cohortId: 1,
          weekNumber: 1,
          questions: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          cohort: {
            id: 1,
            name: "Cohort 1",
            startDate: new Date(),
          },
          _count: {
            responses: 3,
          },
        },
      ]
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue(mockBundles)

      const result = await getAllQuestionnaireBundlesAdmin()

      expect(result).toEqual(mockBundles)
      expect(mockPrisma.questionnaireBundle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            cohort: expect.any(Object),
            _count: expect.any(Object),
          }),
        })
      )
    })

    it("rejects non-admin users", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getAllQuestionnaireBundlesAdmin()).rejects.toThrow(
        "Forbidden: only admins can view all questionnaire bundles"
      )
    })
  })

  describe("deleteQuestionnaireBundle", () => {
    it("deletes bundle as admin", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue({
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { responses: 0 },
      })
      mockPrisma.questionnaireBundle.delete.mockResolvedValue({
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await deleteQuestionnaireBundle(1, 1)

      expect(result).toEqual({ success: true })
      expect(mockPrisma.questionnaireBundle.delete).toHaveBeenCalledWith({
        where: {
          cohortId_weekNumber: {
            cohortId: 1,
            weekNumber: 1,
          },
        },
      })
    })

    it("rejects if responses exist", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue({
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { responses: 5 },
      })

      await expect(deleteQuestionnaireBundle(1, 1)).rejects.toThrow(
        "Cannot delete: 5 response(s) exist for this questionnaire"
      )
    })

    it("rejects non-admin users", async () => {
      setupAuthMock(mockCoachUser)

      await expect(deleteQuestionnaireBundle(1, 1)).rejects.toThrow(
        "Forbidden: only admins can delete questionnaire bundles"
      )
    })
  })

  describe("getOrCreateQuestionnaireBundle", () => {
    it("returns existing bundle", async () => {
      setupAuthMock(mockAdminUser)
      const mockBundle = {
        id: 1,
        cohortId: 1,
        weekNumber: 1,
        questions: { pages: [] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        cohort: {
          id: 1,
          name: "Cohort 1",
        },
      }
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(mockBundle)

      const result = await getOrCreateQuestionnaireBundle(1, 1)

      expect(result).toEqual(mockBundle)
      expect(mockPrisma.questionnaireBundle.create).not.toHaveBeenCalled()
    })

    it("creates bundle with default template if not found", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(null)
      const mockCreatedBundle = {
        id: 1,
        cohortId: 1,
        weekNumber: 2,
        questions: { pages: [{ elements: [{ type: "text", name: "q2" }] }] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        cohort: {
          id: 1,
          name: "Cohort 1",
        },
      }
      mockPrisma.questionnaireBundle.create.mockResolvedValue(mockCreatedBundle)

      const result = await getOrCreateQuestionnaireBundle(1, 2)

      expect(result).toEqual(mockCreatedBundle)
      expect(mockPrisma.questionnaireBundle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cohortId: 1,
            weekNumber: 2,
            questions: { pages: [{ elements: [{ type: "text", name: "q2" }] }] },
          }),
        })
      )
    })

    it("uses week1 template as fallback", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.questionnaireBundle.findUnique.mockResolvedValue(null)
      mockPrisma.questionnaireBundle.create.mockResolvedValue({
        id: 1,
        cohortId: 1,
        weekNumber: 10,
        questions: { pages: [{ elements: [{ type: "text", name: "q1" }] }] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        cohort: {
          id: 1,
          name: "Cohort 1",
        },
      })

      await getOrCreateQuestionnaireBundle(1, 10)

      expect(mockPrisma.questionnaireBundle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            questions: { pages: [{ elements: [{ type: "text", name: "q1" }] }] },
          }),
        })
      )
    })

    it("rejects non-admin users", async () => {
      setupAuthMock(mockCoachUser)

      await expect(getOrCreateQuestionnaireBundle(1, 1)).rejects.toThrow(
        "Forbidden: only admins can manage questionnaire bundles"
      )
    })
  })

  describe("getQuestionnaireStatusForCoach", () => {
    beforeEach(() => {
      mockPrisma.cohort.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ])
      mockPrisma.coachCohortMembership.findMany.mockResolvedValue([
        { coachId: 2, cohortId: 1 },
      ])
    })

    it("returns status rows for coach's cohorts", async () => {
      setupAuthMock(mockCoachUser)
      const mockBundles = [
        {
          id: 1,
          cohortId: 1,
          weekNumber: 1,
          isActive: true,
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                userId: 3,
                status: "ACTIVE" as const,
                user: { id: 3, name: "Client User", email: "client@test.com" },
              },
            ],
          },
          responses: [
            {
              userId: 3,
              status: "COMPLETED" as const,
              updatedAt: new Date(),
              responses: { q1: "answer" },
            },
          ],
        },
      ]
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue(mockBundles)

      const result = await getQuestionnaireStatusForCoach()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        memberId: 3,
        memberName: "Client User",
        memberEmail: "client@test.com",
        cohortName: "Cohort 1",
        weekNumber: 1,
        status: "COMPLETED",
        responseCount: 1,
      })
    })

    it("shows NOT_STARTED for members without responses", async () => {
      setupAuthMock(mockCoachUser)
      const mockBundles = [
        {
          id: 1,
          cohortId: 1,
          weekNumber: 1,
          isActive: true,
          cohort: {
            id: 1,
            name: "Cohort 1",
            members: [
              {
                userId: 3,
                status: "ACTIVE" as const,
                user: { id: 3, name: "Client User", email: "client@test.com" },
              },
            ],
          },
          responses: [],
        },
      ]
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue(mockBundles)

      const result = await getQuestionnaireStatusForCoach()

      expect(result[0].status).toBe("NOT_STARTED")
      expect(result[0].submittedAt).toBeNull()
      expect(result[0].responseCount).toBe(0)
    })

    it("admin sees all cohorts", async () => {
      setupAuthMock(mockAdminUser)
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      await getQuestionnaireStatusForCoach()

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        select: { id: true },
      })
      expect(mockPrisma.questionnaireBundle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cohortId: { in: [1, 2] },
          }),
        })
      )
    })

    it("coach sees only assigned cohorts", async () => {
      setupAuthMock(mockCoachUser)
      mockPrisma.questionnaireBundle.findMany.mockResolvedValue([])

      await getQuestionnaireStatusForCoach()

      expect(mockPrisma.coachCohortMembership.findMany).toHaveBeenCalledWith({
        where: { coachId: 2 },
        select: { cohortId: true },
      })
      expect(mockPrisma.questionnaireBundle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cohortId: { in: [1] },
          }),
        })
      )
    })
  })
})
