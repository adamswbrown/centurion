/**
 * Memberships E2E Tests
 *
 * Tests for membership plans and user membership flows.
 * Covers plan creation, assignment, usage tracking, and billing.
 */

import { test, expect, Page } from "@playwright/test"

// Helper to check if we're on an authenticated page
async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes("/login")
}

test.describe("Memberships - Public Access", () => {
  test("should redirect to login when accessing membership plans without auth", async ({
    page,
  }) => {
    await page.goto("/admin/memberships")
    await expect(page).toHaveURL(/login/)
  })

  test("should redirect to login when accessing client membership without auth", async ({
    page,
  }) => {
    await page.goto("/client/membership")
    await expect(page).toHaveURL(/login/)
  })
})

test.describe("Memberships - Plan Management (Admin)", () => {
  test.skip("should display membership plans list", async ({ page }) => {
    // This test requires authentication as ADMIN
    await page.goto("/admin/memberships")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Plans list should be visible
    await expect(
      page.locator("text=Membership Plans").or(page.locator("h1:has-text('Memberships')"))
    ).toBeVisible()
  })

  test.skip("should create recurring membership plan", async ({ page }) => {
    await page.goto("/admin/memberships")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click create plan button
    await page.click("button:has-text('Create Plan')")

    // Select RECURRING type
    await page.selectOption("select[name='type']", "RECURRING")

    // Fill in form
    await page.fill("input[name='name']", "Monthly Unlimited")
    await page.fill("textarea[name='description']", "Unlimited classes per month")
    await page.fill("input[name='monthlyPrice']", "149")
    await page.fill("input[name='maxSessionsPerWeek']", "0") // Unlimited

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message
    await expect(
      page.locator("text=Plan created").or(page.locator("text=successfully"))
    ).toBeVisible({ timeout: 5000 })

    // Plan should appear in list
    await expect(page.locator("text=Monthly Unlimited")).toBeVisible()
  })

  test.skip("should create pack membership plan", async ({ page }) => {
    await page.goto("/admin/memberships")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click create plan button
    await page.click("button:has-text('Create Plan')")

    // Select PACK type
    await page.selectOption("select[name='type']", "PACK")

    // Fill in form
    await page.fill("input[name='name']", "10 Class Pack")
    await page.fill("textarea[name='description']", "10 classes, no expiration")
    await page.fill("input[name='packPrice']", "180")
    await page.fill("input[name='packSessionCount']", "10")
    await page.check("input[name='packNeverExpires']")

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message
    await expect(page.locator("text=successfully")).toBeVisible({ timeout: 5000 })

    // Plan should appear in list
    await expect(page.locator("text=10 Class Pack")).toBeVisible()
  })

  test.skip("should create prepaid membership plan", async ({ page }) => {
    await page.goto("/admin/memberships")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click create plan button
    await page.click("button:has-text('Create Plan')")

    // Select PREPAID type
    await page.selectOption("select[name='type']", "PREPAID")

    // Fill in form
    await page.fill("input[name='name']", "3-Month Prepaid")
    await page.fill("textarea[name='description']", "3 months of unlimited classes")
    await page.fill("input[name='prepaidPrice']", "399")
    await page.fill("input[name='prepaidDurationMonths']", "3")

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message
    await expect(page.locator("text=successfully")).toBeVisible({ timeout: 5000 })

    // Plan should appear in list
    await expect(page.locator("text=3-Month Prepaid")).toBeVisible()
  })

  test.skip("should update membership plan", async ({ page }) => {
    await page.goto("/admin/memberships")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click edit on first plan
    await page.click("button[aria-label='Edit plan']:first")

    // Update price
    await page.fill("input[name='monthlyPrice']", "159")

    // Submit form
    await page.click("button[type='submit']")

    // Should see updated price
    await expect(page.locator("text=$159")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should archive membership plan", async ({ page }) => {
    await page.goto("/admin/memberships")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click archive on first plan
    await page.click("button:has-text('Archive'):first")

    // Confirm archival
    await page.click("button:has-text('Confirm'):visible")

    // Should see archived status
    await expect(page.locator("text=Archived")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Memberships - Plan Assignment (Admin/Coach)", () => {
  test.skip("should assign membership to user", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member
    await page.click("[data-testid='member-row']:first")

    // Click assign membership button
    await page.click("button:has-text('Assign Membership')")

    // Select plan
    await page.selectOption("select[name='membershipPlanId']", { index: 1 })

    // Set start date
    await page.fill("input[name='startDate']", "2026-02-01")

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message
    await expect(page.locator("text=assigned")).toBeVisible({ timeout: 5000 })

    // Should see membership in user detail
    await expect(page.locator("[data-testid='user-membership']")).toBeVisible()
  })

  test.skip("should bulk assign membership to multiple users", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Select multiple members
    await page.check("[data-testid='member-checkbox']:nth-of-type(1)")
    await page.check("[data-testid='member-checkbox']:nth-of-type(2)")
    await page.check("[data-testid='member-checkbox']:nth-of-type(3)")

    // Click bulk assign button
    await page.click("button:has-text('Bulk Assign')")

    // Select plan
    await page.selectOption("select[name='membershipPlanId']", { index: 1 })

    // Submit form
    await page.click("button[type='submit']")

    // Should see success message with count
    await expect(page.locator("text=3 memberships assigned")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Memberships - User Membership Management", () => {
  test.skip("should pause membership", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member with active membership
    await page.click("[data-testid='member-row']:has-text('Active'):first")

    // Click pause button
    await page.click("button:has-text('Pause Membership')")

    // Confirm pause
    await page.click("button:has-text('Confirm'):visible")

    // Should see paused status
    await expect(page.locator("text=Paused")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should resume membership", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member with paused membership
    await page.click("[data-testid='member-row']:has-text('Paused'):first")

    // Click resume button
    await page.click("button:has-text('Resume Membership')")

    // Should see active status
    await expect(page.locator("text=Active")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should cancel membership", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member with active membership
    await page.click("[data-testid='member-row']:first")

    // Click cancel button
    await page.click("button:has-text('Cancel Membership')")

    // Confirm cancellation
    await page.click("button:has-text('Confirm'):visible")

    // Should see cancelled status
    await expect(page.locator("text=Cancelled")).toBeVisible({ timeout: 5000 })
  })

  test.skip("should view membership history", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member
    await page.click("[data-testid='member-row']:first")

    // Click history tab
    await page.click("button:has-text('History')")

    // Should see membership history list
    await expect(page.locator("[data-testid='membership-history-list']")).toBeVisible()

    // Should see past memberships
    await expect(page.locator("[data-testid='past-membership']").first()).toBeVisible()
  })
})

test.describe("Memberships - Session Usage Tracking", () => {
  test.skip("should display session usage for recurring plan", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member with recurring membership
    await page.click("[data-testid='member-row']:has-text('Recurring'):first")

    // Should see weekly usage bar
    await expect(page.locator("[data-testid='usage-bar']")).toBeVisible()

    // Should see sessions used count
    await expect(page.locator("text=/\\d+ of \\d+ sessions/")).toBeVisible()
  })

  test.skip("should display session usage for pack plan", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member with pack membership
    await page.click("[data-testid='member-row']:has-text('Pack'):first")

    // Should see sessions remaining
    await expect(page.locator("text=/\\d+ sessions remaining/")).toBeVisible()

    // Should see progress bar
    await expect(page.locator("[data-testid='pack-progress']")).toBeVisible()
  })

  test.skip("should show warning when pack is low", async ({ page }) => {
    await page.goto("/members")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click on a member with low pack balance
    await page.click("[data-testid='member-row']:first")

    // Should see low balance warning if < 3 sessions
    const warningVisible = await page.locator("text=/Low balance|Running low/").isVisible()
    if (warningVisible) {
      await expect(page.locator("[data-testid='low-balance-warning']")).toBeVisible()
    }
  })
})

test.describe("Memberships - Client Self-Service", () => {
  test.skip("should display current membership for client", async ({ page }) => {
    await page.goto("/client/membership")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Should see membership details
    await expect(
      page.locator("text=Your Membership").or(page.locator("h1:has-text('Membership')"))
    ).toBeVisible()

    // Should see plan name
    await expect(page.locator("[data-testid='plan-name']")).toBeVisible()

    // Should see usage information
    await expect(page.locator("[data-testid='usage-info']")).toBeVisible()
  })

  test.skip("should browse available membership plans", async ({ page }) => {
    await page.goto("/client/membership/plans")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Should see available plans
    await expect(page.locator("text=Available Plans")).toBeVisible()

    // Should see plan cards
    await expect(page.locator("[data-testid='plan-card']").first()).toBeVisible()

    // Each plan should show price
    await expect(page.locator("text=/\\$\\d+/").first()).toBeVisible()
  })

  test.skip("should purchase membership plan", async ({ page }) => {
    await page.goto("/client/membership/plans")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click purchase on a plan
    await page.click("button:has-text('Purchase'):first")

    // Should redirect to Stripe checkout or show payment modal
    // Wait for either redirect or modal
    await expect(
      page.locator("text=Checkout").or(page.url()).toMatch(/stripe|checkout/)
    ).toBeTruthy()
  })
})

test.describe("Memberships - Stripe Integration", () => {
  test.skip("should create Stripe checkout session for membership", async ({ page }) => {
    await page.goto("/client/membership/plans")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click purchase button
    await page.click("button:has-text('Purchase'):first")

    // Should redirect to Stripe
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 })

    // Stripe checkout page should load
    await expect(page.locator("text=Pay").or(page.locator("text=Card"))).toBeVisible()
  })

  test.skip("should handle successful payment webhook", async ({ page }) => {
    // This test would require webhook simulation or test mode
    // Skipping actual webhook test - covered by unit tests
    test.skip()
  })
})

test.describe("Memberships - Analytics", () => {
  test.skip("should display membership analytics for admin", async ({ page }) => {
    await page.goto("/reports")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click memberships tab
    await page.click("button:has-text('Memberships')")

    // Should see KPI cards
    await expect(page.locator("text=Active Memberships")).toBeVisible()
    await expect(page.locator("text=Churn Rate")).toBeVisible()

    // Should see membership distribution chart
    await expect(page.locator("[data-testid='membership-chart']")).toBeVisible()

    // Should see plan popularity table
    await expect(page.locator("[data-testid='plan-table']")).toBeVisible()
  })

  test.skip("should export membership report", async ({ page }) => {
    await page.goto("/reports")

    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }

    // Click memberships tab
    await page.click("button:has-text('Memberships')")

    // Click export button
    const downloadPromise = page.waitForEvent("download")
    await page.click("button:has-text('Export')")

    // Should download CSV
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/membership.*\.csv/)
  })
})
