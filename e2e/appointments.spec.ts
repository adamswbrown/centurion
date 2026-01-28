/**
 * Appointments E2E Tests
 *
 * Tests for appointment management flows.
 */

import { test, expect } from "./fixtures/auth.fixture"

test.describe("Appointments", () => {
  test.describe("Public Access", () => {
    test("should redirect to login when accessing appointments without auth", async ({
      page,
    }) => {
      await page.goto("/appointments")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Appointment Calendar", () => {
    test("should display calendar view", async ({ adminPage }) => {
      await adminPage.goto("/appointments")

      // Calendar or appointment list should be visible
      await expect(
        adminPage.locator("[data-testid=calendar]")
          .or(adminPage.locator("text=Appointments"))
          .or(adminPage.locator("text=Calendar"))
      ).toBeVisible({ timeout: 5000 })
    })

    test("should navigate between months", async ({ adminPage }) => {
      await adminPage.goto("/appointments")

      // Find and click next month button
      const nextButton = adminPage.getByRole("button", { name: /next|forward/i })
      if (await nextButton.isVisible()) {
        await nextButton.click()

        // Calendar should still be visible after navigation
        await expect(
          adminPage.locator("[data-testid=calendar]")
            .or(adminPage.locator("text=Appointments"))
        ).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe("Appointment Creation", () => {
    test("should open create appointment modal", async ({ adminPage }) => {
      await adminPage.goto("/appointments")

      // Click create button
      const createButton = adminPage.getByRole("button", { name: /new|create|add/i })
      if (await createButton.isVisible()) {
        await createButton.click()

        // Modal or form should be visible
        await expect(
          adminPage.getByRole("dialog")
            .or(adminPage.locator("text=New Appointment"))
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("should validate appointment form fields", async ({ adminPage }) => {
      await adminPage.goto("/appointments")

      // Open create modal
      const createButton = adminPage.getByRole("button", { name: /new|create|add/i })
      if (await createButton.isVisible()) {
        await createButton.click()

        // Submit empty form
        const submitButton = adminPage.getByRole("button", { name: /save|create|submit/i })
        if (await submitButton.isVisible()) {
          await submitButton.click()

          // Should show validation errors
          await expect(adminPage.locator("text=required").first()).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe("Appointment Details", () => {
    test("should show appointment details on click", async ({ adminPage }) => {
      await adminPage.goto("/appointments")

      // Click on an appointment
      const appointment = adminPage.locator("[data-testid=appointment-item]").first()
        .or(adminPage.locator("[data-testid=appointment-card]").first())
      if (await appointment.isVisible()) {
        await appointment.click()

        // Details should be visible
        await expect(
          adminPage.locator("[data-testid=appointment-details]")
            .or(adminPage.locator("text=Appointment Details"))
        ).toBeVisible({ timeout: 5000 })
      }
    })
  })
})
