/**
 * Authentication E2E Tests
 *
 * Tests for authentication flows including login, logout, and role-based access.
 */

import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login")

      // Check for form elements
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
    })

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/login")

      // Click submit without filling form
      await page.getByRole("button", { name: /sign in/i }).click()

      // Should show validation errors
      await expect(page.locator("text=required").first()).toBeVisible({ timeout: 5000 })
    })

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login")

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill("invalid@test.com")
      await page.getByLabel(/password/i).fill("wrongpassword123")
      await page.getByRole("button", { name: /sign in/i }).click()

      // Should show error message
      await expect(page.locator("text=invalid").first()).toBeVisible({ timeout: 5000 })
    })

    test("should have Google sign-in option", async ({ page }) => {
      await page.goto("/login")

      // Check for Google sign-in button
      await expect(
        page.getByRole("button", { name: /google/i }).or(page.locator("text=Google"))
      ).toBeVisible()
    })
  })

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated users from dashboard", async ({ page }) => {
      await page.goto("/dashboard")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect unauthenticated users from admin pages", async ({ page }) => {
      await page.goto("/admin")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect unauthenticated users from coach pages", async ({ page }) => {
      await page.goto("/coach")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })
  })
})

test.describe("Navigation", () => {
  test("should navigate between public pages", async ({ page }) => {
    await page.goto("/")

    // Check navigation links exist
    const loginLink = page.getByRole("link", { name: /login|sign in/i })
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(/login/)
    }
  })
})
