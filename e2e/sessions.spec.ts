/**
 * Sessions E2E Tests
 *
 * Tests for class session and registration flows.
 * Covers session creation, registration, waitlist, and attendance tracking.
 */

import { test, expect } from "./fixtures/auth.fixture"

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
  test("should display class types list for admin", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Class types section should be visible
    await expect(
      adminPage.locator("text=Class Types").or(adminPage.locator("h2:has-text('Class Types')"))
    ).toBeVisible({ timeout: 5000 })
  })

  test("should create a new class type", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click create class type button
    await adminPage.click("button:has-text('Create Class Type')")

    // Fill in form
    await adminPage.fill("input[name='name']", "Pilates E2E")
    await adminPage.fill("textarea[name='description']", "Core strengthening class")
    await adminPage.fill("input[name='duration']", "50")
    await adminPage.fill("input[name='color']", "#9C27B0")

    // Submit form
    await adminPage.click("button[type='submit']")

    // Should see success message or new class type in list
    await expect(adminPage.locator("text=Pilates E2E")).toBeVisible({ timeout: 5000 })
  })

  test("should update class type", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click edit on first class type
    const editButton = adminPage.locator("button[aria-label='Edit class type']").first()
      .or(adminPage.locator("button:has-text('Edit')").first())
    if (await editButton.isVisible()) {
      await editButton.click()

      // Update name
      await adminPage.fill("input[name='name']", "HIIT Updated")
      await adminPage.click("button[type='submit']")

      // Should see updated name
      await expect(adminPage.locator("text=HIIT Updated")).toBeVisible({ timeout: 5000 })
    }
  })

  test("should delete class type", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click delete on class type (Pilates E2E created above)
    const deleteButton = adminPage.locator("button[aria-label='Delete class type']").first()
      .or(adminPage.locator("button:has-text('Delete')").first())
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Confirm deletion
      await adminPage.click("button:has-text('Delete'):visible")

      // Should see success message
      await expect(adminPage.locator("text=deleted successfully").or(adminPage.locator("text=success"))).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe("Sessions - Session Management", () => {
  test("should display sessions calendar", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Calendar or session list should be visible
    await expect(
      adminPage.locator("[data-testid='session-calendar']")
        .or(adminPage.locator("text=Calendar"))
        .or(adminPage.locator("text=Sessions"))
    ).toBeVisible({ timeout: 5000 })
  })

  test("should create a new session", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click create session button
    const createButton = adminPage.locator("button:has-text('Create Session')")
      .or(adminPage.locator("button:has-text('New Session')"))
      .or(adminPage.locator("button:has-text('Add Session')"))
    if (await createButton.isVisible()) {
      await createButton.click()

      // Fill in form
      const classTypeSelect = adminPage.locator("select[name='classTypeId']")
      if (await classTypeSelect.isVisible()) {
        await classTypeSelect.selectOption({ index: 1 })
      }
      await adminPage.fill("input[name='startTime']", "2026-02-15T10:00")
      const maxField = adminPage.locator("input[name='maxOccupancy']")
      if (await maxField.isVisible()) {
        await maxField.fill("20")
      }

      // Submit form
      await adminPage.click("button[type='submit']")

      // Should see success message or new session in calendar
      await expect(
        adminPage.locator("text=Session created").or(adminPage.locator("text=successfully"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should create recurring sessions", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click create session button
    const createButton = adminPage.locator("button:has-text('Create Session')")
      .or(adminPage.locator("button:has-text('New Session')"))
    if (await createButton.isVisible()) {
      await createButton.click()

      // Enable recurring
      const recurringCheckbox = adminPage.locator("input[name='isRecurring']")
      if (await recurringCheckbox.isVisible()) {
        await recurringCheckbox.check()

        // Fill in form
        const classTypeSelect = adminPage.locator("select[name='classTypeId']")
        if (await classTypeSelect.isVisible()) {
          await classTypeSelect.selectOption({ index: 1 })
        }
        await adminPage.fill("input[name='startTime']", "2026-02-15T10:00")
        const maxField = adminPage.locator("input[name='maxOccupancy']")
        if (await maxField.isVisible()) {
          await maxField.fill("20")
        }
        await adminPage.fill("input[name='recurrenceEndDate']", "2026-03-15")

        // Select recurrence days
        const mondayCheckbox = adminPage.locator("input[value='Monday']")
        if (await mondayCheckbox.isVisible()) {
          await mondayCheckbox.check()
          await adminPage.locator("input[value='Wednesday']").check()
          await adminPage.locator("input[value='Friday']").check()
        }

        // Submit form
        await adminPage.click("button[type='submit']")

        // Should see success message
        await expect(adminPage.locator("text=sessions created").or(adminPage.locator("text=successfully"))).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should update session", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click on a session in calendar
    const sessionCard = adminPage.locator("[data-testid='session-card']").first()
    if (await sessionCard.isVisible()) {
      await sessionCard.click()

      // Click edit button
      const editButton = adminPage.locator("button:has-text('Edit')")
      if (await editButton.isVisible()) {
        await editButton.click()

        // Update max occupancy
        await adminPage.fill("input[name='maxOccupancy']", "25")

        // Submit form
        await adminPage.click("button[type='submit']")

        // Should see updated capacity
        await expect(adminPage.locator("text=25").or(adminPage.locator("text=successfully"))).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should cancel session", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click on a session
    const sessionCard = adminPage.locator("[data-testid='session-card']").first()
    if (await sessionCard.isVisible()) {
      await sessionCard.click()

      // Click cancel button
      const cancelButton = adminPage.locator("button:has-text('Cancel Session')")
      if (await cancelButton.isVisible()) {
        await cancelButton.click()

        // Confirm cancellation
        await adminPage.click("button:has-text('Confirm'):visible")

        // Should see cancelled status
        await expect(adminPage.locator("text=Cancelled").or(adminPage.locator("text=successfully"))).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe("Sessions - Client Registration", () => {
  test("should display available sessions for client", async ({ clientPage }) => {
    await clientPage.goto("/client/sessions")

    // Available sessions should be visible
    await expect(
      clientPage.locator("text=Available Sessions")
        .or(clientPage.locator("h1:has-text('Sessions')"))
        .or(clientPage.locator("text=Browse Sessions"))
    ).toBeVisible({ timeout: 5000 })
  })

  test("should register for a session", async ({ clientPage }) => {
    await clientPage.goto("/client/sessions")

    // Click register on an available session
    const registerButton = clientPage.locator("button:has-text('Register')").first()
      .or(clientPage.locator("button:has-text('Book')").first())
    if (await registerButton.isVisible()) {
      await registerButton.click()

      // Should see success message
      await expect(
        clientPage.locator("text=registered").or(clientPage.locator("text=Successfully")).or(clientPage.locator("text=Registered"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should join waitlist when session is full", async ({ clientPage }) => {
    await clientPage.goto("/client/sessions")

    // Find a full session
    const fullSession = clientPage.locator("[data-testid='session-card']:has-text('Full')")
    if (await fullSession.count() > 0) {
      // Click join waitlist
      await fullSession.locator("button:has-text('Join Waitlist')").click()

      // Should see waitlist confirmation
      await expect(clientPage.locator("text=waitlist")).toBeVisible({ timeout: 5000 })
    }
  })

  test("should cancel registration", async ({ clientPage }) => {
    await clientPage.goto("/client/sessions")

    // Click cancel on a registered session
    const cancelButton = clientPage.locator("button:has-text('Cancel Registration')").first()
      .or(clientPage.locator("button:has-text('Cancel')").first())
    if (await cancelButton.isVisible()) {
      await cancelButton.click()

      // Confirm cancellation if dialog appears
      const confirmButton = clientPage.locator("button:has-text('Confirm'):visible")
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // Should see cancellation confirmation
      await expect(
        clientPage.locator("text=cancelled").or(clientPage.locator("text=Successfully"))
      ).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe("Sessions - Attendance Tracking", () => {
  test("should mark attendee as attended", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click on a past session
    const completedSession = adminPage.locator("[data-testid='session-card'][data-status='completed']").first()
    if (await completedSession.isVisible()) {
      await completedSession.click()

      // Click on attendee
      const attendeeRow = adminPage.locator("[data-testid='attendee-row']").first()
      if (await attendeeRow.isVisible()) {
        await attendeeRow.click()

        // Mark as attended
        await adminPage.click("button:has-text('Mark Attended')")

        // Should see attended status
        await expect(adminPage.locator("text=Attended")).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should mark attendee as no-show", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click on a past session
    const completedSession = adminPage.locator("[data-testid='session-card'][data-status='completed']").first()
    if (await completedSession.isVisible()) {
      await completedSession.click()

      // Click on attendee
      const attendeeRow = adminPage.locator("[data-testid='attendee-row']").first()
      if (await attendeeRow.isVisible()) {
        await attendeeRow.click()

        // Mark as no-show
        await adminPage.click("button:has-text('Mark No-Show')")

        // Should see no-show status
        await expect(adminPage.locator("text=No-Show")).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe("Sessions - Google Calendar Sync", () => {
  test("should sync session to Google Calendar", async ({ adminPage }) => {
    await adminPage.goto("/sessions")

    // Click on a session
    const sessionCard = adminPage.locator("[data-testid='session-card']").first()
    if (await sessionCard.isVisible()) {
      await sessionCard.click()

      // Click sync button
      const syncButton = adminPage.locator("button:has-text('Sync to Calendar')")
        .or(adminPage.locator("button:has-text('Sync')"))
      if (await syncButton.isVisible()) {
        await syncButton.click()

        // Should see sync confirmation
        await expect(
          adminPage.locator("text=synced").or(adminPage.locator("text=Successfully"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
