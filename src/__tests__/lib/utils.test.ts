/**
 * Utils Library Tests
 *
 * Tests for the general utility functions.
 */

import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("Utils Library", () => {
  describe("cn (classNames)", () => {
    it("should merge single class", () => {
      expect(cn("bg-red-500")).toBe("bg-red-500")
    })

    it("should merge multiple classes", () => {
      expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white")
    })

    it("should handle conditional classes", () => {
      const isActive = true
      const isDisabled = false

      expect(cn("btn", isActive && "btn-active", isDisabled && "btn-disabled")).toBe("btn btn-active")
    })

    it("should merge conflicting Tailwind classes", () => {
      // tailwind-merge should resolve conflicts
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500")
      expect(cn("p-4", "p-2")).toBe("p-2")
    })

    it("should handle arrays of classes", () => {
      expect(cn(["bg-red-500", "text-white"])).toBe("bg-red-500 text-white")
    })

    it("should handle object notation", () => {
      expect(cn({ "bg-red-500": true, "text-white": true, "hidden": false })).toBe("bg-red-500 text-white")
    })

    it("should handle undefined and null values", () => {
      expect(cn("bg-red-500", undefined, null, "text-white")).toBe("bg-red-500 text-white")
    })

    it("should handle empty strings", () => {
      expect(cn("bg-red-500", "", "text-white")).toBe("bg-red-500 text-white")
    })

    it("should handle complex Tailwind class merging", () => {
      // More complex merging scenarios
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
      expect(cn("text-sm text-gray-500", "text-lg")).toBe("text-gray-500 text-lg")
    })
  })
})
