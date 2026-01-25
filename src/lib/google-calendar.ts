"use server"

import { JWT } from "google-auth-library"
import { google, calendar_v3 } from "googleapis"

import Schema$Event = calendar_v3.Schema$Event

const getCalendarClient = () => {
  const jwtClient = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  })

  return google.calendar({ version: "v3", auth: jwtClient })
}

export interface CalendarEvent {
  id?: string
  title: string
  description?: string
  startDate: Date | string
  endDate: Date | string
  location?: string
  isAllDay?: boolean
}

export async function addEventToGoogleCalendar(event: CalendarEvent) {
  try {
    const calendar = getCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error("Google Calendar ID is not defined in environment variables")
    }

    const googleEvent = {
      summary: event.title,
      description: event.description || "",
      location: event.location || "",
      start: event.isAllDay
        ? { date: new Date(event.startDate).toISOString().split("T")[0] }
        : {
            dateTime: new Date(event.startDate).toISOString(),
            timeZone: process.env.TIME_ZONE || "America/New_York",
          },
      end: event.isAllDay
        ? { date: new Date(event.endDate).toISOString().split("T")[0] }
        : {
            dateTime: new Date(event.endDate).toISOString(),
            timeZone: process.env.TIME_ZONE || "America/New_York",
          },
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: googleEvent,
    })

    return response.data
  } catch (error) {
    console.error("Error adding event to Google Calendar:", error)
    throw error
  }
}

export async function addMultipleEventsToGoogleCalendar(events: CalendarEvent[]) {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID
    if (!calendarId) {
      throw new Error("Google Calendar ID is not defined in environment variables")
    }

    type GoogleCalendarResult =
      | { success: true; event: Schema$Event; originalEvent: CalendarEvent }
      | { success: false; error: string; originalEvent: CalendarEvent }

    const batchSize = 10
    const results: GoogleCalendarResult[] = []

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, Math.min(i + batchSize, events.length))

      const batchPromises = batch.map(
        async (event): Promise<GoogleCalendarResult> => {
          try {
            const calendar = getCalendarClient()

            const googleEvent = {
              summary: event.title,
              description: event.description || "",
              location: event.location || "",
              start: event.isAllDay
                ? { date: new Date(event.startDate).toISOString().split("T")[0] }
                : {
                    dateTime: new Date(event.startDate).toISOString(),
                    timeZone: process.env.TIME_ZONE || "America/New_York",
                  },
              end: event.isAllDay
                ? { date: new Date(event.endDate).toISOString().split("T")[0] }
                : {
                    dateTime: new Date(event.endDate).toISOString(),
                    timeZone: process.env.TIME_ZONE || "America/New_York",
                  },
            }

            const response = await calendar.events.insert({
              calendarId,
              requestBody: googleEvent,
            })

            return { success: true, event: response.data, originalEvent: event }
          } catch (error) {
            console.error(
              `Error adding event "${event.title}" to Google Calendar:`,
              error,
            )
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
              originalEvent: event,
            }
          }
        },
      )

      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach((result, batchIndex) => {
        if (result.status === "fulfilled") {
          results.push(result.value)
        } else {
          const event = batch[batchIndex]
          results.push({
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown error",
            originalEvent: event,
          })
        }
      })
    }

    const processedResults = results.map((result) => {
      if (result.success) {
        return {
          success: true,
          event: result.event,
          originalEvent: result.originalEvent,
          googleCalendarEventId: result.event.id,
        }
      }
      return {
        success: false,
        error: result.error,
        originalEvent: result.originalEvent,
      }
    })

    return processedResults
  } catch (error) {
    console.error("Error in batch operation:", error)
    throw error
  }
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  event: CalendarEvent,
) {
  try {
    const calendar = getCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error("Google Calendar ID is not defined in environment variables")
    }

    const googleEvent = {
      summary: event.title,
      description: event.description || "",
      location: event.location || "",
      start: event.isAllDay
        ? { date: new Date(event.startDate).toISOString().split("T")[0] }
        : {
            dateTime: new Date(event.startDate).toISOString(),
            timeZone: process.env.TIME_ZONE || "America/New_York",
          },
      end: event.isAllDay
        ? { date: new Date(event.endDate).toISOString().split("T")[0] }
        : {
            dateTime: new Date(event.endDate).toISOString(),
            timeZone: process.env.TIME_ZONE || "America/New_York",
          },
    }

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: googleEvent,
    })

    return response.data
  } catch (error) {
    console.error("Error updating event in Google Calendar:", error)
    throw error
  }
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  try {
    const calendar = getCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error("Google Calendar ID is not defined in environment variables")
    }

    await calendar.events.delete({
      calendarId,
      eventId,
    })

    return true
  } catch (error) {
    console.error("Error deleting event from Google Calendar:", error)
    throw error
  }
}
