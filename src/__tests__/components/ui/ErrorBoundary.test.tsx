/**
 * ErrorBoundary Component Tests
 *
 * Tests for the ErrorBoundary component that catches React errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message")
  }
  return <div>No error</div>
}

// Suppress console.error during tests since we expect errors
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

describe("ErrorBoundary Component", () => {
  describe("Normal Rendering", () => {
    it("should render children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText("Child content")).toBeInTheDocument()
    })

    it("should render multiple children", () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      )

      expect(screen.getByText("First child")).toBeInTheDocument()
      expect(screen.getByText("Second child")).toBeInTheDocument()
    })

    it("should pass through child component normally", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText("No error")).toBeInTheDocument()
    })
  })

  describe("Error Handling", () => {
    it("should catch errors and display error message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Something went wrong.")).toBeInTheDocument()
      expect(screen.getByText("Test error message")).toBeInTheDocument()
    })

    it("should display error container with proper styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const errorContainer = screen.getByText("Something went wrong.").parentElement
      expect(errorContainer).toHaveClass("rounded-md", "border", "p-4")
    })

    it("should contain error details in pre element", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const preElement = screen.getByText("Test error message")
      expect(preElement.tagName).toBe("PRE")
      expect(preElement).toHaveClass("text-xs", "whitespace-pre-wrap")
    })
  })

  describe("Error State", () => {
    it("should update state when error occurs", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Error state shows error message instead of children
      expect(screen.queryByText("No error")).not.toBeInTheDocument()
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument()
    })
  })

  describe("Nested ErrorBoundaries", () => {
    it("should catch error at nearest boundary", () => {
      render(
        <ErrorBoundary>
          <div>Outer content</div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Outer content should still render
      expect(screen.getByText("Outer content")).toBeInTheDocument()
      // Inner error boundary catches the error
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument()
    })
  })

  describe("Error Types", () => {
    it("should handle Error objects", () => {
      const CustomError = () => {
        throw new Error("Custom error")
      }

      render(
        <ErrorBoundary>
          <CustomError />
        </ErrorBoundary>
      )

      expect(screen.getByText("Custom error")).toBeInTheDocument()
    })

    it("should handle TypeError", () => {
      const TypeErrorComponent = () => {
        throw new TypeError("Type error occurred")
      }

      render(
        <ErrorBoundary>
          <TypeErrorComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText("Type error occurred")).toBeInTheDocument()
    })
  })

  describe("Display Names", () => {
    it("ErrorBoundary should have displayName", () => {
      // Class components have name property
      expect(ErrorBoundary.name).toBe("ErrorBoundary")
    })
  })

  describe("Edge Cases", () => {
    it("should handle error with empty message", () => {
      const EmptyError = () => {
        throw new Error("")
      }

      render(
        <ErrorBoundary>
          <EmptyError />
        </ErrorBoundary>
      )

      expect(screen.getByText("Something went wrong.")).toBeInTheDocument()
    })

    it("should handle error with undefined message", () => {
      const UndefinedError = () => {
        throw new Error()
      }

      render(
        <ErrorBoundary>
          <UndefinedError />
        </ErrorBoundary>
      )

      expect(screen.getByText("Something went wrong.")).toBeInTheDocument()
    })

    it("should handle deeply nested error", () => {
      const DeepChild = () => {
        throw new Error("Deep error")
      }
      const Middle = () => <DeepChild />
      const Outer = () => <Middle />

      render(
        <ErrorBoundary>
          <Outer />
        </ErrorBoundary>
      )

      expect(screen.getByText("Deep error")).toBeInTheDocument()
    })
  })
})
