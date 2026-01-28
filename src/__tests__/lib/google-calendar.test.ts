import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"

const { mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock("googleapis", () => ({
  google: {
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      },
    }),
  },
}))

vi.mock("google-auth-library", () => ({
  JWT: vi.fn().mockImplementation(() => ({})),
}))

import {
  addEventToGoogleCalendar,
  addMultipleEventsToGoogleCalendar,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google-calendar"

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GOOGLE_CALENDAR_ID = "test-calendar-id"
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@test.iam.gserviceaccount.com"
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "test-key"
})

afterAll(() => {
  process.env = originalEnv
})

describe("addEventToGoogleCalendar", () => {
  it("creates event with correct params", async () => {
    mockInsert.mockResolvedValueOnce({
      data: { id: "event-123", summary: "Test Event" },
    })

    const result = await addEventToGoogleCalendar({
      title: "Test Event",
      description: "Test Description",
      startDate: new Date("2025-01-20T10:00:00Z"),
      endDate: new Date("2025-01-20T11:00:00Z"),
      location: "Room A",
    })

    expect(result).toEqual({ id: "event-123", summary: "Test Event" })
    expect(mockInsert).toHaveBeenCalledWith({
      calendarId: "test-calendar-id",
      requestBody: expect.objectContaining({
        summary: "Test Event",
        description: "Test Description",
        location: "Room A",
      }),
    })
  })

  it("handles all-day events", async () => {
    mockInsert.mockResolvedValueOnce({
      data: { id: "event-456" },
    })

    const result = await addEventToGoogleCalendar({
      title: "All Day",
      startDate: new Date("2025-01-20"),
      endDate: new Date("2025-01-20"),
      isAllDay: true,
    })

    expect(result).toBeDefined()
    const call = mockInsert.mock.calls[0][0]
    expect(call.requestBody.start).toHaveProperty("date")
    expect(call.requestBody.start).not.toHaveProperty("dateTime")
  })

  it("throws when no calendar ID", async () => {
    delete process.env.GOOGLE_CALENDAR_ID

    await expect(
      addEventToGoogleCalendar({
        title: "Test",
        startDate: new Date("2025-01-20T10:00:00Z"),
        endDate: new Date("2025-01-20T11:00:00Z"),
      })
    ).rejects.toThrow("Google Calendar ID")
  })

  it("propagates API errors", async () => {
    mockInsert.mockRejectedValueOnce(new Error("API Error"))

    await expect(
      addEventToGoogleCalendar({
        title: "Test",
        startDate: new Date("2025-01-20T10:00:00Z"),
        endDate: new Date("2025-01-20T11:00:00Z"),
      })
    ).rejects.toThrow("API Error")
  })

  it("uses default empty strings for optional fields", async () => {
    mockInsert.mockResolvedValueOnce({ data: { id: "e1" } })

    await addEventToGoogleCalendar({
      title: "Minimal",
      startDate: new Date("2025-01-20T10:00:00Z"),
      endDate: new Date("2025-01-20T11:00:00Z"),
    })

    const call = mockInsert.mock.calls[0][0]
    expect(call.requestBody.description).toBe("")
    expect(call.requestBody.location).toBe("")
  })
})

describe("addMultipleEventsToGoogleCalendar", () => {
  it("processes batch of events", async () => {
    mockInsert
      .mockResolvedValueOnce({ data: { id: "e1" } })
      .mockResolvedValueOnce({ data: { id: "e2" } })

    const events = [
      { title: "Event 1", startDate: new Date("2025-01-20T10:00:00Z"), endDate: new Date("2025-01-20T11:00:00Z") },
      { title: "Event 2", startDate: new Date("2025-01-21T10:00:00Z"), endDate: new Date("2025-01-21T11:00:00Z") },
    ]

    const results = await addMultipleEventsToGoogleCalendar(events)

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it("handles mixed success and failure", async () => {
    mockInsert
      .mockResolvedValueOnce({ data: { id: "e1" } })
      .mockRejectedValueOnce(new Error("Insert failed"))

    const events = [
      { title: "Good", startDate: new Date("2025-01-20T10:00:00Z"), endDate: new Date("2025-01-20T11:00:00Z") },
      { title: "Bad", startDate: new Date("2025-01-21T10:00:00Z"), endDate: new Date("2025-01-21T11:00:00Z") },
    ]

    const results = await addMultipleEventsToGoogleCalendar(events)

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(false)
  })

  it("throws when no calendar ID", async () => {
    delete process.env.GOOGLE_CALENDAR_ID

    await expect(
      addMultipleEventsToGoogleCalendar([
        { title: "Test", startDate: new Date("2025-01-20T10:00:00Z"), endDate: new Date("2025-01-20T11:00:00Z") },
      ])
    ).rejects.toThrow("Google Calendar ID")
  })

  it("handles empty array", async () => {
    const results = await addMultipleEventsToGoogleCalendar([])

    expect(results).toHaveLength(0)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

describe("updateGoogleCalendarEvent", () => {
  it("updates with correct eventId", async () => {
    mockUpdate.mockResolvedValueOnce({ data: { id: "event-123" } })

    const result = await updateGoogleCalendarEvent("event-123", {
      title: "Updated Event",
      startDate: new Date("2025-01-20T10:00:00Z"),
      endDate: new Date("2025-01-20T11:00:00Z"),
    })

    expect(result).toEqual({ id: "event-123" })
    expect(mockUpdate).toHaveBeenCalledWith({
      calendarId: "test-calendar-id",
      eventId: "event-123",
      requestBody: expect.objectContaining({
        summary: "Updated Event",
      }),
    })
  })

  it("throws when no calendar ID", async () => {
    delete process.env.GOOGLE_CALENDAR_ID

    await expect(
      updateGoogleCalendarEvent("event-123", {
        title: "Test",
        startDate: new Date("2025-01-20T10:00:00Z"),
        endDate: new Date("2025-01-20T11:00:00Z"),
      })
    ).rejects.toThrow("Google Calendar ID")
  })

  it("propagates API errors", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("Not found"))

    await expect(
      updateGoogleCalendarEvent("bad-id", {
        title: "Test",
        startDate: new Date("2025-01-20T10:00:00Z"),
        endDate: new Date("2025-01-20T11:00:00Z"),
      })
    ).rejects.toThrow("Not found")
  })
})

describe("deleteGoogleCalendarEvent", () => {
  it("deletes with correct eventId", async () => {
    mockDelete.mockResolvedValueOnce({})

    const result = await deleteGoogleCalendarEvent("event-123")

    expect(result).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith({
      calendarId: "test-calendar-id",
      eventId: "event-123",
    })
  })

  it("throws when no calendar ID", async () => {
    delete process.env.GOOGLE_CALENDAR_ID

    await expect(deleteGoogleCalendarEvent("event-123")).rejects.toThrow(
      "Google Calendar ID"
    )
  })

  it("propagates API errors", async () => {
    mockDelete.mockRejectedValueOnce(new Error("Delete failed"))

    await expect(deleteGoogleCalendarEvent("event-123")).rejects.toThrow(
      "Delete failed"
    )
  })
})
