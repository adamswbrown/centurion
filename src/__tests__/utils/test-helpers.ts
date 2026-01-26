/**
 * Test Helpers
 *
 * Utility functions for testing.
 */

import { vi } from "vitest"

/**
 * Wait for all pending promises to resolve
 */
export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Create a mock date for consistent date-based testing
 */
export function mockDate(date: Date | string) {
  const mockDate = new Date(date)
  vi.useFakeTimers()
  vi.setSystemTime(mockDate)
  return () => vi.useRealTimers()
}

/**
 * Assert that an async function throws
 */
export async function expectAsyncError(
  fn: () => Promise<unknown>,
  messageMatch?: string | RegExp
): Promise<Error> {
  let error: Error | null = null

  try {
    await fn()
  } catch (e) {
    error = e as Error
  }

  if (!error) {
    throw new Error("Expected function to throw, but it did not")
  }

  if (messageMatch) {
    if (typeof messageMatch === "string") {
      expect(error.message).toContain(messageMatch)
    } else {
      expect(error.message).toMatch(messageMatch)
    }
  }

  return error
}

/**
 * Create a mock fetch response
 */
export function mockFetchResponse(data: unknown, options: { status?: number; ok?: boolean } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }
}

/**
 * Wait for a specific condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  { timeout = 5000, interval = 50 } = {}
): Promise<void> {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`waitFor condition not met within ${timeout}ms`)
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Create a date at a specific time
 */
export function createDateTime(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const date = new Date(dateStr)
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Generate a range of dates
 */
export function generateDateRange(startDate: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    return date
  })
}

/**
 * Clean up after tests
 */
export function cleanupTest() {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
}
