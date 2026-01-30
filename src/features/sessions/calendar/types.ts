"use client"

export type CalendarView = "week" | "day" | "month"

export type SessionStatus = "available" | "registered" | "waitlisted" | "full" | "past"

// Type to distinguish between group sessions and 1-on-1 appointments
export type CalendarItemType = "session" | "appointment"

export interface CalendarSession {
  id: number
  title: string
  startTime: Date
  endTime: Date
  maxOccupancy: number
  location: string | null
  notes: string | null
  registeredCount: number
  classType: {
    id: number
    name: string
    description: string | null
    color: string | null
  } | null
  coach: {
    id: number
    name: string | null
    email: string
    image: string | null
  }
  // Item type to distinguish appointments from group sessions
  itemType?: CalendarItemType
}

export interface CalendarState {
  view: CalendarView
  currentDate: Date
}
