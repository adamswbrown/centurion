"use client"

export type CalendarView = "week" | "day" | "month"

export type SessionStatus = "available" | "registered" | "waitlisted" | "full" | "past"

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
}

export interface CalendarState {
  view: CalendarView
  currentDate: Date
}
