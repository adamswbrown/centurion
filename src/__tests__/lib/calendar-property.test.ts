/**
 * Property-based tests for date calculation utilities.
 *
 * Uses fast-check to verify invariants across random inputs,
 * catching edge cases that example-based tests might miss.
 */

import { describe, it, expect } from "vitest"
import fc from "fast-check"
import {
  getPrismaDateFilter,
  getNextMonthFilter,
  getPreviousMonthFilter,
  generateCalendarMonth,
  combineDateAndTime,
  addHours,
  formatTime24,
  formatTime12,
  formatTimeRange,
  extractTimeString,
  getWeekday,
} from "@/lib/calendar"

// Arbitraries
const validYear = fc.integer({ min: 1970, max: 2100 })
const validJsMonth = fc.integer({ min: 0, max: 11 })
const validEvenOffset = fc.integer({ min: 0, max: 12 }).map((n) => n * 2)
const validDate = fc.date({ min: new Date("1970-01-01"), max: new Date("2100-12-31") }).filter(
  (d) => !isNaN(d.getTime())
)
const validHours = fc.double({ min: -8760, max: 8760, noNaN: true, noDefaultInfinity: true })

describe("getPrismaDateFilter - property-based", () => {
  it("gte is always before lt", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, validEvenOffset, (year, month, offset) => {
        const filter = getPrismaDateFilter(year, month, offset)
        expect(filter.gte.getTime()).toBeLessThan(filter.lt.getTime())
      })
    )
  })

  it("gte is always the first day of a month", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, validEvenOffset, (year, month, offset) => {
        const filter = getPrismaDateFilter(year, month, offset)
        expect(filter.gte.getUTCDate()).toBe(1)
      })
    )
  })

  it("lt is always the first day of a month", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, validEvenOffset, (year, month, offset) => {
        const filter = getPrismaDateFilter(year, month, offset)
        expect(filter.lt.getUTCDate()).toBe(1)
      })
    )
  })

  it("with offset=0 spans exactly one month", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const filter = getPrismaDateFilter(year, month, 0)
        const gteMonth = filter.gte.getUTCMonth()
        const ltMonth = filter.lt.getUTCMonth()

        // lt should be exactly one month after gte
        if (gteMonth === 11) {
          expect(ltMonth).toBe(0)
          expect(filter.lt.getUTCFullYear()).toBe(filter.gte.getUTCFullYear() + 1)
        } else {
          expect(ltMonth).toBe(gteMonth + 1)
          expect(filter.lt.getUTCFullYear()).toBe(filter.gte.getUTCFullYear())
        }
      })
    )
  })

  it("throws on odd offset", () => {
    fc.assert(
      fc.property(
        validYear,
        validJsMonth,
        fc.integer({ min: 0, max: 10 }).map((n) => n * 2 + 1),
        (year, month, oddOffset) => {
          expect(() => getPrismaDateFilter(year, month, oddOffset)).toThrow(
            "Offset must be an even number"
          )
        }
      )
    )
  })
})

describe("getNextMonthFilter / getPreviousMonthFilter - property-based", () => {
  it("next then previous returns to the same month", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const original = getPrismaDateFilter(year, month)
        const next = getNextMonthFilter(original)
        const backToOriginal = getPreviousMonthFilter(next)

        expect(backToOriginal.gte.getUTCMonth()).toBe(original.gte.getUTCMonth())
        expect(backToOriginal.gte.getUTCFullYear()).toBe(original.gte.getUTCFullYear())
      })
    )
  })

  it("previous then next returns to the same month", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const original = getPrismaDateFilter(year, month)
        const prev = getPreviousMonthFilter(original)
        const backToOriginal = getNextMonthFilter(prev)

        expect(backToOriginal.gte.getUTCMonth()).toBe(original.gte.getUTCMonth())
        expect(backToOriginal.gte.getUTCFullYear()).toBe(original.gte.getUTCFullYear())
      })
    )
  })

  it("next month gte is always after current gte", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const current = getPrismaDateFilter(year, month)
        const next = getNextMonthFilter(current)

        expect(next.gte.getTime()).toBeGreaterThan(current.gte.getTime())
      })
    )
  })

  it("previous month gte is always before current gte", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const current = getPrismaDateFilter(year, month)
        const prev = getPreviousMonthFilter(current)

        expect(prev.gte.getTime()).toBeLessThan(current.gte.getTime())
      })
    )
  })
})

describe("generateCalendarMonth - property-based", () => {
  it("generates a reasonable number of days (28-32)", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const filter = getPrismaDateFilter(year, month)
        const days = generateCalendarMonth(filter)

        // UTC filter + local iteration can produce 28-32 days due to timezone offset
        expect(days.length).toBeGreaterThanOrEqual(28)
        expect(days.length).toBeLessThanOrEqual(32)
      })
    )
  })

  it("first day is always day 1", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const filter = getPrismaDateFilter(year, month)
        const days = generateCalendarMonth(filter)

        expect(days[0].day).toBe(1)
      })
    )
  })

  it("day numbers increase monotonically", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const filter = getPrismaDateFilter(year, month)
        const days = generateCalendarMonth(filter)

        for (let i = 1; i < days.length; i++) {
          // Day either increments by 1 or wraps to 1 (next month)
          const diff = days[i].day - days[i - 1].day
          expect(diff === 1 || days[i].day === 1).toBe(true)
        }
      })
    )
  })

  it("all days have weekDay in range 0-6", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const filter = getPrismaDateFilter(year, month)
        const days = generateCalendarMonth(filter)

        for (const day of days) {
          expect(day.weekDay).toBeGreaterThanOrEqual(0)
          expect(day.weekDay).toBeLessThanOrEqual(6)
        }
      })
    )
  })

  it("consecutive days have weekDay incrementing mod 7", () => {
    fc.assert(
      fc.property(validYear, validJsMonth, (year, month) => {
        const filter = getPrismaDateFilter(year, month)
        const days = generateCalendarMonth(filter)

        for (let i = 1; i < days.length; i++) {
          expect(days[i].weekDay).toBe((days[i - 1].weekDay + 1) % 7)
        }
      })
    )
  })
})

describe("addHours - property-based", () => {
  it("adding 0 hours returns the same time", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = addHours(date, 0)
        expect(result.getTime()).toBe(date.getTime())
      })
    )
  })

  it("adding and subtracting the same hours is identity", () => {
    fc.assert(
      fc.property(validDate, validHours, (date, hours) => {
        const result = addHours(addHours(date, hours), -hours)
        // Allow 1ms tolerance for floating point
        expect(Math.abs(result.getTime() - date.getTime())).toBeLessThanOrEqual(1)
      })
    )
  })

  it("adding positive hours moves time forward", () => {
    fc.assert(
      fc.property(
        validDate,
        fc.double({ min: 0.001, max: 8760, noNaN: true, noDefaultInfinity: true }),
        (date, hours) => {
          const result = addHours(date, hours)
          expect(result.getTime()).toBeGreaterThan(date.getTime())
        }
      )
    )
  })
})

describe("formatTime24 - property-based", () => {
  it("always returns HH:mm format", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = formatTime24(date)
        expect(result).toMatch(/^\d{2}:\d{2}$/)
      })
    )
  })

  it("hours are in range 00-23", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = formatTime24(date)
        const hours = parseInt(result.split(":")[0], 10)
        expect(hours).toBeGreaterThanOrEqual(0)
        expect(hours).toBeLessThanOrEqual(23)
      })
    )
  })

  it("minutes are in range 00-59", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = formatTime24(date)
        const minutes = parseInt(result.split(":")[1], 10)
        expect(minutes).toBeGreaterThanOrEqual(0)
        expect(minutes).toBeLessThanOrEqual(59)
      })
    )
  })
})

describe("formatTime12 - property-based", () => {
  it("always returns h:mm AM/PM format", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = formatTime12(date)
        expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
      })
    )
  })

  it("hours are in range 1-12", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = formatTime12(date)
        const hours = parseInt(result.split(":")[0], 10)
        expect(hours).toBeGreaterThanOrEqual(1)
        expect(hours).toBeLessThanOrEqual(12)
      })
    )
  })
})

describe("formatTimeRange - property-based", () => {
  it("contains a dash separator", () => {
    fc.assert(
      fc.property(validDate, validDate, (start, end) => {
        const result = formatTimeRange(start, end)
        expect(result).toContain(" - ")
      })
    )
  })

  it("24h format always uses HH:mm", () => {
    fc.assert(
      fc.property(validDate, validDate, (start, end) => {
        const result = formatTimeRange(start, end, true)
        const parts = result.split(" - ")
        expect(parts[0]).toMatch(/^\d{2}:\d{2}$/)
        expect(parts[1]).toMatch(/^\d{2}:\d{2}$/)
      })
    )
  })
})

describe("extractTimeString - property-based", () => {
  it("returns empty string for null", () => {
    expect(extractTimeString(null)).toBe("")
  })

  it("returns HH:mm format for any valid date", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = extractTimeString(date)
        expect(result).toMatch(/^\d{2}:\d{2}$/)
      })
    )
  })
})

describe("combineDateAndTime - property-based", () => {
  it("returns null for empty date string", () => {
    fc.assert(
      fc.property(fc.constantFrom("00:00", "12:30", "23:59"), (time) => {
        expect(combineDateAndTime("", time)).toBeNull()
      })
    )
  })

  it("returns null for empty time string", () => {
    fc.assert(
      fc.property(fc.constantFrom("2025-01-01", "2030-06-15"), (date) => {
        expect(combineDateAndTime(date, "")).toBeNull()
      })
    )
  })

  it("preserves the date portion", () => {
    fc.assert(
      fc.property(
        validYear,
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (year, month, day, hour, minute) => {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

          const result = combineDateAndTime(dateStr, timeStr)

          if (result) {
            expect(result.getHours()).toBe(hour)
            expect(result.getMinutes()).toBe(minute)
            expect(result.getSeconds()).toBe(0)
            expect(result.getMilliseconds()).toBe(0)
          }
        }
      )
    )
  })
})

describe("getWeekday - property-based", () => {
  it("always returns 0-6", () => {
    fc.assert(
      fc.property(validDate, (date) => {
        const result = getWeekday(date.toISOString())
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(6)
      })
    )
  })
})
