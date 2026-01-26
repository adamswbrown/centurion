/**
 * Calendar Library Tests
 *
 * Tests for the calendar utility functions.
 * These are pure functions that can be tested without mocks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  formatTime24,
  formatTime12,
  formatTimeRange,
  combineDateAndTime,
  addHours,
  extractTimeString,
  getPrismaDateFilter,
  getNextMonthFilter,
  getPreviousMonthFilter,
  generateCalendarMonth,
  getWeekday,
  getRepeatingDates,
  type Day,
  type DateFilter,
} from "@/lib/calendar"

describe("Calendar Library", () => {
  describe("formatTime24", () => {
    it("should format morning time correctly", () => {
      const date = new Date(2024, 0, 1, 9, 30)
      expect(formatTime24(date)).toBe("09:30")
    })

    it("should format afternoon time correctly", () => {
      const date = new Date(2024, 0, 1, 14, 45)
      expect(formatTime24(date)).toBe("14:45")
    })

    it("should format midnight correctly", () => {
      const date = new Date(2024, 0, 1, 0, 0)
      expect(formatTime24(date)).toBe("00:00")
    })
  })

  describe("formatTime12", () => {
    it("should format morning time with AM", () => {
      const date = new Date(2024, 0, 1, 9, 30)
      expect(formatTime12(date)).toBe("9:30 AM")
    })

    it("should format afternoon time with PM", () => {
      const date = new Date(2024, 0, 1, 14, 30)
      expect(formatTime12(date)).toBe("2:30 PM")
    })

    it("should format noon correctly", () => {
      const date = new Date(2024, 0, 1, 12, 0)
      expect(formatTime12(date)).toBe("12:00 PM")
    })

    it("should format midnight correctly", () => {
      const date = new Date(2024, 0, 1, 0, 0)
      expect(formatTime12(date)).toBe("12:00 AM")
    })
  })

  describe("formatTimeRange", () => {
    it("should format time range in 12-hour format by default", () => {
      const start = new Date(2024, 0, 1, 9, 0)
      const end = new Date(2024, 0, 1, 10, 0)
      expect(formatTimeRange(start, end)).toBe("9:00 AM - 10:00 AM")
    })

    it("should format time range in 24-hour format when specified", () => {
      const start = new Date(2024, 0, 1, 9, 0)
      const end = new Date(2024, 0, 1, 17, 30)
      expect(formatTimeRange(start, end, true)).toBe("09:00 - 17:30")
    })
  })

  describe("combineDateAndTime", () => {
    it("should combine date and time strings correctly", () => {
      const result = combineDateAndTime("2024-01-15", "09:30")
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(0) // January
      expect(result?.getDate()).toBe(15)
      expect(result?.getHours()).toBe(9)
      expect(result?.getMinutes()).toBe(30)
    })

    it("should return null for empty date", () => {
      expect(combineDateAndTime("", "09:30")).toBeNull()
    })

    it("should return null for empty time", () => {
      expect(combineDateAndTime("2024-01-15", "")).toBeNull()
    })

    it("should handle afternoon times", () => {
      const result = combineDateAndTime("2024-06-20", "14:45")
      expect(result?.getHours()).toBe(14)
      expect(result?.getMinutes()).toBe(45)
    })
  })

  describe("addHours", () => {
    it("should add hours to a date", () => {
      const date = new Date(2024, 0, 1, 10, 0)
      const result = addHours(date, 2)
      expect(result.getHours()).toBe(12)
    })

    it("should handle crossing midnight", () => {
      const date = new Date(2024, 0, 1, 23, 0)
      const result = addHours(date, 3)
      expect(result.getDate()).toBe(2)
      expect(result.getHours()).toBe(2)
    })

    it("should handle negative hours", () => {
      const date = new Date(2024, 0, 1, 10, 0)
      const result = addHours(date, -2)
      expect(result.getHours()).toBe(8)
    })
  })

  describe("extractTimeString", () => {
    it("should extract time string from date", () => {
      const date = new Date(2024, 0, 1, 14, 30)
      expect(extractTimeString(date)).toBe("14:30")
    })

    it("should return empty string for null", () => {
      expect(extractTimeString(null)).toBe("")
    })

    it("should pad single-digit hours and minutes", () => {
      const date = new Date(2024, 0, 1, 9, 5)
      expect(extractTimeString(date)).toBe("09:05")
    })
  })

  describe("getPrismaDateFilter", () => {
    it("should create date filter for a single month (offset 0)", () => {
      const result = getPrismaDateFilter(2024, 5, 0) // June 2024

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2024, 5, 1)).toISOString())
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2024, 6, 1)).toISOString())
    })

    it("should create date filter with offset 2", () => {
      const result = getPrismaDateFilter(2024, 5, 2) // June with 1 month each way

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2024, 4, 1)).toISOString()) // May
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2024, 7, 1)).toISOString()) // Aug
    })

    it("should handle year boundary at start of year", () => {
      const result = getPrismaDateFilter(2024, 0, 2) // January with offset

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2023, 11, 1)).toISOString()) // Dec 2023
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2024, 2, 1)).toISOString()) // Mar 2024
    })

    it("should handle year boundary at end of year", () => {
      const result = getPrismaDateFilter(2024, 11, 2) // December with offset

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2024, 10, 1)).toISOString()) // Nov 2024
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2025, 1, 1)).toISOString()) // Feb 2025
    })

    it("should throw error for odd offset", () => {
      expect(() => getPrismaDateFilter(2024, 5, 3)).toThrow("Offset must be an even number")
    })
  })

  describe("getNextMonthFilter", () => {
    it("should get next month filter", () => {
      const currentFilter: DateFilter = {
        gte: new Date(Date.UTC(2024, 5, 1)),
        lt: new Date(Date.UTC(2024, 6, 1)),
      }

      const result = getNextMonthFilter(currentFilter)

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2024, 6, 1)).toISOString())
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2024, 7, 1)).toISOString())
    })

    it("should handle December to January transition", () => {
      const currentFilter: DateFilter = {
        gte: new Date(Date.UTC(2024, 11, 1)),
        lt: new Date(Date.UTC(2025, 0, 1)),
      }

      const result = getNextMonthFilter(currentFilter)

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2025, 0, 1)).toISOString())
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2025, 1, 1)).toISOString())
    })
  })

  describe("getPreviousMonthFilter", () => {
    it("should get previous month filter", () => {
      const currentFilter: DateFilter = {
        gte: new Date(Date.UTC(2024, 5, 1)),
        lt: new Date(Date.UTC(2024, 6, 1)),
      }

      const result = getPreviousMonthFilter(currentFilter)

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2024, 4, 1)).toISOString())
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2024, 5, 1)).toISOString())
    })

    it("should handle January to December transition", () => {
      const currentFilter: DateFilter = {
        gte: new Date(Date.UTC(2024, 0, 1)),
        lt: new Date(Date.UTC(2024, 1, 1)),
      }

      const result = getPreviousMonthFilter(currentFilter)

      expect(result.gte.toISOString()).toEqual(new Date(Date.UTC(2023, 11, 1)).toISOString())
      expect(result.lt.toISOString()).toEqual(new Date(Date.UTC(2024, 0, 1)).toISOString())
    })
  })

  describe("generateCalendarMonth", () => {
    it("should generate correct days for a single month", () => {
      const dateFilter: DateFilter = {
        gte: new Date(Date.UTC(2024, 0, 1)), // Jan 1
        lt: new Date(Date.UTC(2024, 1, 1)), // Feb 1
      }

      const result = generateCalendarMonth(dateFilter)

      expect(result.length).toBe(31) // January has 31 days
      expect(result[0].day).toBe(1)
      expect(result[0].month).toBe(0) // January (0-based)
      expect(result[0].year).toBe(2024)
      expect(result[30].day).toBe(31)
    })

    it("should generate correct weekdays", () => {
      const dateFilter: DateFilter = {
        gte: new Date(2024, 0, 1), // Monday Jan 1, 2024
        lt: new Date(2024, 0, 8), // Jan 8
      }

      const result = generateCalendarMonth(dateFilter)

      expect(result.length).toBe(7)
      // Weekdays should be consecutive
      for (let i = 1; i < result.length; i++) {
        expect(result[i].weekDay).toBe((result[i - 1].weekDay + 1) % 7)
      }
    })

    it("should handle February in leap year", () => {
      const dateFilter: DateFilter = {
        gte: new Date(Date.UTC(2024, 1, 1)), // Feb 1, 2024 (leap year)
        lt: new Date(Date.UTC(2024, 2, 1)), // Mar 1
      }

      const result = generateCalendarMonth(dateFilter)

      expect(result.length).toBe(29) // 2024 is a leap year
    })

    it("should handle February in non-leap year", () => {
      const dateFilter: DateFilter = {
        gte: new Date(Date.UTC(2023, 1, 1)), // Feb 1, 2023 (not a leap year)
        lt: new Date(Date.UTC(2023, 2, 1)), // Mar 1
      }

      const result = generateCalendarMonth(dateFilter)

      expect(result.length).toBe(28)
    })
  })

  describe("getWeekday", () => {
    it("should return correct weekday for a date string", () => {
      // January 1, 2024 was a Monday (weekday 1)
      expect(getWeekday("2024-01-01")).toBe(1)
    })

    it("should return 0 for Sunday", () => {
      // January 7, 2024 was a Sunday
      expect(getWeekday("2024-01-07")).toBe(0)
    })

    it("should return 6 for Saturday", () => {
      // January 6, 2024 was a Saturday
      expect(getWeekday("2024-01-06")).toBe(6)
    })
  })

  describe("getRepeatingDates", () => {
    it("should generate repeating dates for a single weekday", () => {
      // Starting Monday, repeat for 2 more weeks
      const result = getRepeatingDates("2024-01-01", [1], 2)

      expect(result.length).toBe(3) // 3 Mondays
      expect(result[0].getDate()).toBe(1) // Jan 1
      expect(result[1].getDate()).toBe(8) // Jan 8
      expect(result[2].getDate()).toBe(15) // Jan 15
    })

    it("should generate repeating dates for multiple weekdays", () => {
      const result = getRepeatingDates("2024-01-01", [1, 3, 5], 1) // Mon, Wed, Fri for 2 weeks

      expect(result.length).toBe(6) // 2 weeks * 3 days
    })

    it("should handle Sunday (weekday 0) specially", () => {
      const result = getRepeatingDates("2024-01-01", [0], 1) // Sundays for 2 weeks

      expect(result.length).toBe(2)
      // Sundays should be Jan 7 and Jan 14
      expect(result[0].getDate()).toBe(7)
      expect(result[1].getDate()).toBe(14)
    })

    it("should work with no repetition (weeksToRepeat = 0)", () => {
      const result = getRepeatingDates("2024-01-01", [1, 3], 0)

      expect(result.length).toBe(2) // Just the initial week
    })
  })
})
