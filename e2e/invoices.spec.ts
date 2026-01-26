/**
 * Invoices E2E Tests
 *
 * Tests for invoice management flows.
 */

import { test, expect } from "@playwright/test"

test.describe("Invoices", () => {
  test.describe("Public Access", () => {
    test("should redirect to login when accessing invoices without auth", async ({
      page,
    }) => {
      await page.goto("/invoices")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect to login when accessing admin invoices without auth", async ({
      page,
    }) => {
      await page.goto("/admin/invoices")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Invoice List", () => {
    test.skip("should display invoice list", async ({ page }) => {
      await page.goto("/admin/invoices")

      // Should show invoice table
      await expect(page.locator("table")).toBeVisible()
    })

    test.skip("should filter by payment status", async ({ page }) => {
      await page.goto("/admin/invoices")

      // Find and click status filter
      const statusFilter = page.getByRole("combobox", { name: /status/i })
      if (await statusFilter.isVisible()) {
        await statusFilter.click()
        await page.getByRole("option", { name: /unpaid/i }).click()

        // List should update
        await expect(page.locator("tbody tr")).toHaveCount(expect.any(Number))
      }
    })

    test.skip("should filter by year", async ({ page }) => {
      await page.goto("/admin/invoices")

      // Find and use year filter
      const yearFilter = page.getByRole("combobox", { name: /year/i })
      if (await yearFilter.isVisible()) {
        await yearFilter.click()
        await page.getByRole("option", { name: /2024/i }).click()
      }
    })
  })

  test.describe("Invoice Generation", () => {
    test.skip("should open invoice generation modal", async ({ page }) => {
      await page.goto("/admin/invoices")

      // Click generate button
      const generateButton = page.getByRole("button", { name: /generate|create/i })
      await generateButton.click()

      // Modal should be visible
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test.skip("should require member selection for invoice generation", async ({
      page,
    }) => {
      await page.goto("/admin/invoices")

      // Open generate modal
      await page.getByRole("button", { name: /generate|create/i }).click()

      // Submit without selecting member
      await page.getByRole("button", { name: /generate|submit/i }).click()

      // Should show validation error
      await expect(page.locator("text=required").first()).toBeVisible()
    })
  })

  test.describe("Invoice Details", () => {
    test.skip("should show invoice details", async ({ page }) => {
      await page.goto("/admin/invoices/1")

      // Should show invoice details
      await expect(page.locator("[data-testid=invoice-details]")).toBeVisible()
    })

    test.skip("should show linked appointments", async ({ page }) => {
      await page.goto("/admin/invoices/1")

      // Appointments section should be visible
      await expect(
        page.locator("[data-testid=invoice-appointments]")
      ).toBeVisible()
    })

    test.skip("should allow creating payment link", async ({ page }) => {
      await page.goto("/admin/invoices/1")

      // Payment link button should be visible for unpaid invoices
      const paymentButton = page.getByRole("button", { name: /payment link/i })
      if (await paymentButton.isVisible()) {
        expect(paymentButton).toBeEnabled()
      }
    })
  })

  test.describe("Client Invoice View", () => {
    test.skip("should show client's own invoices", async ({ page }) => {
      await page.goto("/client/invoices")

      // Should show client invoice list
      await expect(page.locator("[data-testid=client-invoices]")).toBeVisible()
    })
  })
})
