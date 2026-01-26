/**
 * Card Component Tests
 *
 * Tests for the Card UI component and its subcomponents.
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

describe("Card Component", () => {
  describe("Card", () => {
    it("should render children", () => {
      render(<Card>Card content</Card>)
      expect(screen.getByText("Card content")).toBeInTheDocument()
    })

    it("should apply default styles", () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("rounded-xl", "border", "bg-card", "shadow")
    })

    it("should apply custom className", () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      )
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("custom-class")
    })

    it("should forward ref", () => {
      const ref = { current: null as HTMLDivElement | null }
      render(<Card ref={ref}>Content</Card>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it("should pass through HTML attributes", () => {
      render(
        <Card data-testid="card" id="myCard" role="article">
          Content
        </Card>
      )
      const card = screen.getByTestId("card")
      expect(card).toHaveAttribute("id", "myCard")
      expect(card).toHaveAttribute("role", "article")
    })
  })

  describe("CardHeader", () => {
    it("should render children", () => {
      render(<CardHeader>Header content</CardHeader>)
      expect(screen.getByText("Header content")).toBeInTheDocument()
    })

    it("should apply default styles", () => {
      render(<CardHeader data-testid="header">Content</CardHeader>)
      const header = screen.getByTestId("header")
      expect(header).toHaveClass("flex", "flex-col", "p-6")
    })

    it("should apply custom className", () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Content
        </CardHeader>
      )
      const header = screen.getByTestId("header")
      expect(header).toHaveClass("custom-header")
    })
  })

  describe("CardTitle", () => {
    it("should render children", () => {
      render(<CardTitle>Card Title</CardTitle>)
      expect(screen.getByText("Card Title")).toBeInTheDocument()
    })

    it("should apply font styling", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId("title")
      expect(title).toHaveClass("font-semibold", "leading-none")
    })

    it("should apply custom className", () => {
      render(
        <CardTitle className="text-2xl" data-testid="title">
          Title
        </CardTitle>
      )
      const title = screen.getByTestId("title")
      expect(title).toHaveClass("text-2xl")
    })
  })

  describe("CardDescription", () => {
    it("should render children", () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText("Description text")).toBeInTheDocument()
    })

    it("should apply muted text styling", () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>)
      const desc = screen.getByTestId("desc")
      expect(desc).toHaveClass("text-sm", "text-muted-foreground")
    })

    it("should apply custom className", () => {
      render(
        <CardDescription className="italic" data-testid="desc">
          Description
        </CardDescription>
      )
      const desc = screen.getByTestId("desc")
      expect(desc).toHaveClass("italic")
    })
  })

  describe("CardContent", () => {
    it("should render children", () => {
      render(<CardContent>Main content</CardContent>)
      expect(screen.getByText("Main content")).toBeInTheDocument()
    })

    it("should apply padding styles", () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId("content")
      expect(content).toHaveClass("p-6", "pt-0")
    })

    it("should apply custom className", () => {
      render(
        <CardContent className="bg-gray-50" data-testid="content">
          Content
        </CardContent>
      )
      const content = screen.getByTestId("content")
      expect(content).toHaveClass("bg-gray-50")
    })
  })

  describe("CardFooter", () => {
    it("should render children", () => {
      render(<CardFooter>Footer content</CardFooter>)
      expect(screen.getByText("Footer content")).toBeInTheDocument()
    })

    it("should apply flex and padding styles", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId("footer")
      expect(footer).toHaveClass("flex", "items-center", "p-6", "pt-0")
    })

    it("should apply custom className", () => {
      render(
        <CardFooter className="justify-end" data-testid="footer">
          Footer
        </CardFooter>
      )
      const footer = screen.getByTestId("footer")
      expect(footer).toHaveClass("justify-end")
    })
  })

  describe("Full Card Composition", () => {
    it("should render complete card with all subcomponents", () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText("Card Title")).toBeInTheDocument()
      expect(screen.getByText("Card description text")).toBeInTheDocument()
      expect(screen.getByText("This is the main content of the card.")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
    })

    it("should maintain proper document structure", () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      )

      const card = container.firstChild as HTMLElement
      expect(card.children).toHaveLength(3)
    })
  })

  describe("Accessibility", () => {
    it("should support semantic HTML attributes", () => {
      render(
        <Card role="region" aria-label="User profile">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>User information</CardContent>
        </Card>
      )

      expect(screen.getByRole("region", { name: "User profile" })).toBeInTheDocument()
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument()
    })
  })
})
