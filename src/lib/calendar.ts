import { addHours as addHoursDateFns, format, parse, set } from "date-fns"

export type DateFilter = {
  gte: Date
  lt: Date
}

export type Day = {
  day: number
  weekDay: number
  month: number
  year: number
}

export function formatTime24(date: Date): string {
  return format(date, "HH:mm")
}

export function formatTime12(date: Date): string {
  return format(date, "h:mm a")
}

export function formatTimeRange(
  startTime: Date,
  endTime: Date,
  use24Hour = false,
): string {
  const timeFormat = use24Hour ? "HH:mm" : "h:mm a"
  return `${format(startTime, timeFormat)} - ${format(endTime, timeFormat)}`
}

export function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null

  try {
    const date = new Date(dateStr)
    const time = parse(timeStr, "HH:mm", new Date())

    return set(date, {
      hours: time.getHours(),
      minutes: time.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    })
  } catch {
    return null
  }
}

export function addHours(date: Date, hours: number): Date {
  return addHoursDateFns(date, hours)
}

export function extractTimeString(date: Date | null): string {
  if (!date) return ""
  return format(date, "HH:mm")
}

export function getPrismaDateFilter(
  year: number,
  jsMonth: number,
  offset = 0,
): DateFilter {
  if (offset % 2 !== 0) {
    throw new Error("Offset must be an even number")
  }
  const monthsEachWay = offset / 2
  const startDate = new Date(Date.UTC(year, jsMonth - monthsEachWay, 1))
  const endDate = new Date(Date.UTC(year, jsMonth + monthsEachWay + 1, 1))

  return {
    gte: startDate,
    lt: endDate,
  }
}

export function getNextMonthFilter(currentFilter: DateFilter) {
  const { year, month } = extractYearAndMonth(currentFilter.gte)
  if (month === 11) {
    return getPrismaDateFilter(year + 1, 0)
  }
  return getPrismaDateFilter(year, month + 1)
}

export function getPreviousMonthFilter(currentFilter: DateFilter) {
  const { year, month } = extractYearAndMonth(currentFilter.gte)
  if (month === 0) {
    return getPrismaDateFilter(year - 1, 11)
  }
  return getPrismaDateFilter(year, month - 1)
}

function extractYearAndMonth(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  }
}

export function generateCalendarMonth(dateFilter: DateFilter): Day[] {
  const allDays: Day[] = []
  const currentDate = new Date(dateFilter.gte)

  while (currentDate < dateFilter.lt) {
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    const currentDay = currentDate.getDate()
    const weekDay = currentDate.getDay()

    allDays.push({
      day: currentDay,
      weekDay,
      month: currentMonth,
      year: currentYear,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return allDays
}

export function getWeekday(dateString: string): number {
  const date = new Date(dateString)
  return date.getUTCDay()
}

export function getRepeatingDates(
  dateString: string,
  weekdays: number[],
  weeksToRepeat: number,
): Date[] {
  const date = new Date(dateString)
  const dayOfWeek = date.getDay()
  const dates: Date[] = []

  for (let week = 0; week <= weeksToRepeat; week++) {
    weekdays.forEach((weekday) => {
      const newDate = new Date(date)

      if (weekday === 0) {
        newDate.setDate(date.getDate() + weekday - dayOfWeek + (week + 1) * 7)
      } else {
        newDate.setDate(date.getDate() + weekday - dayOfWeek + week * 7)
      }

      dates.push(newDate)
    })
  }

  return dates
}
