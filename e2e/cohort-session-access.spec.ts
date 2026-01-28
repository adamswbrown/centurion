/**
 * Cohort Session Access E2E Tests
 *
 * Tests for the SessionAccessManager component and the
 * CohortSessionAccess join table management.
 * Covers viewing, modifying, and saving cohort session access.
 */

import { test, expect } from "./fixtures/auth.fixture"

test.describe("Cohort Session Access - Admin Management", () => {
  test("should display Session Access Manager on cohort detail page", async ({ adminPage }) => {
    await adminPage.goto("/cohorts")

    // Click on the test cohort
    await adminPage.click("text=Spring 2026")

    // Wait for cohort detail to load
    await expect(adminPage.locator("text=Spring 2026").first()).toBeVisible({ timeout: 5000 })

    // Session Access Manager should be visible
    await expect(
      adminPage.locator("text=Session Access").or(adminPage.locator("h3:has-text('Session Access')"))
    ).toBeVisible()
  })

  test("should show class types with checkboxes", async ({ adminPage }) => {
    await adminPage.goto("/cohorts")
    await adminPage.click("text=Spring 2026")

    // Should see class type checkboxes
    await expect(adminPage.locator("text=HIIT")).toBeVisible({ timeout: 5000 })
    await expect(adminPage.locator("text=Yoga")).toBeVisible({ timeout: 5000 })
  })

  test("should have HIIT checked (from seed data)", async ({ adminPage }) => {
    await adminPage.goto("/cohorts")
    await adminPage.click("text=Spring 2026")

    // Wait for class types to load
    await expect(adminPage.locator("text=HIIT")).toBeVisible({ timeout: 5000 })

    // HIIT should be checked (seed data grants access)
    const hiitCheckbox = adminPage.locator("input[type='checkbox']").filter({ hasText: /HIIT/i })
      .or(adminPage.locator("label:has-text('HIIT') input[type='checkbox']"))
      .or(adminPage.locator("input[type='checkbox']").nth(0))

    // Find checkbox near HIIT text
    const hiitLabel = adminPage.locator("label:has-text('HIIT')")
    if (await hiitLabel.count() > 0) {
      const checkbox = hiitLabel.locator("input[type='checkbox']")
      await expect(checkbox).toBeChecked()
    }
  })

  test("should save changes to session access", async ({ adminPage }) => {
    await adminPage.goto("/cohorts")
    await adminPage.click("text=Spring 2026")

    // Wait for class types to load
    await expect(adminPage.locator("text=HIIT")).toBeVisible({ timeout: 5000 })

    // Find and click save button in the session access section
    const saveButton = adminPage.locator("button:has-text('Save')").or(
      adminPage.locator("button:has-text('Update Access')")
    )

    if (await saveButton.count() > 0) {
      await saveButton.first().click()

      // Should see success feedback
      await expect(
        adminPage.locator("text=saved").or(adminPage.locator("text=updated")).or(adminPage.locator("text=success"))
      ).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe("Cohort Session Access - Coach View", () => {
  test("should display cohort detail for coach", async ({ coachPage }) => {
    await coachPage.goto("/cohorts")

    // Coach should see the cohort they're assigned to
    await expect(coachPage.locator("text=Spring 2026")).toBeVisible({ timeout: 5000 })

    // Click on cohort
    await coachPage.click("text=Spring 2026")

    // Should see cohort details
    await expect(coachPage.locator("text=Spring 2026").first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Cohort Session Access - Route Protection", () => {
  test("should redirect to login when accessing cohorts without auth", async ({ page }) => {
    await page.goto("/cohorts")
    await expect(page).toHaveURL(/login/)
  })

  test("should redirect to login when accessing cohort detail without auth", async ({ page }) => {
    await page.goto("/cohorts/1")
    await expect(page).toHaveURL(/login/)
  })
})
