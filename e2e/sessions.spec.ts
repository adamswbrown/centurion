/**
 * Sessions E2E Tests
 *
 * Tests for class session and registration flows.
 * Covers session creation, registration, waitlist, and attendance tracking.
 */

import { test, expect, Page } from "@playwright/test"

// Helper to check if we're on an authenticated page
async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes("/login")
}

test.describe("Sessions - Public Access", () => {
  test("should redirect to login when accessing sessions management without auth", async ({
    page,
  }) => {
    await page.goto("/sessions")
    await expect(page).toHaveURL(/login/)
  })

  test("should redirect to login when accessing client sessions without auth", async ({
    page,
  }) => {
    await page.goto("/client/sessions")
    await expect(page).toHaveURL(/login/)
  })
})

test.describe("Sessions - Class Type Management", () => {
  test.skip("should display class types list for coach", async ({ page }) => {
    // This test requires authentication as COACH or ADMIN
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Class types section should be visible
    await expect(
      page.locator("text=Class Types").or(page.locator("h2:has-text('Class Types')"))
    ).toBeVisible()
  })

  test.skip("should create a new class type", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click create class type button
    await page.click("button:has-text('Create Class Type')")

    // Fill in form
    await page.fill("input[name='name']", "HIIT")
    await page.fill("textarea[name='description']", "High-intensity interval training")
    await page.fill("input[name='duration']", "45")
    await page.fill("input[name='color']", "#FF5733")

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message or new class type in list
    await expect(page.locator("text=HIIT")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should update class type", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click edit on first class type
    await page.click("button[aria-label='Edit class type']:first")

    // Update name
    await page.fill("input[name='name']", "HIIT Updated")
    await page.click("button[type='submit']")

    // Should see updated name
    await expect(page.locator("text=HIIT Updated")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should delete class type", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click delete on first class type
    await page.click("button[aria-label='Delete class type']:first")

    // Confirm deletion
    await page.click("button:has-text('Delete'):visible")

    // Should see success message
    await expect(page.locator("text=deleted successfully")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Sessions - Session Management", () => {
  test.skip("should display sessions calendar", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Calendar should be visible
    await expect(
      page.locator("[data-testid='session-calendar']").or(page.locator("text=Calendar"))
    ).toBeVisible()
  })

  test.skip("should create a new session", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click create session button
    await page.click("button:has-text('Create Session')")

    // Fill in form
    await page.selectOption("select[name='classTypeId']", { index: 1 })
    await page.fill("input[name='startTime']", "2026-02-15T10:00")
    await page.fill("input[name='maxOccupancy']", "20")

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message or new session in calendar
    await expect(
      page.locator("text=Session created").or(page.locator("text=successfully"))
    ).toBeVisible({ timeout: 5000 })
  })

  test.skip("should create recurring sessions", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click create session button
    await page.click("button:has-text('Create Session')")

    // Enable recurring
    await page.check("input[name='isRecurring']")

    // Fill in form
    await page.selectOption("select[name='classTypeId']", { index: 1 })
    await page.fill("input[name='startTime']", "2026-02-15T10:00")
    await page.fill("input[name='maxOccupancy']", "20")
    await page.fill("input[name='recurrenceEndDate']", "2026-03-15")

    // Select recurrence days
    await page.check("input[value='Monday']")
    await page.check("input[value='Wednesday']")
    await page.check("input[value='Friday']")

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message
    await expect(page.locator("text=sessions created")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should update session", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a session in calendar
    await page.click("[data-testid='session-card']:first")

    // Click edit button
    await page.click("button:has-text('Edit')")

    // Update max occupancy
    await page.fill("input[name='maxOccupancy']", "25")

    // Submit form
    await page.click("button[type='submit']")

    // Should see updated capacity
    await expect(page.locator("text=25 spots")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should cancel session", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a session
    await page.click("[data-testid='session-card']:first")

    // Click cancel button
    await page.click("button:has-text('Cancel Session')")

    // Confirm cancellation
    await page.click("button:has-text('Confirm'):visible")

    // Should see cancelled status
    await expect(page.locator("text=Cancelled")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Sessions - Client Registration", () => {
  test.skip("should display available sessions for client", async ({ page }) => {
    await page.goto("/client/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Available sessions should be visible
    await expect(
      page.locator("text=Available Sessions").or(page.locator("h1:has-text('Sessions')"))
    ).toBeVisible()
  })

  test.skip("should register for a session", async ({ page }) => {
    await page.goto("/client/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click register on an available session
    await page.click("button:has-text('Register'):first")

    // Should see success message
    await expect(
      page.locator("text=registered").or(page.locator("text=Successfully"))
    ).toBeVisible({ timeout: 5000 })

    // Session should now show as registered
    await expect(page.locator("text=Registered")).toBeVisible()
  })

  test.skip("should join waitlist when session is full", async ({ page }) => {
    await page.goto("/client/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Find a full session
    const fullSession = page.locator("[data-testid='session-card']:has-text('Full')")
    if (await fullSession.count() > 0) {
      // Click join waitlist
      await fullSession.locator("button:has-text('Join Waitlist')").click()

      // Should see waitlist confirmation
      await expect(page.locator("text=waitlist")).toBeVisible({ timeout: 5000 })
    }
  })

  test.skip("should cancel registration", async ({ page }) => {
    await page.goto("/client/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click cancel on a registered session
    await page.click("button:has-text('Cancel Registration'):first")

    // Confirm cancellation
    await page.click("button:has-text('Confirm'):visible")

    // Should see cancellation confirmation
    await expect(
      page.locator("text=cancelled").or(page.locator("text=Successfully"))
    ).toBeVisible({ timeout: 5000 })

    // Should see register button again
    await expect(page.locator("button:has-text('Register')")).toBeVisible()
  })
})

test.describe("Sessions - Attendance Tracking", () => {
  test.skip("should mark attendee as attended", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a past session
    await page.click("[data-testid='session-card'][data-status='completed']:first")

    // Click on attendee
    await page.click("[data-testid='attendee-row']:first")

    // Mark as attended
    await page.click("button:has-text('Mark Attended')")

    // Should see attended status
    await expect(page.locator("text=Attended")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should mark attendee as no-show", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a past session
    await page.click("[data-testid='session-card'][data-status='completed']:first")

    // Click on attendee
    await page.click("[data-testid='attendee-row']:first")

    // Mark as no-show
    await page.click("button:has-text('Mark No-Show')")

    // Should see no-show status
    await expect(page.locator("text=No-Show")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Sessions - Google Calendar Sync", () => {
  test.skip("should sync session to Google Calendar", async ({ page }) => {
    await page.goto("/sessions")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a session
    await page.click("[data-testid='session-card']:first")

    // Click sync button
    await page.click("button:has-text('Sync to Calendar')")

    // Should see sync confirmation
    await expect(
      page.locator("text=synced").or(page.locator("text=Successfully"))
    ).toBeVisible({ timeout: 5000 })

    // Should see calendar icon or indicator
    await expect(page.locator("[data-testid='calendar-synced-icon']")).toBeVisible()
  })
})
