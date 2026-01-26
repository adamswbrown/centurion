/**
 * Mock Index
 *
 * Central export for all test mocks.
 * Import this file in your test setup to enable all mocks.
 */

// Re-export all mocks
export * from "./prisma"
export * from "./auth"
export * from "./google-calendar"
export * from "./email"
export * from "./stripe"

// Import all mocks to trigger vi.mock calls
import "./prisma"
import "./auth"
import "./google-calendar"
import "./email"
import "./stripe"
