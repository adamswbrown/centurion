/**
 * Client Appointments Server Actions Tests
 *
 * Tests for client-facing appointment actions including
 * fetching own appointments, viewing details, and self-cancellation
 * with 24-hour policy enforcement.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Import mocks BEFORE importing the functions being tested
import {
  mockPrisma,
  resetPrismaMocks,
  setupAuthMock,
  mockClientUser,
  resetAuthMocks,
  resetGoogleCalendarMocks,
  mockDeleteGoogleCalendarEvent,
  resetEmailMocks,
  mockSendSystemEmail,
} from "../mocks"

import {
  createMockAppointment,
  createMockUser,
  resetIdCounters,
} from "../utils/test-data"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Now import the functions to test (after mocks are set up)
import {
  getMyAppointments,
  getMyAppointmentById,
  cancelMyAppointment,
} from "@/app/actions/client-appointments"

describe("Client Appointments Server Actions", () => {
  beforeEach(() => {
    resetPrismaMocks()
    resetAuthMocks()
    resetGoogleCalendarMocks()
    resetEmailMocks()
    resetIdCounters()

    // Default: authenticated as client (id: "3")
    setupAuthMock(mockClientUser)
  })

  // ==========================================================
  // getMyAppointments
  // ==========================================================

  describe("getMyAppointments", () => {
    it("should return all appointments for the authenticated user", async () => {
      const appointments = [
        createMockAppointment({ id: 1, userId: 3 }),
        createMockAppointment({ id: 2, userId: 3 }),
      ]
      mockPrisma.appointment.findMany.mockResolvedValue(appointments)

      const result = await getMyAppointments()

      expect(result).toEqual(appointments)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: { userId: 3 },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      })
    })

    it("should return an empty array when user has no appointments", async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([])

      const result = await getMyAppointments()

      expect(result).toEqual([])
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledOnce()
    })

    it("should filter appointments by date range when provided", async () => {
      const from = new Date("2025-06-01T00:00:00Z")
      const to = new Date("2025-06-30T23:59:59Z")
      const appointments = [
        createMockAppointment({ id: 1, userId: 3, startTime: new Date("2025-06-15T10:00:00Z") }),
      ]
      mockPrisma.appointment.findMany.mockResolvedValue(appointments)

      const result = await getMyAppointments({ from, to })

      expect(result).toEqual(appointments)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: 3,
          startTime: { gte: from },
          endTime: { lte: to },
        },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      })
    })

    it("should not apply date filter when only partial range is provided", async () => {
      const from = new Date("2025-06-01T00:00:00Z")
      mockPrisma.appointment.findMany.mockResolvedValue([])

      await getMyAppointments({ from })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: { userId: 3 },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      })
    })

    it("should throw when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getMyAppointments()).rejects.toThrow("Must be logged in")
    })
  })

  // ==========================================================
  // getMyAppointmentById
  // ==========================================================

  describe("getMyAppointmentById", () => {
    it("should return the appointment when owned by the user", async () => {
      const appointment = createMockAppointment({ id: 10, userId: 3 })
      mockPrisma.appointment.findFirst.mockResolvedValue(appointment)

      const result = await getMyAppointmentById(10)

      expect(result).toEqual(appointment)
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith({
        where: { id: 10, userId: 3 },
      })
    })

    it("should throw when appointment is not found or not owned by user", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null)

      await expect(getMyAppointmentById(999)).rejects.toThrow("Appointment not found")
    })

    it("should throw when not authenticated", async () => {
      setupAuthMock(null)

      await expect(getMyAppointmentById(10)).rejects.toThrow("Must be logged in")
    })
  })

  // ==========================================================
  // cancelMyAppointment
  // ==========================================================

  describe("cancelMyAppointment", () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now

    it("should successfully cancel an appointment more than 24 hours away", async () => {
      const appointment = createMockAppointment({
        id: 5,
        userId: 3,
        startTime: futureDate,
      })
      const user = createMockUser({
        id: 3,
        email: "client@test.com",
        name: "Client User",
      })

      mockPrisma.appointment.findFirst.mockResolvedValue(appointment)
      mockPrisma.appointment.delete.mockResolvedValue(appointment)
      mockPrisma.user.findUnique.mockResolvedValue(user)

      const result = await cancelMyAppointment(5)

      expect(result).toEqual({ success: true })
      expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      })
    })

    it("should enforce 24-hour cancellation policy", async () => {
      const soonDate = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
      const appointment = createMockAppointment({
        id: 6,
        userId: 3,
        startTime: soonDate,
      })

      mockPrisma.appointment.findFirst.mockResolvedValue(appointment)

      await expect(cancelMyAppointment(6)).rejects.toThrow(
        "Appointments can only be cancelled more than 24 hours in advance"
      )
      expect(mockPrisma.appointment.delete).not.toHaveBeenCalled()
    })

    it("should delete the Google Calendar event when present", async () => {
      const appointment = createMockAppointment({
        id: 7,
        userId: 3,
        startTime: futureDate,
        googleEventId: "google-event-123",
      })
      const user = createMockUser({ id: 3, email: "client@test.com" })

      mockPrisma.appointment.findFirst.mockResolvedValue(appointment)
      mockPrisma.appointment.delete.mockResolvedValue(appointment)
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await cancelMyAppointment(7)

      expect(mockDeleteGoogleCalendarEvent).toHaveBeenCalledWith("google-event-123")
    })

    it("should continue cancellation even if Google Calendar deletion fails", async () => {
      const appointment = createMockAppointment({
        id: 8,
        userId: 3,
        startTime: futureDate,
        googleEventId: "google-event-fail",
      })
      const user = createMockUser({ id: 3, email: "client@test.com" })

      mockPrisma.appointment.findFirst.mockResolvedValue(appointment)
      mockPrisma.appointment.delete.mockResolvedValue(appointment)
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockDeleteGoogleCalendarEvent.mockRejectedValueOnce(new Error("Google API error"))

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await cancelMyAppointment(8)

      expect(result).toEqual({ success: true })
      expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({ where: { id: 8 } })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting from Google Calendar:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it("should send a cancellation email to the user", async () => {
      const appointment = createMockAppointment({
        id: 9,
        userId: 3,
        startTime: futureDate,
      })
      const user = createMockUser({
        id: 3,
        email: "client@test.com",
        name: "Client User",
        isTestUser: false,
      })

      mockPrisma.appointment.findFirst.mockResolvedValue(appointment)
      mockPrisma.appointment.delete.mockResolvedValue(appointment)
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await cancelMyAppointment(9)

      expect(mockSendSystemEmail).toHaveBeenCalledWith({
        templateKey: "appointment_cancelled",
        to: "client@test.com",
        variables: {
          userName: "Client User",
          appointmentDate: expect.any(String),
          appointmentTime: expect.any(String),
        },
        isTestUser: false,
      })
    })

    it("should throw when appointment is not found", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null)

      await expect(cancelMyAppointment(999)).rejects.toThrow("Appointment not found")
      expect(mockPrisma.appointment.delete).not.toHaveBeenCalled()
    })

    it("should throw when not authenticated", async () => {
      setupAuthMock(null)

      await expect(cancelMyAppointment(5)).rejects.toThrow("Must be logged in")
      expect(mockPrisma.appointment.findFirst).not.toHaveBeenCalled()
    })
  })
})
