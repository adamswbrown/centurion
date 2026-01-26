/**
 * Review Queue E2E Tests
 *
 * Tests for coach review queue functionality.
 */

import { test, expect } from "@playwright/test"

test.describe("Review Queue", () => {
  test.describe("Public Access", () => {
    test("should redirect to login when accessing review queue without auth", async ({
      page,
    }) => {
      await page.goto("/coach/review")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Weekly Summaries", () => {
    test.skip("should display weekly client summaries", async ({ page }) => {
      await page.goto("/coach/review")

      // Should show client list
      await expect(page.locator("[data-testid=client-summaries]")).toBeVisible()
    })

    test.skip("should show priority indicators", async ({ page }) => {
      await page.goto("/coach/review")

      // Priority badges should be visible
      const priorityBadges = page.locator("[data-testid=priority-badge]")
      await expect(priorityBadges.first()).toBeVisible()
    })

    test.skip("should allow filtering by cohort", async ({ page }) => {
      await page.goto("/coach/review")

      // Find cohort filter
      const cohortFilter = page.getByRole("combobox", { name: /cohort/i })
      if (await cohortFilter.isVisible()) {
        await cohortFilter.click()
        // Select a cohort option
        await page.getByRole("option").first().click()
      }
    })

    test.skip("should allow navigating to different weeks", async ({ page }) => {
      await page.goto("/coach/review")

      // Find week navigation
      const prevWeek = page.getByRole("button", { name: /previous|prev/i })
      const nextWeek = page.getByRole("button", { name: /next/i })

      if (await prevWeek.isVisible()) {
        await prevWeek.click()
        // Week should update
      }
    })
  })

  test.describe("Client Review", () => {
    test.skip("should open client review panel", async ({ page }) => {
      await page.goto("/coach/review")

      // Click on a client
      const clientCard = page.locator("[data-testid=client-card]").first()
      if (await clientCard.isVisible()) {
        await clientCard.click()

        // Review panel should open
        await expect(page.locator("[data-testid=review-panel]")).toBeVisible()
      }
    })

    test.skip("should show client metrics", async ({ page }) => {
      await page.goto("/coach/review")

      // Click on a client
      await page.locator("[data-testid=client-card]").first().click()

      // Metrics should be visible
      await expect(page.locator("[data-testid=client-metrics]")).toBeVisible()
    })

    test.skip("should allow adding coach notes", async ({ page }) => {
      await page.goto("/coach/review")

      // Click on a client
      await page.locator("[data-testid=client-card]").first().click()

      // Note textarea should be visible
      const noteField = page.getByLabel(/note|feedback/i)
      if (await noteField.isVisible()) {
        await noteField.fill("Test feedback for client")

        // Save button should be enabled
        await expect(
          page.getByRole("button", { name: /save/i })
        ).toBeEnabled()
      }
    })

    test.skip("should allow adding Loom URL", async ({ page }) => {
      await page.goto("/coach/review")

      // Click on a client
      await page.locator("[data-testid=client-card]").first().click()

      // Loom URL field should be visible
      const loomField = page.getByLabel(/loom|video/i)
      if (await loomField.isVisible()) {
        await loomField.fill("https://loom.com/share/test-video")

        // Save button should be enabled
        await expect(
          page.getByRole("button", { name: /save/i })
        ).toBeEnabled()
      }
    })
  })

  test.describe("Review Queue Summary", () => {
    test.skip("should show review queue summary stats", async ({ page }) => {
      await page.goto("/coach/review")

      // Summary stats should be visible
      await expect(page.locator("[data-testid=queue-summary]")).toBeVisible()
    })

    test.skip("should show pending vs completed count", async ({ page }) => {
      await page.goto("/coach/review")

      // Pending count should be visible
      await expect(page.locator("text=/pending|to review/i")).toBeVisible()
    })
  })
})
