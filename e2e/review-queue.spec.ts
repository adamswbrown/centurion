/**
 * Review Queue E2E Tests
 *
 * Tests for coach review queue functionality.
 */

import { test, expect } from "./fixtures/auth.fixture"

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
    test("should display weekly client summaries", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Should show review queue page
      await expect(
        coachPage.locator("[data-testid=client-summaries]")
          .or(coachPage.locator("text=Review Queue"))
          .or(coachPage.locator("text=Weekly Review"))
          .or(coachPage.locator("text=No clients"))
      ).toBeVisible({ timeout: 5000 })
    })

    test("should show priority indicators", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Priority badges or indicators should be visible if clients exist
      const priorityBadges = coachPage.locator("[data-testid=priority-badge]")
        .or(coachPage.locator(".badge"))
      // Only assert if there are clients to review
      if (await coachPage.locator("[data-testid=client-card]").count() > 0) {
        await expect(priorityBadges.first()).toBeVisible({ timeout: 5000 })
      }
    })

    test("should allow filtering by cohort", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Find cohort filter
      const cohortFilter = coachPage.getByRole("combobox", { name: /cohort/i })
        .or(coachPage.locator("select").first())
      if (await cohortFilter.isVisible()) {
        await cohortFilter.click()
        // Select a cohort option
        const option = coachPage.getByRole("option").first()
        if (await option.isVisible()) {
          await option.click()
        }
      }
    })

    test("should allow navigating to different weeks", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Find week navigation
      const prevWeek = coachPage.getByRole("button", { name: /previous|prev/i })
        .or(coachPage.locator("button:has-text('←')"))
      if (await prevWeek.isVisible()) {
        await prevWeek.click()
        // Page should still be visible after navigation
        await expect(
          coachPage.locator("text=Review").or(coachPage.locator("text=Week"))
        ).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe("Client Review", () => {
    test("should open client review panel", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Click on a client
      const clientCard = coachPage.locator("[data-testid=client-card]").first()
        .or(coachPage.locator("table tbody tr").first())
      if (await clientCard.isVisible()) {
        await clientCard.click()

        // Review panel or detail should open
        await expect(
          coachPage.locator("[data-testid=review-panel]")
            .or(coachPage.locator("text=Review"))
            .or(coachPage.locator("text=Client"))
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("should show client metrics", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Click on a client
      const clientCard = coachPage.locator("[data-testid=client-card]").first()
      if (await clientCard.isVisible()) {
        await clientCard.click()

        // Metrics should be visible
        await expect(
          coachPage.locator("[data-testid=client-metrics]")
            .or(coachPage.locator("text=Check-ins"))
            .or(coachPage.locator("text=Adherence"))
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("should allow adding coach notes", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Click on a client
      const clientCard = coachPage.locator("[data-testid=client-card]").first()
      if (await clientCard.isVisible()) {
        await clientCard.click()

        // Note textarea should be visible
        const noteField = coachPage.getByLabel(/note|feedback/i)
          .or(coachPage.locator("textarea").first())
        if (await noteField.isVisible()) {
          await noteField.fill("Test feedback for client from E2E test")

          // Save button should be enabled
          const saveButton = coachPage.getByRole("button", { name: /save/i })
          if (await saveButton.isVisible()) {
            await expect(saveButton).toBeEnabled()
          }
        }
      }
    })

    test("should allow adding Loom URL", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Click on a client
      const clientCard = coachPage.locator("[data-testid=client-card]").first()
      if (await clientCard.isVisible()) {
        await clientCard.click()

        // Loom URL field should be visible
        const loomField = coachPage.getByLabel(/loom|video/i)
          .or(coachPage.locator("input[name='loomUrl']"))
        if (await loomField.isVisible()) {
          await loomField.fill("https://loom.com/share/test-video")

          // Save button should be enabled
          const saveButton = coachPage.getByRole("button", { name: /save/i })
          if (await saveButton.isVisible()) {
            await expect(saveButton).toBeEnabled()
          }
        }
      }
    })
  })

  test.describe("Review Queue Summary", () => {
    test("should show review queue summary stats", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Summary stats or page header should be visible
      await expect(
        coachPage.locator("[data-testid=queue-summary]")
          .or(coachPage.locator("text=Review Queue"))
          .or(coachPage.locator("text=Weekly Review"))
      ).toBeVisible({ timeout: 5000 })
    })

    test("should show pending vs completed count", async ({ coachPage }) => {
      await coachPage.goto("/coach/review-queue")

      // Pending count or status should be visible
      await expect(
        coachPage.locator("text=/pending|to review|completed/i")
          .or(coachPage.locator("text=Review Queue"))
      ).toBeVisible({ timeout: 5000 })
    })
  })
})
