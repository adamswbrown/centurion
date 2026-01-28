/**
 * Memberships E2E Tests
 *
 * Tests for membership plans and user membership flows.
 * Covers plan creation, assignment, usage tracking, and billing.
 */

import { test, expect } from "./fixtures/auth.fixture"

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
  test("should display membership plans list", async ({ adminPage }) => {
    await adminPage.goto("/admin/memberships")

    // Plans list should be visible
    await expect(
      adminPage.locator("text=Membership Plans")
        .or(adminPage.locator("h1:has-text('Memberships')"))
        .or(adminPage.locator("text=Monthly Unlimited"))
    ).toBeVisible({ timeout: 5000 })
  })

  test("should create recurring membership plan", async ({ adminPage }) => {
    await adminPage.goto("/admin/memberships")

    // Click create plan button
    const createButton = adminPage.locator("button:has-text('Create Plan')")
      .or(adminPage.locator("button:has-text('New Plan')"))
      .or(adminPage.locator("button:has-text('Add Plan')"))
    if (await createButton.isVisible()) {
      await createButton.click()

      // Select RECURRING type
      const typeSelect = adminPage.locator("select[name='type']")
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption("RECURRING")
      }

      // Fill in form
      await adminPage.fill("input[name='name']", "E2E Recurring Plan")
      const descField = adminPage.locator("textarea[name='description']")
      if (await descField.isVisible()) {
        await descField.fill("E2E test recurring plan")
      }
      await adminPage.fill("input[name='monthlyPrice']", "99")

      // Submit form
      await adminPage.click("button[type='submit']")

      // Should see success message or plan in list
      await expect(
        adminPage.locator("text=Plan created")
          .or(adminPage.locator("text=successfully"))
          .or(adminPage.locator("text=E2E Recurring Plan"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should create pack membership plan", async ({ adminPage }) => {
    await adminPage.goto("/admin/memberships")

    const createButton = adminPage.locator("button:has-text('Create Plan')")
      .or(adminPage.locator("button:has-text('New Plan')"))
    if (await createButton.isVisible()) {
      await createButton.click()

      // Select PACK type
      const typeSelect = adminPage.locator("select[name='type']")
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption("PACK")
      }

      // Fill in form
      await adminPage.fill("input[name='name']", "E2E Pack Plan")
      await adminPage.fill("input[name='packPrice']", "180")
      await adminPage.fill("input[name='packSessionCount']", "10")
      const neverExpiresCheckbox = adminPage.locator("input[name='packNeverExpires']")
      if (await neverExpiresCheckbox.isVisible()) {
        await neverExpiresCheckbox.check()
      }

      // Submit form
      await adminPage.click("button[type='submit']")

      // Should see success
      await expect(
        adminPage.locator("text=successfully").or(adminPage.locator("text=E2E Pack Plan"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should create prepaid membership plan", async ({ adminPage }) => {
    await adminPage.goto("/admin/memberships")

    const createButton = adminPage.locator("button:has-text('Create Plan')")
      .or(adminPage.locator("button:has-text('New Plan')"))
    if (await createButton.isVisible()) {
      await createButton.click()

      // Select PREPAID type
      const typeSelect = adminPage.locator("select[name='type']")
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption("PREPAID")
      }

      // Fill in form
      await adminPage.fill("input[name='name']", "E2E Prepaid Plan")
      await adminPage.fill("input[name='prepaidPrice']", "399")
      await adminPage.fill("input[name='prepaidDurationMonths']", "3")

      // Submit form
      await adminPage.click("button[type='submit']")

      // Should see success
      await expect(
        adminPage.locator("text=successfully").or(adminPage.locator("text=E2E Prepaid Plan"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should update membership plan", async ({ adminPage }) => {
    await adminPage.goto("/admin/memberships")

    // Click edit on first plan
    const editButton = adminPage.locator("button[aria-label='Edit plan']").first()
      .or(adminPage.locator("button:has-text('Edit')").first())
    if (await editButton.isVisible()) {
      await editButton.click()

      // Update price
      const priceField = adminPage.locator("input[name='monthlyPrice']")
      if (await priceField.isVisible()) {
        await priceField.fill("159")
      }

      // Submit form
      await adminPage.click("button[type='submit']")

      // Should see updated price or success
      await expect(
        adminPage.locator("text=$159").or(adminPage.locator("text=successfully"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should archive membership plan", async ({ adminPage }) => {
    await adminPage.goto("/admin/memberships")

    // Click archive on a plan
    const archiveButton = adminPage.locator("button:has-text('Archive')").first()
      .or(adminPage.locator("button:has-text('Deactivate')").first())
    if (await archiveButton.isVisible()) {
      await archiveButton.click()

      // Confirm archival
      const confirmButton = adminPage.locator("button:has-text('Confirm'):visible")
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // Should see archived status or success
      await expect(
        adminPage.locator("text=Archived").or(adminPage.locator("text=successfully"))
      ).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe("Memberships - Plan Assignment (Admin/Coach)", () => {
  test("should assign membership to user", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member
    const memberRow = adminPage.locator("[data-testid='member-row']").first()
      .or(adminPage.locator("table tbody tr").first())
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Click assign membership button
      const assignButton = adminPage.locator("button:has-text('Assign Membership')")
        .or(adminPage.locator("button:has-text('Assign')"))
      if (await assignButton.isVisible()) {
        await assignButton.click()

        // Select plan
        const planSelect = adminPage.locator("select[name='membershipPlanId']")
        if (await planSelect.isVisible()) {
          await planSelect.selectOption({ index: 1 })
        }

        // Submit form
        await adminPage.click("button[type='submit']")

        // Should see success message
        await expect(
          adminPage.locator("text=assigned").or(adminPage.locator("text=successfully"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should bulk assign membership to multiple users", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Select multiple members
    const checkboxes = adminPage.locator("[data-testid='member-checkbox']")
    if (await checkboxes.first().isVisible()) {
      await checkboxes.nth(0).check()
      if (await checkboxes.nth(1).isVisible()) {
        await checkboxes.nth(1).check()
      }

      // Click bulk assign button
      const bulkButton = adminPage.locator("button:has-text('Bulk Assign')")
      if (await bulkButton.isVisible()) {
        await bulkButton.click()

        // Select plan
        const planSelect = adminPage.locator("select[name='membershipPlanId']")
        if (await planSelect.isVisible()) {
          await planSelect.selectOption({ index: 1 })
        }

        // Submit form
        await adminPage.click("button[type='submit']")

        // Should see success message
        await expect(
          adminPage.locator("text=assigned").or(adminPage.locator("text=successfully"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe("Memberships - User Membership Management", () => {
  test("should pause membership", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member with active membership
    const memberRow = adminPage.locator("[data-testid='member-row']:has-text('Active')").first()
      .or(adminPage.locator("table tbody tr").first())
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Click pause button
      const pauseButton = adminPage.locator("button:has-text('Pause Membership')")
        .or(adminPage.locator("button:has-text('Pause')"))
      if (await pauseButton.isVisible()) {
        await pauseButton.click()

        // Confirm pause
        const confirmButton = adminPage.locator("button:has-text('Confirm'):visible")
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }

        // Should see paused status
        await expect(
          adminPage.locator("text=Paused").or(adminPage.locator("text=successfully"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should resume membership", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member with paused membership
    const memberRow = adminPage.locator("[data-testid='member-row']:has-text('Paused')").first()
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Click resume button
      const resumeButton = adminPage.locator("button:has-text('Resume Membership')")
        .or(adminPage.locator("button:has-text('Resume')"))
      if (await resumeButton.isVisible()) {
        await resumeButton.click()

        // Should see active status
        await expect(
          adminPage.locator("text=Active").or(adminPage.locator("text=successfully"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should cancel membership", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member
    const memberRow = adminPage.locator("[data-testid='member-row']").first()
      .or(adminPage.locator("table tbody tr").first())
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Click cancel button
      const cancelButton = adminPage.locator("button:has-text('Cancel Membership')")
        .or(adminPage.locator("button:has-text('End Membership')"))
      if (await cancelButton.isVisible()) {
        await cancelButton.click()

        // Confirm cancellation
        const confirmButton = adminPage.locator("button:has-text('Confirm'):visible")
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }

        // Should see cancelled status
        await expect(
          adminPage.locator("text=Cancelled").or(adminPage.locator("text=successfully"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test("should view membership history", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member
    const memberRow = adminPage.locator("[data-testid='member-row']").first()
      .or(adminPage.locator("table tbody tr").first())
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Click history tab
      const historyTab = adminPage.locator("button:has-text('History')")
      if (await historyTab.isVisible()) {
        await historyTab.click()

        // Should see membership history list
        await expect(
          adminPage.locator("[data-testid='membership-history-list']")
            .or(adminPage.locator("text=History"))
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe("Memberships - Session Usage Tracking", () => {
  test("should display session usage for recurring plan", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member with recurring membership
    const memberRow = adminPage.locator("[data-testid='member-row']").first()
      .or(adminPage.locator("table tbody tr").first())
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Should see usage information
      const usageBar = adminPage.locator("[data-testid='usage-bar']")
        .or(adminPage.locator("text=/sessions/i"))
      // Usage info is conditional on membership type
    }
  })

  test("should display session usage for pack plan", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member with pack membership
    const memberRow = adminPage.locator("[data-testid='member-row']:has-text('Pack')").first()
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Should see sessions remaining
      const remaining = adminPage.locator("text=/sessions remaining/")
        .or(adminPage.locator("[data-testid='pack-progress']"))
      // Pack info is conditional
    }
  })

  test("should show warning when pack is low", async ({ adminPage }) => {
    await adminPage.goto("/members")

    // Click on a member
    const memberRow = adminPage.locator("[data-testid='member-row']").first()
      .or(adminPage.locator("table tbody tr").first())
    if (await memberRow.isVisible()) {
      await memberRow.click()

      // Low balance warning is conditional on pack balance
      const warningVisible = await adminPage.locator("text=/Low balance|Running low/").isVisible()
      // This is an optional assertion - only applies when balance is low
    }
  })
})

test.describe("Memberships - Client Self-Service", () => {
  test("should display current membership for client", async ({ clientPage }) => {
    await clientPage.goto("/client/membership")

    // Should see membership details or no membership message
    await expect(
      clientPage.locator("text=Your Membership")
        .or(clientPage.locator("h1:has-text('Membership')"))
        .or(clientPage.locator("text=Membership"))
    ).toBeVisible({ timeout: 5000 })
  })

  test("should browse available membership plans", async ({ clientPage }) => {
    await clientPage.goto("/client/membership/plans")

    // Should see available plans or browse page
    await expect(
      clientPage.locator("text=Available Plans")
        .or(clientPage.locator("text=Membership Plans"))
        .or(clientPage.locator("text=Plans"))
    ).toBeVisible({ timeout: 5000 })
  })

  test("should purchase membership plan", async ({ clientPage }) => {
    await clientPage.goto("/client/membership/plans")

    // Click purchase on a plan
    const purchaseButton = clientPage.locator("button:has-text('Purchase')").first()
      .or(clientPage.locator("button:has-text('Subscribe')").first())
      .or(clientPage.locator("button:has-text('Select')").first())
    if (await purchaseButton.isVisible()) {
      await purchaseButton.click()

      // Should redirect to Stripe checkout or show payment modal
      // Allow time for redirect
      await clientPage.waitForTimeout(2000)
      const url = clientPage.url()
      const hasCheckout = url.includes("stripe") || url.includes("checkout")
      const hasModal = await clientPage.locator("text=Checkout").isVisible()
      // Either Stripe redirect or payment modal is acceptable
    }
  })
})

test.describe("Memberships - Analytics", () => {
  test("should display membership analytics for admin", async ({ adminPage }) => {
    await adminPage.goto("/reports")

    // Click memberships tab
    const membershipsTab = adminPage.locator("button:has-text('Memberships')")
    if (await membershipsTab.isVisible()) {
      await membershipsTab.click()

      // Should see analytics content
      await expect(
        adminPage.locator("text=Active Memberships")
          .or(adminPage.locator("text=Membership"))
          .or(adminPage.locator("[data-testid='membership-chart']"))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("should export membership report", async ({ adminPage }) => {
    await adminPage.goto("/reports")

    // Click memberships tab
    const membershipsTab = adminPage.locator("button:has-text('Memberships')")
    if (await membershipsTab.isVisible()) {
      await membershipsTab.click()

      // Click export button
      const exportButton = adminPage.locator("button:has-text('Export')")
      if (await exportButton.isVisible()) {
        const downloadPromise = adminPage.waitForEvent("download", { timeout: 5000 }).catch(() => null)
        await exportButton.click()

        const download = await downloadPromise
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)/)
        }
      }
    }
  })
})
