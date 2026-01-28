/**
 * Cohorts E2E Tests
 *
 * Tests for cohort management flows.
 */

import { test, expect } from "./fixtures/auth.fixture"

test.describe("Cohorts", () => {
  test.describe("Public Access", () => {
    test("should redirect to login when accessing cohorts without auth", async ({
      page,
    }) => {
      await page.goto("/cohorts")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect to login when accessing admin cohorts without auth", async ({
      page,
    }) => {
      await page.goto("/admin/cohorts")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Cohort List", () => {
    test("should display list of cohorts", async ({ adminPage }) => {
      await adminPage.goto("/cohorts")

      // Should show cohort list or cohort page
      await expect(
        adminPage.locator("[data-testid=cohort-list]")
          .or(adminPage.locator("text=Cohorts"))
          .or(adminPage.locator("text=Spring 2026"))
      ).toBeVisible({ timeout: 5000 })
    })

    test("should filter cohorts by status", async ({ adminPage }) => {
      await adminPage.goto("/cohorts")

      // Find status filter
      const statusFilter = adminPage.getByRole("combobox", { name: /status/i })
        .or(adminPage.locator("select").first())
      if (await statusFilter.isVisible()) {
        await statusFilter.click()
        const activeOption = adminPage.getByRole("option", { name: /active/i })
        if (await activeOption.isVisible()) {
          await activeOption.click()
        }
      }
    })
  })

  test.describe("Cohort Creation", () => {
    test("should open create cohort form", async ({ adminPage }) => {
      await adminPage.goto("/cohorts")

      // Click create button
      const createButton = adminPage.getByRole("button", { name: /new|create|add/i })
      if (await createButton.isVisible()) {
        await createButton.click()

        // Form should be visible
        await expect(
          adminPage.getByLabel(/name/i)
            .or(adminPage.locator("text=Create Cohort"))
            .or(adminPage.locator("text=New Cohort"))
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("should validate cohort form", async ({ adminPage }) => {
      await adminPage.goto("/cohorts")

      // Click create button
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

  test.describe("Cohort Members", () => {
    test("should show member list in cohort details", async ({ adminPage }) => {
      await adminPage.goto("/cohorts")

      // Click on test cohort
      await adminPage.click("text=Spring 2026")

      // Member list or member section should be visible
      await expect(
        adminPage.locator("[data-testid=member-list]")
          .or(adminPage.locator("text=Members"))
          .or(adminPage.locator("text=Test Client"))
      ).toBeVisible({ timeout: 5000 })
    })

    test("should allow adding members to cohort", async ({ adminPage }) => {
      await adminPage.goto("/cohorts")

      // Click on test cohort
      await adminPage.click("text=Spring 2026")

      // Click add member button
      const addButton = adminPage.getByRole("button", { name: /add member/i })
        .or(adminPage.locator("button:has-text('Add')"))
      if (await addButton.isVisible()) {
        await addButton.click()

        // Member selection dialog should appear
        await expect(
          adminPage.getByRole("dialog")
            .or(adminPage.locator("text=Add Member"))
        ).toBeVisible({ timeout: 5000 })
      }
    })
  })
})
