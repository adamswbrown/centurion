/**
 * ViewModeContext Tests
 *
 * Tests for the view mode context that allows ADMIN users
 * to switch between Admin and Coach navigation views.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ViewModeProvider, useViewMode } from "@/contexts/ViewModeContext"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Test component that exposes context values
function TestConsumer() {
  const { viewMode, setViewMode, canSwitch, effectiveNavRole } = useViewMode()
  return (
    <div>
      <span data-testid="view-mode">{viewMode}</span>
      <span data-testid="can-switch">{String(canSwitch)}</span>
      <span data-testid="effective-role">{effectiveNavRole}</span>
      <button onClick={() => setViewMode("coach")}>Switch to Coach</button>
      <button onClick={() => setViewMode("admin")}>Switch to Admin</button>
    </div>
  )
}

describe("ViewModeContext", () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe("ADMIN user", () => {
    it("should default to admin view mode", () => {
      render(
        <ViewModeProvider userRole="ADMIN">
          <TestConsumer />
        </ViewModeProvider>
      )
      expect(screen.getByTestId("view-mode")).toHaveTextContent("admin")
      expect(screen.getByTestId("effective-role")).toHaveTextContent("ADMIN")
    })

    it("should allow switching to coach view", () => {
      render(
        <ViewModeProvider userRole="ADMIN">
          <TestConsumer />
        </ViewModeProvider>
      )
      expect(screen.getByTestId("can-switch")).toHaveTextContent("true")
      fireEvent.click(screen.getByText("Switch to Coach"))
      expect(screen.getByTestId("view-mode")).toHaveTextContent("coach")
      expect(screen.getByTestId("effective-role")).toHaveTextContent("COACH")
    })

    it("should allow switching back to admin view", () => {
      render(
        <ViewModeProvider userRole="ADMIN">
          <TestConsumer />
        </ViewModeProvider>
      )
      fireEvent.click(screen.getByText("Switch to Coach"))
      expect(screen.getByTestId("effective-role")).toHaveTextContent("COACH")
      fireEvent.click(screen.getByText("Switch to Admin"))
      expect(screen.getByTestId("effective-role")).toHaveTextContent("ADMIN")
    })

    it("should persist view mode to localStorage", () => {
      render(
        <ViewModeProvider userRole="ADMIN">
          <TestConsumer />
        </ViewModeProvider>
      )
      fireEvent.click(screen.getByText("Switch to Coach"))
      expect(localStorageMock.setItem).toHaveBeenCalledWith("centurion-view-mode", "coach")
    })

    it("should restore view mode from localStorage", () => {
      localStorageMock.getItem.mockReturnValue("coach")
      render(
        <ViewModeProvider userRole="ADMIN">
          <TestConsumer />
        </ViewModeProvider>
      )
      expect(screen.getByTestId("view-mode")).toHaveTextContent("coach")
      expect(screen.getByTestId("effective-role")).toHaveTextContent("COACH")
    })

    it("should default to admin if localStorage has invalid value", () => {
      localStorageMock.getItem.mockReturnValue("invalid")
      render(
        <ViewModeProvider userRole="ADMIN">
          <TestConsumer />
        </ViewModeProvider>
      )
      expect(screen.getByTestId("view-mode")).toHaveTextContent("admin")
    })
  })

  describe("COACH user", () => {
    it("should not allow switching", () => {
      render(
        <ViewModeProvider userRole="COACH">
          <TestConsumer />
        </ViewModeProvider>
      )
      expect(screen.getByTestId("can-switch")).toHaveTextContent("false")
      expect(screen.getByTestId("effective-role")).toHaveTextContent("COACH")
    })

    it("should ignore setViewMode calls", () => {
      render(
        <ViewModeProvider userRole="COACH">
          <TestConsumer />
        </ViewModeProvider>
      )
      fireEvent.click(screen.getByText("Switch to Admin"))
      expect(screen.getByTestId("effective-role")).toHaveTextContent("COACH")
    })
  })

  describe("CLIENT user", () => {
    it("should not allow switching", () => {
      render(
        <ViewModeProvider userRole="CLIENT">
          <TestConsumer />
        </ViewModeProvider>
      )
      expect(screen.getByTestId("can-switch")).toHaveTextContent("false")
      expect(screen.getByTestId("effective-role")).toHaveTextContent("CLIENT")
    })
  })

  describe("useViewMode hook", () => {
    it("should throw when used outside provider", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
      expect(() => render(<TestConsumer />)).toThrow(
        "useViewMode must be used within a ViewModeProvider"
      )
      consoleError.mockRestore()
    })
  })
})
