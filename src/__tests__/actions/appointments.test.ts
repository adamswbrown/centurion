/**
 * Appointments Server Actions Tests
 *
 * Tests for appointment-related server actions including
 * creation, updating, deletion, and Google Calendar sync.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { Prisma, AttendanceStatus } from "@prisma/client"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockCoachUser,
  mockClientUser,
  resetAuthMocks,
  resetGoogleCalendarMocks,
  mockAddMultipleEventsToGoogleCalendar,
  mockDeleteGoogleCalendarEvent,
  mockUpdateGoogleCalendarEvent,
  resetEmailMocks,
  sentEmails,
} from "../mocks"

import {
  createMockUser,
  createMockAppointment,
  resetIdCounters,
} from "../utils/test-data"

// Now import the functions to test (after mocks are set up)
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentById,
  getAppointments,
} from "@/app/actions/appointments"

describe("Appointments Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetGoogleCalendarMocks()
    resetEmailMocks()
    resetIdCounters()

    // Default: authenticated as coach
    setupAuthMock(mockCoachUser)

    // Clear environment
    delete process.env.GOOGLE_CALENDAR_ID
  })

  describe("createAppointment", () => {
    it("should create a single appointment successfully", async () => {
      const member = createMockUser({ id: 10, name: "Test Member" })
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split("T")[0]

      const mockAppointment = createMockAppointment({
        id: 1,
        userId: 10,
        fee: 75,
      })

      // Mock no existing appointments
      mockPrisma.appointment.findMany.mockResolvedValue([])

      // Mock transaction to return created appointment
      mockPrisma.$transaction.mockImplementation(async (operations) => {
        if (Array.isArray(operations)) {
          return [mockAppointment]
        }
        return operations(mockPrisma)
      })

      // Mock user lookup for email
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const result = await createAppointment({
        memberId: 10,
        title: "Test Session",
        date: dateStr,
        startTime: "09:00",
        endTime: "10:00",
        fee: 75,
        notes: "Initial consultation",
        weeksToRepeat: 0,
        selectedDays: [],
      })

      expect(result.appointments).toHaveLength(1)
      expect(result.syncStatus.success).toBe(true)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled()
    })

    it("should reject appointment creation for unauthenticated users", async () => {
      setupAuthMock(null)

      await expect(
        createAppointment({
          memberId: 1,
          title: "Test Session",
          date: "2024-02-01",
          startTime: "09:00",
          endTime: "10:00",
          fee: 50,
        })
      ).rejects.toThrow()
    })

    it("should reject appointment creation for clients", async () => {
      setupAuthMock(mockClientUser)

      await expect(
        createAppointment({
          memberId: 1,
          title: "Test Session",
          date: "2024-02-01",
          startTime: "09:00",
          endTime: "10:00",
          fee: 50,
        })
      ).rejects.toThrow()
    })

    it("should validate that end time is after start time", async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([])

      await expect(
        createAppointment({
          memberId: 1,
          title: "Test Session",
          date: "2024-02-01",
          startTime: "10:00",
          endTime: "09:00", // End before start
          fee: 50,
        })
      ).rejects.toThrow("End time must be after start time")
    })

    it("should validate required fields", async () => {
      await expect(
        createAppointment({
          memberId: 0, // Invalid: must be positive
          title: "Test Session",
          date: "2024-02-01",
          startTime: "09:00",
          endTime: "10:00",
          fee: 50,
        })
      ).rejects.toThrow()
    })

    it("should detect conflicts with existing appointments", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split("T")[0]

      const existingAppointment = createMockAppointment({
        id: 1,
        userId: 1,
        startTime: new Date(`${dateStr}T09:00:00`),
        endTime: new Date(`${dateStr}T10:00:00`),
      })

      mockPrisma.appointment.findMany.mockResolvedValue([existingAppointment])

      await expect(
        createAppointment({
          memberId: 1,
          title: "Test Session",
          date: dateStr,
          startTime: "09:30", // Overlaps with existing
          endTime: "10:30",
          fee: 50,
        })
      ).rejects.toThrow("Appointment conflicts with an existing session")
    })

    it("should create repeating appointments", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split("T")[0]

      const member = createMockUser({ id: 10 })
      const mockAppointments = [
        createMockAppointment({ id: 1, userId: 10 }),
        createMockAppointment({ id: 2, userId: 10 }),
        createMockAppointment({ id: 3, userId: 10 }),
      ]

      mockPrisma.appointment.findMany.mockResolvedValue([])
      mockPrisma.$transaction.mockResolvedValue(mockAppointments)
      mockPrisma.user.findUnique.mockResolvedValue(member)

      const weekday = new Date(dateStr).getDay()
      const result = await createAppointment({
        memberId: 10,
        title: "Test Session",
        date: dateStr,
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
        weeksToRepeat: 2, // Create for 3 weeks total
        selectedDays: [weekday],
      })

      expect(result.appointments).toHaveLength(3)
    })

    it("should sync with Google Calendar when configured", async () => {
      process.env.GOOGLE_CALENDAR_ID = "test-calendar-id"

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split("T")[0]

      const member = createMockUser({ id: 10, name: "Test Member" })
      const mockAppointment = createMockAppointment({ id: 1, userId: 10 })

      mockPrisma.appointment.findMany.mockResolvedValue([])
      mockPrisma.$transaction.mockResolvedValue([mockAppointment])
      mockPrisma.user.findUnique.mockResolvedValue(member)
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment)

      const result = await createAppointment({
        memberId: 10,
        title: "Test Session",
        date: dateStr,
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
      })

      expect(mockAddMultipleEventsToGoogleCalendar).toHaveBeenCalled()
      expect(result.syncStatus.success).toBe(true)
    })

    it("should send confirmation email after creating appointment", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split("T")[0]

      const member = createMockUser({
        id: 10,
        name: "Test Member",
        email: "member@test.com",
        isTestUser: true,
      })

      const mockAppointment = createMockAppointment({
        id: 1,
        userId: 10,
        startTime: new Date(`${dateStr}T09:00:00`),
      })

      mockPrisma.appointment.findMany.mockResolvedValue([])
      mockPrisma.$transaction.mockResolvedValue([mockAppointment])
      mockPrisma.user.findUnique.mockResolvedValue(member)

      await createAppointment({
        memberId: 10,
        title: "Test Session",
        date: dateStr,
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
      })

      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].to).toBe("member@test.com")
      expect(sentEmails[0].templateKey).toBe("appointment_confirmation")
    })
  })

  describe("updateAppointment", () => {
    it("should update an appointment successfully", async () => {
      const existingAppointment = createMockAppointment({
        id: 1,
        userId: 10,
        startTime: new Date("2024-02-01T09:00:00"),
        endTime: new Date("2024-02-01T10:00:00"),
      })

      const updatedAppointment = {
        ...existingAppointment,
        startTime: new Date("2024-02-01T10:00:00"),
        endTime: new Date("2024-02-01T11:00:00"),
        fee: new Prisma.Decimal(100),
      }

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.appointment.findFirst.mockResolvedValue(null) // No conflict
      mockPrisma.appointment.update.mockResolvedValue(updatedAppointment)

      const result = await updateAppointment({
        id: 1,
        title: "Updated Session",
        startTime: "10:00",
        endTime: "11:00",
        fee: 100,
      })

      expect(result.appointment).toBeDefined()
      expect(mockPrisma.appointment.update).toHaveBeenCalled()
    })

    it("should throw error when appointment not found", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null)

      await expect(
        updateAppointment({
          id: 999,
          title: "Test Session",
          startTime: "10:00",
          endTime: "11:00",
          fee: 50,
        })
      ).rejects.toThrow("Appointment not found")
    })

    it("should detect conflicts when updating", async () => {
      const existingAppointment = createMockAppointment({
        id: 1,
        userId: 10,
        startTime: new Date("2024-02-01T09:00:00"),
        endTime: new Date("2024-02-01T10:00:00"),
      })

      const conflictingAppointment = createMockAppointment({
        id: 2,
        userId: 10,
        startTime: new Date("2024-02-01T10:00:00"),
        endTime: new Date("2024-02-01T11:00:00"),
      })

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.appointment.findFirst.mockResolvedValue(conflictingAppointment)

      await expect(
        updateAppointment({
          id: 1,
          title: "Test Session",
          startTime: "10:00",
          endTime: "11:00",
          fee: 50,
        })
      ).rejects.toThrow("Appointment conflicts with an existing session")
    })

    it("should update status when provided", async () => {
      const existingAppointment = createMockAppointment({
        id: 1,
        userId: 10,
        status: AttendanceStatus.NOT_ATTENDED,
      })

      const updatedAppointment = {
        ...existingAppointment,
        status: AttendanceStatus.ATTENDED,
      }

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.appointment.findFirst.mockResolvedValue(null)
      mockPrisma.appointment.update.mockResolvedValue(updatedAppointment)

      const result = await updateAppointment({
        id: 1,
        title: "Test Session",
        startTime: "09:00",
        endTime: "10:00",
        fee: 50,
        status: AttendanceStatus.ATTENDED,
      })

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AttendanceStatus.ATTENDED,
          }),
        })
      )
    })

    it("should sync update with Google Calendar when event exists", async () => {
      const existingAppointment = createMockAppointment({
        id: 1,
        userId: 10,
        googleEventId: "google-event-123",
      })

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.appointment.findFirst.mockResolvedValue(null)
      mockPrisma.appointment.update.mockResolvedValue(existingAppointment)

      await updateAppointment({
        id: 1,
        title: "Test Session",
        startTime: "10:00",
        endTime: "11:00",
        fee: 50,
      })

      expect(mockUpdateGoogleCalendarEvent).toHaveBeenCalledWith(
        "google-event-123",
        expect.any(Object)
      )
    })
  })

  describe("deleteAppointment", () => {
    it("should delete an appointment successfully", async () => {
      const member = createMockUser({ id: 10, email: "member@test.com" })
      const existingAppointment = {
        ...createMockAppointment({ id: 1 }),
        userId: 10,
        googleEventId: null,
      }

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.user.findUnique.mockResolvedValue(member)
      mockPrisma.appointment.delete.mockResolvedValue(existingAppointment)

      const result = await deleteAppointment(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it("should throw error when appointment not found", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null)

      await expect(deleteAppointment(999)).rejects.toThrow("Appointment not found")
    })

    it("should delete Google Calendar event when exists", async () => {
      const member = createMockUser({ id: 10 })
      const existingAppointment = {
        ...createMockAppointment({ id: 1 }),
        userId: 10,
        googleEventId: "google-event-123",
      }

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.user.findUnique.mockResolvedValue(member)
      mockPrisma.appointment.delete.mockResolvedValue(existingAppointment)

      await deleteAppointment(1)

      expect(mockDeleteGoogleCalendarEvent).toHaveBeenCalledWith("google-event-123")
    })

    it("should send cancellation email", async () => {
      const member = createMockUser({
        id: 10,
        email: "member@test.com",
        isTestUser: true,
      })
      const existingAppointment = {
        ...createMockAppointment({ id: 1 }),
        userId: 10,
        googleEventId: null,
      }

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppointment)
      mockPrisma.user.findUnique.mockResolvedValue(member)
      mockPrisma.appointment.delete.mockResolvedValue(existingAppointment)

      await deleteAppointment(1)

      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].templateKey).toBe("appointment_cancelled")
    })
  })

  describe("getAppointmentById", () => {
    it("should return appointment with user details", async () => {
      const member = createMockUser({ id: 10 })
      const appointment = {
        ...createMockAppointment({ id: 1, userId: 10 }),
        user: { id: 10, name: member.name, email: member.email },
      }

      mockPrisma.appointment.findUnique.mockResolvedValue(appointment)

      const result = await getAppointmentById(1)

      expect(result.id).toBe(1)
      expect(result.user).toBeDefined()
      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          fee: true,
          status: true,
          notes: true,
          videoUrl: true,
          googleEventId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
    })

    it("should throw error when appointment not found", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null)

      await expect(getAppointmentById(999)).rejects.toThrow("Appointment not found")
    })
  })

  describe("getAppointments", () => {
    it("should return all appointments", async () => {
      const appointments = [
        createMockAppointment({ id: 1 }),
        createMockAppointment({ id: 2 }),
      ].map((apt) => ({
        ...apt,
        user: { id: apt.userId, name: "User", email: "user@test.com" },
      }))

      mockPrisma.appointment.findMany.mockResolvedValue(appointments)

      const result = await getAppointments()

      expect(result).toHaveLength(2)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled()
    })

    it("should filter by memberId", async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([])

      await getAppointments({ memberId: 10 })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 10 }),
        })
      )
    })

    it("should filter by date range", async () => {
      const from = new Date("2024-01-01")
      const to = new Date("2024-01-31")

      mockPrisma.appointment.findMany.mockResolvedValue([])

      await getAppointments({ from, to })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: { gte: from },
            endTime: { lte: to },
          }),
        })
      )
    })
  })
})
