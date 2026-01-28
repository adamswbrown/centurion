/**
 * Authentication Fixtures for E2E Tests
 *
 * Provides authenticated page contexts for testing.
 * Handles login flow and session persistence.
 */

import { test as base, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

interface AuthUser {
  email: string
  password: string
  role: "ADMIN" | "COACH" | "CLIENT"
}

// Test user credentials (these should match seed data or test users)
export const TEST_USERS = {
  admin: {
    email: "admin@test.com",
    password: "password123",
    role: "ADMIN" as const,
  },
  coach: {
    email: "coach@test.com",
    password: "password123",
    role: "COACH" as const,
  },
  client: {
    email: "client@test.com",
    password: "password123",
    role: "CLIENT" as const,
  },
}

/**
 * Login helper function
 */
async function login(page: Page, user: AuthUser): Promise<void> {
  await page.goto("/login")

  // Fill login form
  await page.fill("input[name='email']", user.email)
  await page.fill("input[name='password']", user.password)

  // Submit form
  await page.click("button[type='submit']")

  // Wait for redirect after successful login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 5000 })

  // Verify we're logged in by checking for user menu or dashboard
  await expect(
    page.locator("[data-testid='user-menu']").or(page.locator("text=Dashboard"))
  ).toBeVisible({ timeout: 5000 })
}

/**
 * Logout helper function
 */
async function logout(page: Page): Promise<void> {
  // Click user menu
  await page.click("[data-testid='user-menu']")

  // Click logout
  await page.click("button:has-text('Logout')")

  // Wait for redirect to login
  await page.waitForURL(/login/, { timeout: 5000 })
}

/**
 * Extended test with authenticated contexts
 */
type AuthFixtures = {
  adminPage: Page
  coachPage: Page
  clientPage: Page
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login as admin
    await login(page, TEST_USERS.admin)

    // Use the page
    await use(page)

    // Cleanup
    await context.close()
  },

  coachPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login as coach
    await login(page, TEST_USERS.coach)

    // Use the page
    await use(page)

    // Cleanup
    await context.close()
  },

  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login as client
    await login(page, TEST_USERS.client)

    // Use the page
    await use(page)

    // Cleanup
    await context.close()
  },
})

export { expect, login, logout }
