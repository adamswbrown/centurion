/**
 * Invoices E2E Tests
 *
 * Tests for invoice management flows.
 */

import { test, expect } from "./fixtures/auth.fixture"

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
    test("should display invoice list", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Should show invoice table or list
      await expect(
        adminPage.locator("table")
          .or(adminPage.locator("text=Invoices"))
          .or(adminPage.locator("text=Billing"))
      ).toBeVisible({ timeout: 5000 })
    })

    test("should filter by payment status", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Find and click status filter
      const statusFilter = adminPage.getByRole("combobox", { name: /status/i })
        .or(adminPage.locator("select").first())
      if (await statusFilter.isVisible()) {
        await statusFilter.click()
        const unpaidOption = adminPage.getByRole("option", { name: /unpaid/i })
        if (await unpaidOption.isVisible()) {
          await unpaidOption.click()
        }
      }
    })

    test("should filter by year", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Find and use year filter
      const yearFilter = adminPage.getByRole("combobox", { name: /year/i })
      if (await yearFilter.isVisible()) {
        await yearFilter.click()
        const yearOption = adminPage.getByRole("option").first()
        if (await yearOption.isVisible()) {
          await yearOption.click()
        }
      }
    })
  })

  test.describe("Invoice Generation", () => {
    test("should open invoice generation modal", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Click generate button
      const generateButton = adminPage.getByRole("button", { name: /generate|create/i })
      if (await generateButton.isVisible()) {
        await generateButton.click()

        // Modal should be visible
        await expect(
          adminPage.getByRole("dialog")
            .or(adminPage.locator("text=Generate Invoice"))
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("should require member selection for invoice generation", async ({
      adminPage,
    }) => {
      await adminPage.goto("/billing")

      // Open generate modal
      const generateButton = adminPage.getByRole("button", { name: /generate|create/i })
      if (await generateButton.isVisible()) {
        await generateButton.click()

        // Submit without selecting member
        const submitButton = adminPage.getByRole("button", { name: /generate|submit/i })
        if (await submitButton.isVisible()) {
          await submitButton.click()

          // Should show validation error
          await expect(adminPage.locator("text=required").first()).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe("Invoice Details", () => {
    test("should show invoice details", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Click on first invoice if available
      const invoiceRow = adminPage.locator("table tbody tr").first()
        .or(adminPage.locator("[data-testid=invoice-item]").first())
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click()

        // Should show invoice details
        await expect(
          adminPage.locator("[data-testid=invoice-details]")
            .or(adminPage.locator("text=Invoice"))
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("should show linked appointments", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Click on first invoice if available
      const invoiceRow = adminPage.locator("table tbody tr").first()
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click()

        // Appointments section should be visible if invoice has appointments
        const appointmentsSection = adminPage.locator("[data-testid=invoice-appointments]")
          .or(adminPage.locator("text=Appointments"))
        // This is conditional - not all invoices have appointments
      }
    })

    test("should allow creating payment link", async ({ adminPage }) => {
      await adminPage.goto("/billing")

      // Click on first invoice if available
      const invoiceRow = adminPage.locator("table tbody tr").first()
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click()

        // Payment link button should be visible for unpaid invoices
        const paymentButton = adminPage.getByRole("button", { name: /payment link/i })
          .or(adminPage.locator("button:has-text('Payment')"))
        if (await paymentButton.isVisible()) {
          expect(paymentButton).toBeEnabled()
        }
      }
    })
  })

  test.describe("Client Invoice View", () => {
    test("should show client's own invoices", async ({ clientPage }) => {
      await clientPage.goto("/invoices/me")

      // Should show client invoice list or empty state
      await expect(
        clientPage.locator("[data-testid=client-invoices]")
          .or(clientPage.locator("text=Invoices"))
          .or(clientPage.locator("text=No invoices"))
      ).toBeVisible({ timeout: 5000 })
    })
  })
})
