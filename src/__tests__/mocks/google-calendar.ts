/**
 * Google Calendar Mock for Testing
 *
 * Mocks the Google Calendar integration to prevent actual API calls
 * during testing.
 */

import { vi } from "vitest"

export const mockAddEventToGoogleCalendar = vi.fn().mockResolvedValue({
  id: "mock-google-event-id",
})

export const mockAddMultipleEventsToGoogleCalendar = vi.fn().mockImplementation((events) =>
  Promise.resolve(
    events.map(() => ({
      success: true,
      googleCalendarEventId: `mock-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }))
  )
)

export const mockUpdateGoogleCalendarEvent = vi.fn().mockResolvedValue({
  id: "mock-google-event-id",
})

export const mockDeleteGoogleCalendarEvent = vi.fn().mockResolvedValue({})

// Reset all google calendar mocks
export function resetGoogleCalendarMocks() {
  mockAddEventToGoogleCalendar.mockReset()
  mockAddMultipleEventsToGoogleCalendar.mockReset()
  mockUpdateGoogleCalendarEvent.mockReset()
  mockDeleteGoogleCalendarEvent.mockReset()

  // Restore default implementations
  mockAddEventToGoogleCalendar.mockResolvedValue({
    id: "mock-google-event-id",
  })
  mockAddMultipleEventsToGoogleCalendar.mockImplementation((events) =>
    Promise.resolve(
      events.map(() => ({
        success: true,
        googleCalendarEventId: `mock-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }))
    )
  )
  mockUpdateGoogleCalendarEvent.mockResolvedValue({
    id: "mock-google-event-id",
  })
  mockDeleteGoogleCalendarEvent.mockResolvedValue({})
}

// Setup module mock
vi.mock("@/lib/google-calendar", () => ({
  addEventToGoogleCalendar: mockAddEventToGoogleCalendar,
  addMultipleEventsToGoogleCalendar: mockAddMultipleEventsToGoogleCalendar,
  updateGoogleCalendarEvent: mockUpdateGoogleCalendarEvent,
  deleteGoogleCalendarEvent: mockDeleteGoogleCalendarEvent,
}))
