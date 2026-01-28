/**
 * Accessibility Tests for Dashboard Components
 *
 * Uses jest-axe to test WCAG 2.1 Level AA compliance.
 * Tests loading states of key dashboard components for accessibility violations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render } from "@testing-library/react"
import { axe, toHaveNoViolations } from "jest-axe"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { OverviewCards } from "@/features/reports/OverviewCards"
import { SessionAttendanceAnalytics } from "@/features/reports/SessionAttendanceAnalytics"
import { MembershipAnalytics } from "@/features/reports/MembershipAnalytics"

// Extend Vitest expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// Mock hooks to return loading state
vi.mock("@/hooks/useReports", () => ({
  useDashboardOverview: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  })),
  useSessionAttendanceReport: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  })),
  useMembershipReport: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  })),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("Dashboard Components Accessibility - Loading States", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("OverviewCards", () => {
    it("should have no accessibility violations in loading state", async () => {
      const { container } = render(<OverviewCards />, {
        wrapper: createWrapper(),
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("SessionAttendanceAnalytics", () => {
    it("should have no accessibility violations in loading state", async () => {
      const { container } = render(<SessionAttendanceAnalytics />, {
        wrapper: createWrapper(),
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("MembershipAnalytics", () => {
    it("should have no accessibility violations in loading state", async () => {
      const { container } = render(<MembershipAnalytics />, {
        wrapper: createWrapper(),
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("Color Contrast Rules", () => {
    it("should pass color contrast checks for OverviewCards loading skeletons", async () => {
      const { container } = render(<OverviewCards />, {
        wrapper: createWrapper(),
      })

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      })

      expect(results).toHaveNoViolations()
    })

    it("should pass color contrast checks for SessionAttendanceAnalytics loading skeletons", async () => {
      const { container } = render(<SessionAttendanceAnalytics />, {
        wrapper: createWrapper(),
      })

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      })

      expect(results).toHaveNoViolations()
    })
  })

  describe("ARIA Labels and Semantic HTML", () => {
    it("should use proper semantic HTML in loading states", async () => {
      const { container } = render(<OverviewCards />, {
        wrapper: createWrapper(),
      })

      // Check for proper heading hierarchy and ARIA
      const results = await axe(container, {
        rules: {
          "heading-order": { enabled: true },
          "aria-valid-attr-value": { enabled: true },
          "list": { enabled: true },
        },
      })

      expect(results).toHaveNoViolations()
    })
  })

  describe("Keyboard Navigation", () => {
    it("should have focusable elements in proper order", async () => {
      const { container } = render(<SessionAttendanceAnalytics />, {
        wrapper: createWrapper(),
      })

      const results = await axe(container, {
        rules: {
          tabindex: { enabled: true },
          "focus-order-semantics": { enabled: true },
        },
      })

      expect(results).toHaveNoViolations()
    })
  })
})
