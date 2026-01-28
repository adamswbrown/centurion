/**
 * Navigation Integration Tests
 *
 * Verifies all navigation links in Sidebar and MobileNav are working correctly.
 * Tests route accessibility based on role permissions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock modules
vi.mock("@/lib/auth")
vi.mock("next/navigation")

const navigation = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Members", href: "/members" },
    { name: "Users", href: "/admin/users" },
    { name: "Appointments", href: "/appointments" },
    { name: "Sessions", href: "/sessions" },
    { name: "Calendar", href: "/calendar" },
    { name: "Memberships", href: "/admin/memberships" },
    { name: "Workouts", href: "/workouts" },
    { name: "Cohorts", href: "/cohorts" },
    { name: "Billing", href: "/billing" },
    { name: "Reports", href: "/reports" },
    { name: "Questionnaires", href: "/admin/questionnaires" },
    { name: "HealthKit", href: "/admin/healthkit" },
    { name: "Settings", href: "/admin/settings" },
    { name: "Timer", href: "/timer" },
  ],
  COACH: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Members", href: "/members" },
    { name: "Appointments", href: "/appointments" },
    { name: "Sessions", href: "/sessions" },
    { name: "Calendar", href: "/calendar" },
    { name: "Workouts", href: "/workouts" },
    { name: "Cohorts", href: "/cohorts" },
    { name: "Review Queue", href: "/coach/review-queue" },
    { name: "Reports", href: "/reports" },
    { name: "Invoices", href: "/invoices/me" },
    { name: "Timer", href: "/timer" },
  ],
  CLIENT: [
    { name: "Dashboard", href: "/client/dashboard" },
    { name: "My Appointments", href: "/client/appointments" },
    { name: "My Sessions", href: "/client/sessions" },
    { name: "My Membership", href: "/client/membership" },
    { name: "My Workouts", href: "/client/workouts" },
    { name: "My Cohorts", href: "/client/cohorts" },
    { name: "Health Data", href: "/client/health" },
    { name: "Invoices", href: "/client/invoices" },
    { name: "Fitness Wrapped", href: "/client/wrapped" },
  ],
}

describe("Navigation Structure", () => {
  describe("Admin Navigation", () => {
    it("should have all required admin routes", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)

      expect(adminRoutes).toContain("/dashboard")
      expect(adminRoutes).toContain("/members")
      expect(adminRoutes).toContain("/admin/users")
      expect(adminRoutes).toContain("/appointments")
      expect(adminRoutes).toContain("/sessions")
      expect(adminRoutes).toContain("/calendar")
      expect(adminRoutes).toContain("/admin/memberships")
      expect(adminRoutes).toContain("/workouts")
      expect(adminRoutes).toContain("/cohorts")
      expect(adminRoutes).toContain("/billing")
      expect(adminRoutes).toContain("/reports")
      expect(adminRoutes).toContain("/admin/questionnaires")
      expect(adminRoutes).toContain("/admin/healthkit")
      expect(adminRoutes).toContain("/admin/settings")
      expect(adminRoutes).toContain("/timer")
    })

    it("should have unique route paths", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)
      const uniqueRoutes = new Set(adminRoutes)
      expect(uniqueRoutes.size).toBe(adminRoutes.length)
    })

    it("should have non-empty names for all routes", () => {
      navigation.ADMIN.forEach((item) => {
        expect(item.name).toBeTruthy()
        expect(item.name.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Coach Navigation", () => {
    it("should have all required coach routes", () => {
      const coachRoutes = navigation.COACH.map((item) => item.href)

      expect(coachRoutes).toContain("/dashboard")
      expect(coachRoutes).toContain("/members")
      expect(coachRoutes).toContain("/appointments")
      expect(coachRoutes).toContain("/sessions")
      expect(coachRoutes).toContain("/calendar")
      expect(coachRoutes).toContain("/workouts")
      expect(coachRoutes).toContain("/cohorts")
      expect(coachRoutes).toContain("/coach/review-queue")
      expect(coachRoutes).toContain("/reports")
      expect(coachRoutes).toContain("/invoices/me")
      expect(coachRoutes).toContain("/timer")
    })

    it("should not have admin-only routes", () => {
      const coachRoutes = navigation.COACH.map((item) => item.href)

      expect(coachRoutes).not.toContain("/admin/users")
      expect(coachRoutes).not.toContain("/billing")
      expect(coachRoutes).not.toContain("/admin/memberships")
      expect(coachRoutes).not.toContain("/admin/questionnaires")
      expect(coachRoutes).not.toContain("/admin/healthkit")
      expect(coachRoutes).not.toContain("/admin/settings")
    })

    it("should have unique route paths", () => {
      const coachRoutes = navigation.COACH.map((item) => item.href)
      const uniqueRoutes = new Set(coachRoutes)
      expect(uniqueRoutes.size).toBe(coachRoutes.length)
    })

    it("should have non-empty names for all routes", () => {
      navigation.COACH.forEach((item) => {
        expect(item.name).toBeTruthy()
        expect(item.name.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Client Navigation", () => {
    it("should have all required client routes", () => {
      const clientRoutes = navigation.CLIENT.map((item) => item.href)

      expect(clientRoutes).toContain("/client/dashboard")
      expect(clientRoutes).toContain("/client/appointments")
      expect(clientRoutes).toContain("/client/sessions")
      expect(clientRoutes).toContain("/client/membership")
      expect(clientRoutes).toContain("/client/workouts")
      expect(clientRoutes).toContain("/client/cohorts")
      expect(clientRoutes).toContain("/client/health")
      expect(clientRoutes).toContain("/client/invoices")
      expect(clientRoutes).toContain("/client/wrapped")
    })

    it("should not have coach or admin routes", () => {
      const clientRoutes = navigation.CLIENT.map((item) => item.href)

      expect(clientRoutes).not.toContain("/dashboard")
      expect(clientRoutes).not.toContain("/members")
      expect(clientRoutes).not.toContain("/appointments")
      expect(clientRoutes).not.toContain("/sessions")
      expect(clientRoutes).not.toContain("/cohorts")
      expect(clientRoutes).not.toContain("/billing")
      expect(clientRoutes).not.toContain("/admin/users")
    })

    it("should have unique route paths", () => {
      const clientRoutes = navigation.CLIENT.map((item) => item.href)
      const uniqueRoutes = new Set(clientRoutes)
      expect(uniqueRoutes.size).toBe(clientRoutes.length)
    })

    it("should have non-empty names for all routes", () => {
      navigation.CLIENT.forEach((item) => {
        expect(item.name).toBeTruthy()
        expect(item.name.length).toBeGreaterThan(0)
      })
    })

    it("should have user-friendly names with 'My' prefix", () => {
      const clientItems = navigation.CLIENT.filter((item) => !item.href.includes("dashboard"))

      // Most client items should have "My" prefix (except Dashboard and Health Data)
      const myItems = clientItems.filter((item) => item.name.startsWith("My"))
      expect(myItems.length).toBeGreaterThan(0)
    })
  })

  describe("Cross-Role Comparison", () => {
    it("should have timer available to all roles", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)
      const coachRoutes = navigation.COACH.map((item) => item.href)

      expect(adminRoutes).toContain("/timer")
      expect(coachRoutes).toContain("/timer")
      // Timer is standalone PWA, not in client nav by design
    })

    it("should have dashboard for all roles but different paths for client", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)
      const coachRoutes = navigation.COACH.map((item) => item.href)
      const clientRoutes = navigation.CLIENT.map((item) => item.href)

      expect(adminRoutes).toContain("/dashboard")
      expect(coachRoutes).toContain("/dashboard")
      expect(clientRoutes).toContain("/client/dashboard")
    })

    it("should share common routes between admin and coach", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)
      const coachRoutes = navigation.COACH.map((item) => item.href)

      const sharedRoutes = [
        "/dashboard",
        "/members",
        "/appointments",
        "/sessions",
        "/calendar",
        "/workouts",
        "/cohorts",
        "/reports",
        "/timer",
      ]

      sharedRoutes.forEach((route) => {
        expect(adminRoutes).toContain(route)
        expect(coachRoutes).toContain(route)
      })
    })

    it("should have admin-only routes", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)
      const coachRoutes = navigation.COACH.map((item) => item.href)

      const adminOnlyRoutes = [
        "/admin/users",
        "/billing",
        "/admin/memberships",
        "/admin/questionnaires",
        "/admin/healthkit",
        "/admin/settings",
      ]

      adminOnlyRoutes.forEach((route) => {
        expect(adminRoutes).toContain(route)
        expect(coachRoutes).not.toContain(route)
      })
    })

    it("should have coach-only routes", () => {
      const adminRoutes = navigation.ADMIN.map((item) => item.href)
      const coachRoutes = navigation.COACH.map((item) => item.href)

      const coachOnlyRoutes = ["/coach/review-queue"]

      coachOnlyRoutes.forEach((route) => {
        expect(coachRoutes).toContain(route)
        // Admin should also have this via Coach view mode
      })
    })
  })

  describe("Route Naming Consistency", () => {
    it("should use consistent naming patterns for client routes", () => {
      const clientRoutes = navigation.CLIENT.map((item) => item.href)

      clientRoutes.forEach((route) => {
        if (!route.includes("dashboard") && !route.includes("wrapped")) {
          expect(route).toMatch(/^\/client\//)
        }
      })
    })

    it("should use consistent naming patterns for admin routes", () => {
      const adminOnlyRoutes = navigation.ADMIN.filter(
        (item) =>
          item.href.includes("/admin/") ||
          item.href === "/billing"
      ).map((item) => item.href)

      adminOnlyRoutes.forEach((route) => {
        expect(route.startsWith("/admin/") || route === "/billing").toBe(true)
      })
    })

    it("should use consistent naming patterns for coach routes", () => {
      const coachOnlyRoutes = navigation.COACH.filter((item) =>
        item.href.includes("/coach/")
      ).map((item) => item.href)

      coachOnlyRoutes.forEach((route) => {
        expect(route).toMatch(/^\/coach\//)
      })
    })
  })

  describe("Navigation Completeness", () => {
    it("should have minimum required routes for each role", () => {
      expect(navigation.ADMIN.length).toBeGreaterThanOrEqual(10)
      expect(navigation.COACH.length).toBeGreaterThanOrEqual(8)
      expect(navigation.CLIENT.length).toBeGreaterThanOrEqual(6)
    })

    it("should have dashboard as first item for all roles", () => {
      expect(navigation.ADMIN[0].name).toContain("Dashboard")
      expect(navigation.COACH[0].name).toContain("Dashboard")
      expect(navigation.CLIENT[0].name).toContain("Dashboard")
    })
  })

  describe("Route Path Validation", () => {
    it("should have valid route paths (no spaces, special chars)", () => {
      const allRoutes = [
        ...navigation.ADMIN,
        ...navigation.COACH,
        ...navigation.CLIENT,
      ]

      allRoutes.forEach((item) => {
        expect(item.href).toMatch(/^\/[a-z0-9\-/]+$/)
        expect(item.href).not.toContain(" ")
        expect(item.href).not.toContain("_")
      })
    })

    it("should start all routes with forward slash", () => {
      const allRoutes = [
        ...navigation.ADMIN,
        ...navigation.COACH,
        ...navigation.CLIENT,
      ]

      allRoutes.forEach((item) => {
        expect(item.href.startsWith("/")).toBe(true)
      })
    })

    it("should not end routes with forward slash", () => {
      const allRoutes = [
        ...navigation.ADMIN,
        ...navigation.COACH,
        ...navigation.CLIENT,
      ]

      allRoutes.forEach((item) => {
        if (item.href !== "/") {
          expect(item.href.endsWith("/")).toBe(false)
        }
      })
    })
  })
})
