/**
 * Feature Flags E2E Tests
 *
 * Tests for feature flag management and navigation gating.
 * Covers admin settings, nav visibility, and flag persistence.
 */

import { test, expect } from "./fixtures/auth.fixture"

test.describe("Feature Flags - Admin Settings", () => {
  test("should display feature flag checkboxes in settings", async ({ adminPage }) => {
    await adminPage.goto("/admin/settings")

    // Click the Features tab
    await adminPage.click("button:has-text('Features')")

    // Should see the 3 navigation feature flags
    await expect(adminPage.locator("label:has-text('Enable Appointments')")).toBeVisible()
    await expect(adminPage.locator("label:has-text('Enable Sessions')")).toBeVisible()
    await expect(adminPage.locator("label:has-text('Enable Cohorts')")).toBeVisible()

    // Should also see existing feature flags
    await expect(adminPage.locator("label:has-text('Enable HealthKit Integration')")).toBeVisible()
  })

  test("should save feature flag changes", async ({ adminPage }) => {
    await adminPage.goto("/admin/settings")

    // Click the Features tab
    await adminPage.click("button:has-text('Features')")

    // Get current state of appointments checkbox
    const appointmentsCheckbox = adminPage.locator("#appointmentsEnabled")
    const wasChecked = await appointmentsCheckbox.isChecked()

    // Toggle it
    await appointmentsCheckbox.click()

    // Save
    await adminPage.click("button:has-text('Save Settings')")

    // Should see success message
    await expect(adminPage.locator("text=Settings saved successfully")).toBeVisible({ timeout: 5000 })

    // Toggle back to original state
    await appointmentsCheckbox.click()
    await adminPage.click("button:has-text('Save Settings')")
    await expect(adminPage.locator("text=Settings saved successfully")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Feature Flags - Navigation Gating", () => {
  test("should show sessions nav when sessionsEnabled is true", async ({ adminPage }) => {
    await adminPage.goto("/dashboard")

    // With default seed data (sessionsEnabled: true), Sessions should be in nav
    await expect(adminPage.locator("nav a:has-text('Sessions')").first()).toBeVisible()
  })

  test("should show cohorts nav when cohortsEnabled is true", async ({ adminPage }) => {
    await adminPage.goto("/dashboard")

    // With default seed data (cohortsEnabled: true), Cohorts should be in nav
    await expect(adminPage.locator("nav a:has-text('Cohorts')").first()).toBeVisible()
  })

  test("should show appointments nav when appointmentsEnabled is true", async ({ adminPage }) => {
    await adminPage.goto("/dashboard")

    // With seed data (appointmentsEnabled: true), Appointments should be in nav
    await expect(adminPage.locator("nav a:has-text('Appointments')").first()).toBeVisible()
  })

  test("should hide nav items when flags are disabled", async ({ adminPage }) => {
    // Disable sessions flag
    await adminPage.goto("/admin/settings")
    await adminPage.click("button:has-text('Features')")

    const sessionsCheckbox = adminPage.locator("#sessionsEnabled")
    if (await sessionsCheckbox.isChecked()) {
      await sessionsCheckbox.click()
    }
    await adminPage.click("button:has-text('Save Settings')")
    await expect(adminPage.locator("text=Settings saved successfully")).toBeVisible({ timeout: 5000 })

    // Navigate to dashboard to see updated nav
    await adminPage.goto("/dashboard")

    // Sessions nav item should be hidden
    await expect(adminPage.locator("nav a:has-text('Sessions')")).not.toBeVisible()

    // Re-enable sessions flag (cleanup)
    await adminPage.goto("/admin/settings")
    await adminPage.click("button:has-text('Features')")
    await adminPage.locator("#sessionsEnabled").click()
    await adminPage.click("button:has-text('Save Settings')")
    await expect(adminPage.locator("text=Settings saved successfully")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Feature Flags - Coach View", () => {
  test("should respect feature flags in coach navigation", async ({ coachPage }) => {
    await coachPage.goto("/dashboard")

    // With all flags enabled in seed data, coach should see Sessions and Cohorts
    await expect(coachPage.locator("nav a:has-text('Sessions')").first()).toBeVisible()
    await expect(coachPage.locator("nav a:has-text('Cohorts')").first()).toBeVisible()
  })
})

test.describe("Feature Flags - Client View", () => {
  test("should respect feature flags in client navigation", async ({ clientPage }) => {
    await clientPage.goto("/client/dashboard")

    // With sessionsEnabled: true, client should see Sessions link
    await expect(clientPage.locator("nav a:has-text('Sessions')").first()).toBeVisible()
  })
})
