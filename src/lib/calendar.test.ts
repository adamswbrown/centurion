import { describe, expect, it } from "vitest"
import {
  formatTime24,
  formatTime12,
  getRepeatingDates,
  combineDateAndTime,
  getPrismaDateFilter,
} from "./calendar"

describe("calendar utilities", () => {
  describe("formatTime24", () => {
    it("formats time in 24-hour format", () => {
      const date = new Date("2024-01-15T14:30:00")
      expect(formatTime24(date)).toBe("14:30")
    })

    it("handles midnight correctly", () => {
      const date = new Date("2024-01-15T00:00:00")
      expect(formatTime24(date)).toBe("00:00")
    })
  })

  describe("formatTime12", () => {
    it("formats time in 12-hour format", () => {
      const date = new Date("2024-01-15T14:30:00")
      expect(formatTime12(date)).toBe("2:30 PM")
    })

    it("handles noon correctly", () => {
      const date = new Date("2024-01-15T12:00:00")
      expect(formatTime12(date)).toBe("12:00 PM")
    })
  })

  describe("getRepeatingDates", () => {
    it("generates repeating dates for specified weekdays", () => {
      const startDate = "2024-01-15" // Monday
      const weekdays = [1, 3, 5] // Monday, Wednesday, Friday
      const weeksToRepeat = 2

      const dates = getRepeatingDates(startDate, weekdays, weeksToRepeat)

      // Should generate 9 dates (3 weekdays * 3 weeks including start week)
      expect(dates).toHaveLength(9)

      // Check that all dates are on the correct weekdays
      dates.forEach((date) => {
        expect([1, 3, 5]).toContain(date.getDay())
      })
    })

    it("handles Sunday (weekday 0) correctly", () => {
      const startDate = "2024-01-15" // Monday
      const weekdays = [0] // Sunday
      const weeksToRepeat = 1

      const dates = getRepeatingDates(startDate, weekdays, weeksToRepeat)

      // Should generate 2 Sundays
      expect(dates).toHaveLength(2)
      dates.forEach((date) => {
        expect(date.getDay()).toBe(0)
      })
    })
  })

  describe("combineDateAndTime", () => {
    it("combines date and time strings correctly", () => {
      const result = combineDateAndTime("2024-01-15", "14:30")

      expect(result).not.toBeNull()
      expect(result?.getHours()).toBe(14)
      expect(result?.getMinutes()).toBe(30)
    })

    it("returns null for invalid input", () => {
      expect(combineDateAndTime("", "14:30")).toBeNull()
      expect(combineDateAndTime("2024-01-15", "")).toBeNull()
    })
  })

  describe("getPrismaDateFilter", () => {
    it("generates correct date filter for a month", () => {
      const filter = getPrismaDateFilter(2024, 0) // January 2024

      expect(filter.gte.toISOString()).toBe("2024-01-01T00:00:00.000Z")
      expect(filter.lt.toISOString()).toBe("2024-02-01T00:00:00.000Z")
    })

    it("handles year boundary correctly", () => {
      const filter = getPrismaDateFilter(2024, 11) // December 2024

      expect(filter.gte.toISOString()).toBe("2024-12-01T00:00:00.000Z")
      expect(filter.lt.toISOString()).toBe("2025-01-01T00:00:00.000Z")
    })

    it("throws error for odd offset", () => {
      expect(() => getPrismaDateFilter(2024, 0, 3)).toThrow("Offset must be an even number")
    })
  })
})
