import { test, expect } from "@playwright/test"

test.describe("Centurion E2E Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/")
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/Centurion/)
  })

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login")
    // Check that login page elements are present
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
  })
})
