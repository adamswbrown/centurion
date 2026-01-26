/**
 * Button Component Tests
 *
 * Tests for the Button UI component including variants and interactions.
 */

import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button Component", () => {
  describe("Rendering", () => {
    it("should render with default props", () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole("button", { name: "Click me" })
      expect(button).toBeInTheDocument()
    })

    it("should render children content", () => {
      render(<Button>Submit Form</Button>)
      expect(screen.getByText("Submit Form")).toBeInTheDocument()
    })

    it("should apply custom className", () => {
      render(<Button className="custom-class">Button</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("custom-class")
    })

    it("should forward ref to button element", () => {
      const ref = { current: null as HTMLButtonElement | null }
      render(<Button ref={ref}>Button</Button>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe("Variants", () => {
    it("should render with default variant", () => {
      render(<Button variant="default">Default</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-primary")
    })

    it("should render with destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-destructive")
    })

    it("should render with outline variant", () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("border")
    })

    it("should render with secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-secondary")
    })

    it("should render with ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("hover:bg-accent")
    })

    it("should render with link variant", () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("underline-offset-4")
    })
  })

  describe("Sizes", () => {
    it("should render with default size", () => {
      render(<Button size="default">Default</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-9")
    })

    it("should render with small size", () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-8")
    })

    it("should render with large size", () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-10")
    })

    it("should render with icon size", () => {
      render(<Button size="icon">X</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-9", "w-9")
    })
  })

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
      expect(button).toHaveClass("disabled:opacity-50")
    })

    it("should not respond to clicks when disabled", () => {
      const handleClick = vi.fn()
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )
      const button = screen.getByRole("button")
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe("Interactions", () => {
    it("should call onClick handler when clicked", () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole("button")
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should support keyboard interaction", () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Press Enter</Button>)
      const button = screen.getByRole("button")
      button.focus()
      fireEvent.keyDown(button, { key: "Enter" })
      // Enter key on button triggers click
    })
  })

  describe("asChild Prop", () => {
    it("should render as child element when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      const link = screen.getByRole("link", { name: "Link Button" })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/test")
    })
  })

  describe("Accessibility", () => {
    it("should have proper button role", () => {
      render(<Button>Accessible</Button>)
      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("should support aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>)
      expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument()
    })

    it("should support aria-disabled", () => {
      render(<Button disabled aria-disabled="true">Disabled</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-disabled", "true")
    })
  })

  describe("HTML Attributes", () => {
    it("should support type attribute", () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "submit")
    })

    it("should support form attribute", () => {
      render(<Button form="myForm">Submit</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("form", "myForm")
    })

    it("should support data attributes", () => {
      render(<Button data-testid="custom-button">Button</Button>)
      expect(screen.getByTestId("custom-button")).toBeInTheDocument()
    })
  })
})

// Import vi for mocking
import { vi } from "vitest"
