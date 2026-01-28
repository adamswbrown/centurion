import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import { setupAuthMock, mockAdminUser, mockCoachUser, mockClientUser } from "../mocks/auth"
import {
  getUserConsent,
  acceptConsent,
  hasValidConsent,
  getLegalContent,
  updateLegalContent,
} from "@/app/actions/consent"
import { exportUserData, deleteAccount } from "@/app/actions/gdpr"
import bcrypt from "bcryptjs"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }))
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}))
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((key: string) => {
      if (key === "x-forwarded-for") return "192.168.1.1"
      if (key === "user-agent") return "TestBrowser/1.0"
      return null
    }),
  }),
}))

describe("Consent Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getUserConsent", () => {
    it("returns user consent record", async () => {
      setupAuthMock(mockClientUser)

      const mockConsent = {
        id: 1,
        userId: 3,
        termsAccepted: new Date("2025-01-01"),
        privacyAccepted: new Date("2025-01-01"),
        dataProcessing: new Date("2025-01-01"),
        marketing: null,
        version: "1.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      }

      mockPrisma.userConsent.findUnique.mockResolvedValue(mockConsent)

      const result = await getUserConsent()

      expect(result).toEqual(mockConsent)
      expect(mockPrisma.userConsent.findUnique).toHaveBeenCalledWith({
        where: { userId: 3 },
      })
    })

    it("returns null if no consent exists", async () => {
      setupAuthMock(mockClientUser)
      mockPrisma.userConsent.findUnique.mockResolvedValue(null)

      const result = await getUserConsent()

      expect(result).toBeNull()
    })

    it("requires auth", async () => {
      setupAuthMock(null)

      await expect(getUserConsent()).rejects.toThrow()
    })
  })

  describe("acceptConsent", () => {
    it("accepts all consent types", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 1,
        key: "consentVersion",
        value: "2.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.userConsent.upsert.mockResolvedValue({
        id: 1,
        userId: 3,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: new Date(),
        version: "2.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: true,
        marketing: true,
      })

      expect(result).toEqual({ success: true })
      expect(mockPrisma.userConsent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 3 },
          update: expect.objectContaining({
            version: "2.0.0",
            ipAddress: "192.168.1.1",
            userAgent: "TestBrowser/1.0",
          }),
          create: expect.objectContaining({
            userId: 3,
            version: "2.0.0",
            ipAddress: "192.168.1.1",
            userAgent: "TestBrowser/1.0",
          }),
        })
      )
    })

    it("uses version from settings", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 1,
        key: "consentVersion",
        value: "3.5.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.userConsent.upsert.mockResolvedValue({
        id: 1,
        userId: 3,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: null,
        version: "3.5.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: true,
      })

      expect(mockPrisma.userConsent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ version: "3.5.0" }),
          create: expect.objectContaining({ version: "3.5.0" }),
        })
      )
    })

    it("falls back to default version", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.systemSettings.findUnique.mockResolvedValue(null)
      mockPrisma.userConsent.upsert.mockResolvedValue({
        id: 1,
        userId: 3,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: null,
        version: "1.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: true,
      })

      expect(mockPrisma.userConsent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ version: "1.0.0" }),
          create: expect.objectContaining({ version: "1.0.0" }),
        })
      )
    })

    it("captures IP and UserAgent from headers", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.systemSettings.findUnique.mockResolvedValue(null)
      mockPrisma.userConsent.upsert.mockResolvedValue({
        id: 1,
        userId: 3,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: null,
        version: "1.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: true,
      })

      expect(mockPrisma.userConsent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            ipAddress: "192.168.1.1",
            userAgent: "TestBrowser/1.0",
          }),
          create: expect.objectContaining({
            ipAddress: "192.168.1.1",
            userAgent: "TestBrowser/1.0",
          }),
        })
      )
    })

    it("logs audit event", async () => {
      setupAuthMock(mockClientUser)

      const { logAuditEvent } = await import("@/lib/audit-log")

      mockPrisma.systemSettings.findUnique.mockResolvedValue(null)
      mockPrisma.userConsent.upsert.mockResolvedValue({
        id: 1,
        userId: 1,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: new Date(),
        version: "1.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: true,
        marketing: true,
      })

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "ACCEPT_CONSENT",
        actorId: 3,
        targetId: 3,
        targetType: "UserConsent",
        details: {
          version: "1.0.0",
          marketing: true,
        },
      })
    })

    it("validates required fields - must accept terms", async () => {
      setupAuthMock(mockClientUser)

      const result = await acceptConsent({
        termsAccepted: false,
        privacyAccepted: true,
        dataProcessing: true,
      })

      expect(result).toEqual({ error: "Must accept terms" })
      expect(mockPrisma.userConsent.upsert).not.toHaveBeenCalled()
    })

    it("validates required fields - must accept privacy", async () => {
      setupAuthMock(mockClientUser)

      const result = await acceptConsent({
        termsAccepted: true,
        privacyAccepted: false,
        dataProcessing: true,
      })

      expect(result).toEqual({ error: "Must accept privacy policy" })
      expect(mockPrisma.userConsent.upsert).not.toHaveBeenCalled()
    })

    it("validates required fields - must accept data processing", async () => {
      setupAuthMock(mockClientUser)

      const result = await acceptConsent({
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessing: false,
      })

      expect(result).toEqual({ error: "Must accept data processing agreement" })
      expect(mockPrisma.userConsent.upsert).not.toHaveBeenCalled()
    })
  })

  describe("hasValidConsent", () => {
    it("returns valid for matching version", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.userConsent.findUnique.mockResolvedValue({
        id: 1,
        userId: 3,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: null,
        version: "2.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 1,
        key: "consentVersion",
        value: "2.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await hasValidConsent()

      expect(result).toEqual({ valid: true, needsUpdate: false })
    })

    it("returns needsUpdate for old version", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.userConsent.findUnique.mockResolvedValue({
        id: 1,
        userId: 3,
        termsAccepted: new Date(),
        privacyAccepted: new Date(),
        dataProcessing: new Date(),
        marketing: null,
        version: "1.0.0",
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 1,
        key: "consentVersion",
        value: "2.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await hasValidConsent()

      expect(result).toEqual({ valid: false, needsUpdate: true })
    })

    it("returns invalid if no consent", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.userConsent.findUnique.mockResolvedValue(null)

      const result = await hasValidConsent()

      expect(result).toEqual({ valid: false, needsUpdate: false })
    })
  })

  describe("getLegalContent", () => {
    it("returns content from settings", async () => {
      mockPrisma.systemSettings.findMany.mockResolvedValue([
        {
          id: 1,
          key: "termsContentHtml",
          value: "<h1>Custom Terms</h1>",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          key: "privacyContentHtml",
          value: "<h1>Custom Privacy</h1>",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          key: "dataProcessingContentHtml",
          value: "<h1>Custom Data Processing</h1>",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          key: "consentVersion",
          value: "3.0.0",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await getLegalContent()

      expect(result).toEqual({
        terms: "<h1>Custom Terms</h1>",
        privacy: "<h1>Custom Privacy</h1>",
        dataProcessing: "<h1>Custom Data Processing</h1>",
        version: "3.0.0",
      })
    })

    it("returns defaults when no settings", async () => {
      mockPrisma.systemSettings.findMany.mockResolvedValue([])

      const result = await getLegalContent()

      expect(result.terms).toContain("Terms of Service")
      expect(result.privacy).toContain("Privacy Policy")
      expect(result.dataProcessing).toContain("Data Processing Agreement")
      expect(result.version).toBe("1.0.0")
    })
  })

  describe("updateLegalContent", () => {
    it("updates content", async () => {
      setupAuthMock(mockAdminUser)

      const { logAuditEvent } = await import("@/lib/audit-log")

      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 1,
        key: "termsContentHtml",
        value: "<h1>Updated Terms</h1>",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await updateLegalContent({
        key: "termsContentHtml",
        html: "<h1>Updated Terms</h1>",
      })

      expect(result).toEqual({ success: true })
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith({
        where: { key: "termsContentHtml" },
        update: { value: "<h1>Updated Terms</h1>" },
        create: { key: "termsContentHtml", value: "<h1>Updated Terms</h1>" },
      })
      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "UPDATE_LEGAL_CONTENT",
        actorId: 1,
        targetType: "SystemSettings",
        details: { key: "termsContentHtml" },
      })
    })

    it("rejects invalid key", async () => {
      setupAuthMock(mockAdminUser)

      const result = await updateLegalContent({
        key: "invalidKey",
        html: "<h1>Test</h1>",
      })

      expect(result).toEqual({ error: "Invalid content key" })
      expect(mockPrisma.systemSettings.upsert).not.toHaveBeenCalled()
    })

    it("requires admin", async () => {
      setupAuthMock(mockCoachUser)

      await expect(
        updateLegalContent({
          key: "termsContentHtml",
          html: "<h1>Test</h1>",
        })
      ).rejects.toThrow()
    })
  })
})

describe("GDPR Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("exportUserData", () => {
    it("exports all data categories", async () => {
      setupAuthMock(mockClientUser)

      const mockUser = {
        id: 3,
        email: "client@test.com",
        name: "Test Client",
        image: null,
        role: "CLIENT",
        credits: 10,
        creditsExpiry: null,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockEntries = [{ id: 1, userId: 3, date: new Date() }]
      const mockHealthKitWorkouts = [{ id: 1, userId: 3, workoutType: "Running" }]
      const mockSleepRecords = [{ id: 1, userId: 3, sleepStart: new Date() }]
      const mockAppointments = [{ id: 1, userId: 3, scheduledAt: new Date() }]
      const mockWorkouts = [{ id: 1, userId: 3, notes: "Test workout" }]
      const mockCohortMemberships = [
        { id: 1, userId: 3, cohortId: 1, cohort: { name: "Test Cohort" } },
      ]
      const mockQuestionnaireResponses = [{ id: 1, userId: 3, weekNumber: 1 }]
      const mockCoachNotesReceived = [
        {
          id: 1,
          userId: 3,
          weekNumber: 1,
          notes: "Good progress",
          createdAt: new Date(),
          coach: { name: "Coach Test" },
        },
      ]
      const mockWeeklyResponsesReceived = [
        {
          id: 1,
          clientId: 3,
          weekStart: new Date(),
          loomUrl: null,
          note: "Keep going",
          createdAt: new Date(),
          coach: { name: "Coach Test" },
        },
      ]
      const mockInvoices = [{ id: 1, userId: 3, amount: 100 }]
      const mockCreditTransactions = [{ id: 1, userId: 3, credits: 5 }]

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.entry.findMany.mockResolvedValue(mockEntries)
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue(mockHealthKitWorkouts)
      mockPrisma.sleepRecord.findMany.mockResolvedValue(mockSleepRecords)
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments)
      mockPrisma.workout.findMany.mockResolvedValue(mockWorkouts)
      mockPrisma.cohortMembership.findMany.mockResolvedValue(mockCohortMemberships)
      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue(
        mockQuestionnaireResponses
      )
      mockPrisma.coachNote.findMany.mockResolvedValue(mockCoachNotesReceived)
      mockPrisma.weeklyCoachResponse.findMany.mockResolvedValue(mockWeeklyResponsesReceived)
      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)
      mockPrisma.creditTransaction.findMany.mockResolvedValue(mockCreditTransactions)

      const result = await exportUserData()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.profile).toEqual(mockUser)
      expect(result.data?.entries).toEqual(mockEntries)
      expect(result.data?.healthKitWorkouts).toEqual(mockHealthKitWorkouts)
      expect(result.data?.sleepRecords).toEqual(mockSleepRecords)
      expect(result.data?.appointments).toEqual(mockAppointments)
      expect(result.data?.workouts).toEqual(mockWorkouts)
      expect(result.data?.cohortMemberships).toEqual(mockCohortMemberships)
      expect(result.data?.questionnaireResponses).toEqual(mockQuestionnaireResponses)
      expect(result.data?.coachNotesReceived).toEqual(mockCoachNotesReceived)
      expect(result.data?.weeklyResponsesReceived).toEqual(mockWeeklyResponsesReceived)
      expect(result.data?.invoices).toEqual(mockInvoices)
      expect(result.data?.creditTransactions).toEqual(mockCreditTransactions)
    })

    it("logs audit event", async () => {
      setupAuthMock(mockClientUser)

      const { logAuditEvent } = await import("@/lib/audit-log")

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        name: "Test Client",
        image: null,
        role: "CLIENT",
        credits: 10,
        creditsExpiry: null,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.entry.findMany.mockResolvedValue([])
      mockPrisma.healthKitWorkout.findMany.mockResolvedValue([])
      mockPrisma.sleepRecord.findMany.mockResolvedValue([])
      mockPrisma.appointment.findMany.mockResolvedValue([])
      mockPrisma.workout.findMany.mockResolvedValue([])
      mockPrisma.cohortMembership.findMany.mockResolvedValue([])
      mockPrisma.weeklyQuestionnaireResponse.findMany.mockResolvedValue([])
      mockPrisma.coachNote.findMany.mockResolvedValue([])
      mockPrisma.weeklyCoachResponse.findMany.mockResolvedValue([])
      mockPrisma.invoice.findMany.mockResolvedValue([])
      mockPrisma.creditTransaction.findMany.mockResolvedValue([])

      await exportUserData()

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "EXPORT_USER_DATA",
        actorId: 3,
        targetId: 3,
        targetType: "User",
      })
    })

    it("requires auth", async () => {
      setupAuthMock(null)

      await expect(exportUserData()).rejects.toThrow()
    })
  })

  describe("deleteAccount", () => {
    it("deletes account with correct confirmation and password", async () => {
      setupAuthMock(mockClientUser)

      const { logAuditEvent } = await import("@/lib/audit-log")

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        password: "hashed_password",
      })

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      mockPrisma.user.delete.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        name: "Test Client",
        image: null,
        role: "CLIENT",
        password: "hashed_password",
        credits: 10,
        creditsExpiry: null,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await deleteAccount({
        confirmation: "DELETE MY ACCOUNT",
        password: "mypassword",
      })

      expect(result).toEqual({ success: true })
      expect(bcrypt.compare).toHaveBeenCalledWith("mypassword", "hashed_password")
      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "DELETE_ACCOUNT",
        actorId: 3,
        targetId: 3,
        targetType: "User",
        details: { email: "client@test.com" },
      })
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 3 },
      })
    })

    it("requires confirmation text", async () => {
      setupAuthMock(mockClientUser)

      const result = await deleteAccount({
        confirmation: "wrong text",
        password: "mypassword",
      })

      expect(result.error).toBeDefined()
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it("verifies password if user has one", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        password: "hashed_password",
      })

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      const result = await deleteAccount({
        confirmation: "DELETE MY ACCOUNT",
        password: "wrongpassword",
      })

      expect(result).toEqual({ error: "Incorrect password" })
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it("rejects missing password when user has one", async () => {
      setupAuthMock(mockClientUser)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        password: "hashed_password",
      })

      const result = await deleteAccount({
        confirmation: "DELETE MY ACCOUNT",
      })

      expect(result).toEqual({ error: "Password is required to delete your account" })
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it("skips password check for OAuth users", async () => {
      setupAuthMock(mockClientUser)

      const { logAuditEvent } = await import("@/lib/audit-log")

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        password: null,
      })

      mockPrisma.user.delete.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        name: "Test Client",
        image: null,
        role: "CLIENT",
        password: null,
        credits: 10,
        creditsExpiry: null,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await deleteAccount({
        confirmation: "DELETE MY ACCOUNT",
      })

      expect(result).toEqual({ success: true })
      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 3 },
      })
    })

    it("logs audit before deletion", async () => {
      setupAuthMock(mockClientUser)

      const { logAuditEvent } = await import("@/lib/audit-log")
      const auditCalls: string[] = []

      vi.mocked(logAuditEvent).mockImplementation(async () => {
        auditCalls.push("audit")
      })

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: "client@test.com",
        password: null,
      })

      mockPrisma.user.delete.mockImplementation(async () => {
        auditCalls.push("delete")
        return {
          id: 3,
          email: "client@test.com",
          name: "Test Client",
          image: null,
          role: "CLIENT",
          password: null,
          credits: 10,
          creditsExpiry: null,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })

      await deleteAccount({
        confirmation: "DELETE MY ACCOUNT",
      })

      expect(auditCalls).toEqual(["audit", "delete"])
    })

    it("requires auth", async () => {
      setupAuthMock(null)

      await expect(
        deleteAccount({
          confirmation: "DELETE MY ACCOUNT",
        })
      ).rejects.toThrow()
    })
  })
})
