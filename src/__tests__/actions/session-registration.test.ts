/**
 * Session Registration Server Actions Tests
 *
 * Tests for session registration, cancellation, waitlist,
 * attendance tracking, and usage functions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockCoachUser,
  mockAdminUser,
  mockClientUser,
  resetAuthMocks,
} from "../mocks"

// Now import the functions to test (after mocks are set up)
import {
  registerForSession,
  cancelRegistration,
  getMyRegistrations,
  getSessionUsage,
  markAttendance,
  getSessionRegistrations,
} from "@/app/actions/session-registration"

// ============================================
// TEST HELPERS
// ============================================

function createMockClassSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    classTypeId: 10,
    coachId: 2,
    startTime: new Date("2025-03-01T09:00:00"),
    endTime: new Date("2025-03-01T10:00:00"),
    maxOccupancy: 10,
    status: "SCHEDULED",
    classType: { id: 10, name: "Yoga" },
    registrations: [],
    _count: { registrations: 0 },
    ...overrides,
  }
}

function createMockMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    planId: 1,
    status: "ACTIVE",
    sessionsRemaining: null,
    startDate: new Date("2025-01-01"),
    endDate: null,
    plan: {
      id: 1,
      name: "Unlimited Monthly",
      type: "RECURRING",
      sessionsPerWeek: 5,
      totalSessions: null,
      durationDays: null,
      lateCancelCutoffHours: 2,
      allowances: [],
    },
    ...overrides,
  }
}

function createMockRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    sessionId: 1,
    userId: 1,
    status: "REGISTERED",
    waitlistPosition: null,
    registeredAt: new Date(),
    cancelledAt: null,
    promotedFromWaitlistAt: null,
    ...overrides,
  }
}

// ============================================
// TESTS
// ============================================

describe("Session Registration Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()

    // Default: authenticated as client (id: "3")
    setupAuthMock(mockClientUser)

    // Re-setup $transaction mock after reset
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(mockPrisma)
      }
      return Promise.all(fn as Promise<unknown>[])
    })
  })

  // ============================================
  // registerForSession
  // ============================================

  describe("registerForSession", () => {
    it("should register for a session successfully", async () => {
      const classSession = createMockClassSession()
      const membership = createMockMembership({ userId: 3 })
      const newReg = createMockRegistration({
        userId: 3,
        sessionId: 1,
        status: "REGISTERED",
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null) // Not already registered
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.count.mockResolvedValue(0) // Weekly count
      mockPrisma.sessionRegistration.create.mockResolvedValue(newReg)

      const result = await registerForSession({ sessionId: 1 })

      expect(result.waitlisted).toBe(false)
      expect(result.status).toBe("REGISTERED")
      expect(mockPrisma.classSession.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      )
    })

    it("should require authentication", async () => {
      setupAuthMock(null)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow()
    })

    it("should reject invalid sessionId", async () => {
      await expect(
        registerForSession({ sessionId: -1 })
      ).rejects.toThrow()
    })

    it("should throw if session not found", async () => {
      mockPrisma.classSession.findUnique.mockResolvedValue(null)

      await expect(registerForSession({ sessionId: 999 })).rejects.toThrow(
        "Session not found"
      )
    })

    it("should throw if session is not SCHEDULED", async () => {
      const classSession = createMockClassSession({ status: "CANCELLED" })
      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "Session is not available for registration"
      )
    })

    it("should throw if already registered", async () => {
      const classSession = createMockClassSession()
      const existingReg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(existingReg)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "Already registered for this session"
      )
    })

    it("should allow re-registration if previously cancelled", async () => {
      const classSession = createMockClassSession()
      const cancelledReg = createMockRegistration({
        id: 5,
        userId: 3,
        status: "CANCELLED",
      })
      const membership = createMockMembership({ userId: 3 })
      const updatedReg = createMockRegistration({
        id: 5,
        userId: 3,
        status: "REGISTERED",
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(cancelledReg)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.count.mockResolvedValue(0)
      mockPrisma.sessionRegistration.update.mockResolvedValue(updatedReg)

      const result = await registerForSession({ sessionId: 1 })

      expect(result.waitlisted).toBe(false)
      expect(mockPrisma.sessionRegistration.update).toHaveBeenCalled()
    })

    it("should throw if no active membership found", async () => {
      const classSession = createMockClassSession()

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "No active membership found"
      )
    })

    it("should throw if class type not allowed by membership", async () => {
      const classSession = createMockClassSession({ classTypeId: 10 })
      const membership = createMockMembership({
        userId: 3,
        plan: {
          id: 1,
          name: "Basic Plan",
          type: "RECURRING",
          sessionsPerWeek: 3,
          totalSessions: null,
          durationDays: null,
          lateCancelCutoffHours: 2,
          allowances: [{ classTypeId: 20 }], // Only allows classType 20
        },
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "Your membership plan does not include this class type"
      )
    })

    it("should throw when weekly session limit reached (RECURRING)", async () => {
      const classSession = createMockClassSession()
      const membership = createMockMembership({
        userId: 3,
        plan: {
          id: 1,
          name: "Limited Plan",
          type: "RECURRING",
          sessionsPerWeek: 3,
          totalSessions: null,
          durationDays: null,
          lateCancelCutoffHours: 2,
          allowances: [],
        },
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.count.mockResolvedValue(3) // Already at limit

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "Weekly session limit reached (3 per week)"
      )
    })

    it("should throw when pack sessions exhausted (PACK)", async () => {
      const classSession = createMockClassSession()
      const membership = createMockMembership({
        userId: 3,
        sessionsRemaining: 0,
        plan: {
          id: 1,
          name: "10 Pack",
          type: "PACK",
          sessionsPerWeek: null,
          totalSessions: 10,
          durationDays: null,
          lateCancelCutoffHours: 2,
          allowances: [],
        },
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "No sessions remaining in your pack"
      )
    })

    it("should throw when prepaid membership expired (PREPAID)", async () => {
      const classSession = createMockClassSession()
      const membership = createMockMembership({
        userId: 3,
        endDate: new Date("2024-01-01"), // Expired
        plan: {
          id: 1,
          name: "30-Day Pass",
          type: "PREPAID",
          sessionsPerWeek: null,
          totalSessions: null,
          durationDays: 30,
          lateCancelCutoffHours: 2,
          allowances: [],
        },
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      await expect(registerForSession({ sessionId: 1 })).rejects.toThrow(
        "Your prepaid membership has expired"
      )
    })

    it("should add to waitlist when session is full", async () => {
      const classSession = createMockClassSession({
        maxOccupancy: 2,
        _count: { registrations: 2 }, // Full
      })
      const membership = createMockMembership({ userId: 3 })
      const waitlistedReg = createMockRegistration({
        userId: 3,
        status: "WAITLISTED",
        waitlistPosition: 1,
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.count.mockResolvedValue(0)
      mockPrisma.sessionRegistration.aggregate.mockResolvedValue({
        _max: { waitlistPosition: 0 },
      })
      mockPrisma.sessionRegistration.create.mockResolvedValue(waitlistedReg)

      const result = await registerForSession({ sessionId: 1 })

      expect(result.waitlisted).toBe(true)
      expect(mockPrisma.sessionRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "WAITLISTED",
            waitlistPosition: 1,
          }),
        })
      )
    })

    it("should assign correct waitlist position when others waiting", async () => {
      const classSession = createMockClassSession({
        maxOccupancy: 1,
        _count: { registrations: 1 },
      })
      const membership = createMockMembership({ userId: 3 })
      const waitlistedReg = createMockRegistration({
        userId: 3,
        status: "WAITLISTED",
        waitlistPosition: 3,
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.count.mockResolvedValue(0)
      mockPrisma.sessionRegistration.aggregate.mockResolvedValue({
        _max: { waitlistPosition: 2 },
      })
      mockPrisma.sessionRegistration.create.mockResolvedValue(waitlistedReg)

      const result = await registerForSession({ sessionId: 1 })

      expect(result.waitlisted).toBe(true)
      expect(mockPrisma.sessionRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            waitlistPosition: 3,
          }),
        })
      )
    })

    it("should decrement pack sessions on successful registration", async () => {
      const classSession = createMockClassSession()
      const membership = createMockMembership({
        userId: 3,
        sessionsRemaining: 5,
        plan: {
          id: 1,
          name: "10 Pack",
          type: "PACK",
          sessionsPerWeek: null,
          totalSessions: 10,
          durationDays: null,
          lateCancelCutoffHours: 2,
          allowances: [],
        },
      })
      const newReg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
      })

      mockPrisma.classSession.findUnique.mockResolvedValue(classSession)
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.create.mockResolvedValue(newReg)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        sessionsRemaining: 4,
      })

      const result = await registerForSession({ sessionId: 1 })

      expect(result.waitlisted).toBe(false)
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { sessionsRemaining: 4 },
        })
      )
    })
  })

  // ============================================
  // cancelRegistration
  // ============================================

  describe("cancelRegistration", () => {
    it("should cancel a registered session successfully", async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7) // 7 days from now - well past cutoff

      const reg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
        session: {
          id: 1,
          startTime: futureDate,
        },
      })
      const membership = createMockMembership({
        userId: 3,
        plan: {
          id: 1,
          name: "Monthly",
          type: "RECURRING",
          lateCancelCutoffHours: 2,
        },
      })

      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.update.mockResolvedValue({
        ...reg,
        status: "CANCELLED",
      })
      mockPrisma.sessionRegistration.findFirst.mockResolvedValue(null) // No waitlisted

      const result = await cancelRegistration({ registrationId: 1 })

      expect(result.lateCancelled).toBe(false)
    })

    it("should require authentication", async () => {
      setupAuthMock(null)

      await expect(
        cancelRegistration({ registrationId: 1 })
      ).rejects.toThrow()
    })

    it("should reject invalid registrationId", async () => {
      await expect(
        cancelRegistration({ registrationId: -1 })
      ).rejects.toThrow()
    })

    it("should throw if registration not found", async () => {
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null)

      await expect(
        cancelRegistration({ registrationId: 999 })
      ).rejects.toThrow("Registration not found")
    })

    it("should throw if not the registration owner", async () => {
      const reg = createMockRegistration({ userId: 999 }) // Different user
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)

      await expect(
        cancelRegistration({ registrationId: 1 })
      ).rejects.toThrow("Not authorized to cancel this registration")
    })

    it("should throw if registration is not cancellable (ATTENDED)", async () => {
      const reg = createMockRegistration({
        userId: 3,
        status: "ATTENDED",
        session: { id: 1, startTime: new Date() },
      })
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)

      await expect(
        cancelRegistration({ registrationId: 1 })
      ).rejects.toThrow("Cannot cancel this registration")
    })

    it("should cancel waitlisted registration without late penalty", async () => {
      const reg = createMockRegistration({
        userId: 3,
        status: "WAITLISTED",
        waitlistPosition: 2,
        session: { id: 1, startTime: new Date() },
      })

      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)
      mockPrisma.sessionRegistration.update.mockResolvedValue({
        ...reg,
        status: "CANCELLED",
      })

      const result = await cancelRegistration({ registrationId: 1 })

      expect(result.lateCancelled).toBe(false)
      expect(mockPrisma.sessionRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "CANCELLED",
            waitlistPosition: null,
          }),
        })
      )
    })

    it("should mark as late cancel when within cutoff hours", async () => {
      const soonStart = new Date()
      soonStart.setMinutes(soonStart.getMinutes() + 30) // 30 min from now

      const reg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
        session: { id: 1, startTime: soonStart },
      })
      const membership = createMockMembership({
        userId: 3,
        plan: {
          id: 1,
          name: "Monthly",
          type: "RECURRING",
          lateCancelCutoffHours: 2,
        },
      })

      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.update.mockResolvedValue({
        ...reg,
        status: "LATE_CANCELLED",
      })
      mockPrisma.sessionRegistration.findFirst.mockResolvedValue(null)

      const result = await cancelRegistration({ registrationId: 1 })

      expect(result.lateCancelled).toBe(true)
    })

    it("should refund pack session on non-late cancellation", async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const reg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
        session: { id: 1, startTime: futureDate },
      })
      const membership = createMockMembership({
        userId: 3,
        sessionsRemaining: 4,
        plan: {
          id: 1,
          name: "10 Pack",
          type: "PACK",
          lateCancelCutoffHours: 2,
        },
      })

      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.update.mockResolvedValue({
        ...reg,
        status: "CANCELLED",
      })
      mockPrisma.sessionRegistration.findFirst.mockResolvedValue(null)
      mockPrisma.userMembership.update.mockResolvedValue({
        ...membership,
        sessionsRemaining: 5,
      })

      const result = await cancelRegistration({ registrationId: 1 })

      expect(result.lateCancelled).toBe(false)
      expect(mockPrisma.userMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { sessionsRemaining: 5 },
        })
      )
    })

    it("should NOT refund pack session on late cancellation", async () => {
      const soonStart = new Date()
      soonStart.setMinutes(soonStart.getMinutes() + 30)

      const reg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
        session: { id: 1, startTime: soonStart },
      })
      const membership = createMockMembership({
        userId: 3,
        sessionsRemaining: 4,
        plan: {
          id: 1,
          name: "10 Pack",
          type: "PACK",
          lateCancelCutoffHours: 2,
        },
      })

      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.update.mockResolvedValue({
        ...reg,
        status: "LATE_CANCELLED",
      })
      mockPrisma.sessionRegistration.findFirst.mockResolvedValue(null)

      const result = await cancelRegistration({ registrationId: 1 })

      expect(result.lateCancelled).toBe(true)
      // userMembership.update should NOT have been called (no refund)
      expect(mockPrisma.userMembership.update).not.toHaveBeenCalled()
    })

    it("should auto-promote first waitlisted person after cancellation", async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const reg = createMockRegistration({
        userId: 3,
        status: "REGISTERED",
        sessionId: 1,
        session: { id: 1, startTime: futureDate },
      })
      const membership = createMockMembership({
        userId: 3,
        plan: {
          id: 1,
          name: "Monthly",
          type: "RECURRING",
          lateCancelCutoffHours: 2,
        },
      })
      const waitlistedReg = createMockRegistration({
        id: 10,
        userId: 50,
        status: "WAITLISTED",
        waitlistPosition: 1,
      })

      mockPrisma.sessionRegistration.findUnique.mockResolvedValue(reg)
      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.update.mockResolvedValue({
        ...reg,
        status: "CANCELLED",
      })
      mockPrisma.sessionRegistration.findFirst.mockResolvedValue(waitlistedReg)

      await cancelRegistration({ registrationId: 1 })

      // The second update call should be the waitlist promotion
      expect(mockPrisma.sessionRegistration.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.sessionRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({
            status: "REGISTERED",
            waitlistPosition: null,
          }),
        })
      )
    })
  })

  // ============================================
  // getMyRegistrations
  // ============================================

  describe("getMyRegistrations", () => {
    it("should return all registrations for the authenticated user", async () => {
      const registrations = [
        createMockRegistration({ id: 1, userId: 3 }),
        createMockRegistration({ id: 2, userId: 3 }),
      ]

      mockPrisma.sessionRegistration.findMany.mockResolvedValue(registrations)

      const result = await getMyRegistrations()

      expect(result).toHaveLength(2)
      expect(mockPrisma.sessionRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 3 },
        })
      )
    })

    it("should require authentication", async () => {
      setupAuthMock(null)

      await expect(getMyRegistrations()).rejects.toThrow()
    })

    it("should filter by status when provided", async () => {
      mockPrisma.sessionRegistration.findMany.mockResolvedValue([])

      await getMyRegistrations({ status: "REGISTERED" as const })

      expect(mockPrisma.sessionRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 3,
            status: "REGISTERED",
          }),
        })
      )
    })

    it("should filter by upcoming sessions when requested", async () => {
      mockPrisma.sessionRegistration.findMany.mockResolvedValue([])

      await getMyRegistrations({ upcoming: true })

      expect(mockPrisma.sessionRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 3,
            session: expect.objectContaining({
              startTime: expect.objectContaining({ gte: expect.any(Date) }),
              status: "SCHEDULED",
            }),
          }),
        })
      )
    })

    it("should include session details with class type and coach", async () => {
      mockPrisma.sessionRegistration.findMany.mockResolvedValue([])

      await getMyRegistrations()

      expect(mockPrisma.sessionRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            session: expect.objectContaining({
              include: expect.objectContaining({
                classType: true,
                coach: expect.any(Object),
              }),
            }),
          }),
        })
      )
    })
  })

  // ============================================
  // getSessionUsage
  // ============================================

  describe("getSessionUsage", () => {
    it("should return null if no active membership", async () => {
      mockPrisma.userMembership.findFirst.mockResolvedValue(null)

      const result = await getSessionUsage()

      expect(result).toBeNull()
    })

    it("should require authentication", async () => {
      setupAuthMock(null)

      await expect(getSessionUsage()).rejects.toThrow()
    })

    it("should return recurring usage with weekly counts", async () => {
      const membership = createMockMembership({
        userId: 3,
        plan: {
          id: 1,
          name: "Unlimited Monthly",
          type: "RECURRING",
          sessionsPerWeek: 5,
        },
      })

      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)
      mockPrisma.sessionRegistration.count.mockResolvedValue(2)

      const result = await getSessionUsage()

      expect(result).toEqual({
        type: "recurring",
        used: 2,
        limit: 5,
        remaining: 3,
        planName: "Unlimited Monthly",
      })
    })

    it("should return pack usage with sessions remaining", async () => {
      const membership = createMockMembership({
        userId: 3,
        sessionsRemaining: 7,
        plan: {
          id: 1,
          name: "10 Pack",
          type: "PACK",
          totalSessions: 10,
        },
      })

      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      const result = await getSessionUsage()

      expect(result).toEqual({
        type: "pack",
        sessionsRemaining: 7,
        totalSessions: 10,
        planName: "10 Pack",
      })
    })

    it("should return prepaid usage with days remaining", async () => {
      const futureEnd = new Date()
      futureEnd.setDate(futureEnd.getDate() + 15)

      const membership = createMockMembership({
        userId: 3,
        endDate: futureEnd,
        plan: {
          id: 1,
          name: "30-Day Pass",
          type: "PREPAID",
          durationDays: 30,
        },
      })

      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      const result = await getSessionUsage()

      expect(result).not.toBeNull()
      expect(result!.type).toBe("prepaid")
      expect((result as { daysRemaining: number }).daysRemaining).toBeGreaterThan(0)
      expect(result!.planName).toBe("30-Day Pass")
    })

    it("should allow querying for a specific userId", async () => {
      const membership = createMockMembership({
        userId: 50,
        plan: {
          id: 1,
          name: "10 Pack",
          type: "PACK",
          totalSessions: 10,
        },
      })

      mockPrisma.userMembership.findFirst.mockResolvedValue(membership)

      await getSessionUsage(50)

      expect(mockPrisma.userMembership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 50 }),
        })
      )
    })
  })

  // ============================================
  // markAttendance (Coach action)
  // ============================================

  describe("markAttendance", () => {
    beforeEach(() => {
      setupAuthMock(mockCoachUser)
    })

    it("should mark attendance as ATTENDED", async () => {
      const updatedReg = createMockRegistration({
        id: 1,
        status: "ATTENDED",
      })

      mockPrisma.sessionRegistration.update.mockResolvedValue(updatedReg)

      const result = await markAttendance({
        registrationId: 1,
        status: "ATTENDED",
      })

      expect(result.status).toBe("ATTENDED")
      expect(mockPrisma.sessionRegistration.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "ATTENDED" },
      })
    })

    it("should mark attendance as NO_SHOW", async () => {
      const updatedReg = createMockRegistration({
        id: 1,
        status: "NO_SHOW",
      })

      mockPrisma.sessionRegistration.update.mockResolvedValue(updatedReg)

      const result = await markAttendance({
        registrationId: 1,
        status: "NO_SHOW",
      })

      expect(result.status).toBe("NO_SHOW")
      expect(mockPrisma.sessionRegistration.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "NO_SHOW" },
      })
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(
        markAttendance({ registrationId: 1, status: "ATTENDED" })
      ).rejects.toThrow()
    })

    it("should reject invalid status values", async () => {
      await expect(
        markAttendance({
          registrationId: 1,
          status: "INVALID" as "ATTENDED",
        })
      ).rejects.toThrow()
    })

    it("should reject invalid registrationId", async () => {
      await expect(
        markAttendance({ registrationId: 0, status: "ATTENDED" })
      ).rejects.toThrow()
    })
  })

  // ============================================
  // getSessionRegistrations (Coach action)
  // ============================================

  describe("getSessionRegistrations", () => {
    beforeEach(() => {
      setupAuthMock(mockCoachUser)
    })

    it("should return all registrations for a session", async () => {
      const regs = [
        createMockRegistration({ id: 1, sessionId: 5, userId: 10 }),
        createMockRegistration({ id: 2, sessionId: 5, userId: 20 }),
      ]

      mockPrisma.sessionRegistration.findMany.mockResolvedValue(regs)

      const result = await getSessionRegistrations(5)

      expect(result).toHaveLength(2)
      expect(mockPrisma.sessionRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 5 },
          include: expect.objectContaining({
            user: expect.any(Object),
          }),
        })
      )
    })

    it("should require coach role", async () => {
      setupAuthMock(mockClientUser)

      await expect(getSessionRegistrations(1)).rejects.toThrow()
    })

    it("should order by status, waitlist position, then registered time", async () => {
      mockPrisma.sessionRegistration.findMany.mockResolvedValue([])

      await getSessionRegistrations(1)

      expect(mockPrisma.sessionRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { status: "asc" },
            { waitlistPosition: "asc" },
            { registeredAt: "asc" },
          ],
        })
      )
    })
  })
})
