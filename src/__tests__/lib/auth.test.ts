import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuthFn = vi.hoisted(() => vi.fn())

vi.mock("@/auth", () => ({
  auth: mockAuthFn,
}))

import { redirect } from "next/navigation"
import {
  getSession,
  getCurrentUser,
  requireAuth,
  requireRole,
  requireAdmin,
  requireCoach,
} from "@/lib/auth"

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getSession", () => {
    it("returns session when available", async () => {
      const mockSession = {
        user: { id: "1", name: "Test User", email: "test@example.com", role: "ADMIN" as const },
        expires: "2025-12-31",
      }
      mockAuthFn.mockResolvedValueOnce(mockSession)

      const result = await getSession()

      expect(result).toEqual(mockSession)
      expect(mockAuthFn).toHaveBeenCalledOnce()
    })

    it("returns null when no session", async () => {
      mockAuthFn.mockResolvedValueOnce(null)

      const result = await getSession()

      expect(result).toBeNull()
    })
  })

  describe("getCurrentUser", () => {
    it("returns user when session exists", async () => {
      const mockUser = { id: "1", name: "Test User", email: "test@example.com", role: "COACH" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await getCurrentUser()

      expect(result).toEqual(mockUser)
    })

    it("returns undefined when no session", async () => {
      mockAuthFn.mockResolvedValueOnce(null)

      const result = await getCurrentUser()

      expect(result).toBeUndefined()
    })

    it("returns undefined when session has no user", async () => {
      mockAuthFn.mockResolvedValueOnce({ expires: "2025-12-31" })

      const result = await getCurrentUser()

      expect(result).toBeUndefined()
    })
  })

  describe("requireAuth", () => {
    it("returns user when authenticated", async () => {
      const mockUser = { id: "1", name: "Test User", email: "test@example.com", role: "CLIENT" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await requireAuth()

      expect(result).toEqual(mockUser)
      expect(redirect).not.toHaveBeenCalled()
    })

    it("redirects to /login when no session", async () => {
      mockAuthFn.mockResolvedValueOnce(null)

      await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/login")
    })

    it("redirects to /login when session has no user", async () => {
      mockAuthFn.mockResolvedValueOnce({ expires: "2025-12-31" })

      await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/login")
    })
  })

  describe("requireRole", () => {
    it("returns user when role matches", async () => {
      const mockUser = { id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await requireRole(["ADMIN"])

      expect(result).toEqual(mockUser)
      expect(redirect).not.toHaveBeenCalled()
    })

    it("returns user when role is in allowed list", async () => {
      const mockUser = { id: "2", name: "Coach", email: "coach@example.com", role: "COACH" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await requireRole(["ADMIN", "COACH"])

      expect(result).toEqual(mockUser)
    })

    it("redirects to /dashboard when role not allowed", async () => {
      const mockUser = { id: "3", name: "Client", email: "client@example.com", role: "CLIENT" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      await expect(requireRole(["ADMIN", "COACH"])).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/dashboard")
    })

    it("redirects to /login when not authenticated", async () => {
      mockAuthFn.mockResolvedValueOnce(null)

      await expect(requireRole(["ADMIN"])).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/login")
    })
  })

  describe("requireAdmin", () => {
    it("allows ADMIN role", async () => {
      const mockUser = { id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await requireAdmin()

      expect(result).toEqual(mockUser)
    })

    it("redirects COACH role", async () => {
      const mockUser = { id: "2", name: "Coach", email: "coach@example.com", role: "COACH" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/dashboard")
    })

    it("redirects CLIENT role", async () => {
      const mockUser = { id: "3", name: "Client", email: "client@example.com", role: "CLIENT" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/dashboard")
    })
  })

  describe("requireCoach", () => {
    it("allows ADMIN role", async () => {
      const mockUser = { id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await requireCoach()

      expect(result).toEqual(mockUser)
    })

    it("allows COACH role", async () => {
      const mockUser = { id: "2", name: "Coach", email: "coach@example.com", role: "COACH" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      const result = await requireCoach()

      expect(result).toEqual(mockUser)
    })

    it("redirects CLIENT role", async () => {
      const mockUser = { id: "3", name: "Client", email: "client@example.com", role: "CLIENT" as const }
      mockAuthFn.mockResolvedValueOnce({ user: mockUser, expires: "2025-12-31" })

      await expect(requireCoach()).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/dashboard")
    })
  })
})
