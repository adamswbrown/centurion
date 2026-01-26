/**
 * Auth Mock for Testing
 *
 * Provides mock session data and auth utilities for testing
 * server actions and components that require authentication.
 */

import { vi } from "vitest"
import type { Role } from "@prisma/client"

// Mock user types
export interface MockUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: Role
}

export interface MockSession {
  user: MockUser
  expires: string
}

// Default mock users for different roles
export const mockAdminUser: MockUser = {
  id: "1",
  email: "admin@test.com",
  name: "Admin User",
  image: null,
  role: "ADMIN",
}

export const mockCoachUser: MockUser = {
  id: "2",
  email: "coach@test.com",
  name: "Coach User",
  image: null,
  role: "COACH",
}

export const mockClientUser: MockUser = {
  id: "3",
  email: "client@test.com",
  name: "Client User",
  image: null,
  role: "CLIENT",
}

// Create a session from a user
export function createMockSession(user: MockUser): MockSession {
  return {
    user,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }
}

// Mock auth function
export const mockAuth = vi.fn()

// Mock require auth functions
export const mockRequireAuth = vi.fn()
export const mockRequireAdmin = vi.fn()
export const mockRequireCoach = vi.fn()
export const mockRequireRole = vi.fn()

// Setup auth mocks with a specific user
export function setupAuthMock(user: MockUser | null) {
  if (user) {
    const session = createMockSession(user)
    mockAuth.mockResolvedValue(session)
    mockRequireAuth.mockResolvedValue(user)

    if (user.role === "ADMIN") {
      mockRequireAdmin.mockResolvedValue(user)
      mockRequireCoach.mockResolvedValue(user)
    } else if (user.role === "COACH") {
      mockRequireAdmin.mockRejectedValue(new Error("Forbidden"))
      mockRequireCoach.mockResolvedValue(user)
    } else {
      mockRequireAdmin.mockRejectedValue(new Error("Forbidden"))
      mockRequireCoach.mockRejectedValue(new Error("Forbidden"))
    }
  } else {
    mockAuth.mockResolvedValue(null)
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"))
    mockRequireAdmin.mockRejectedValue(new Error("Unauthorized"))
    mockRequireCoach.mockRejectedValue(new Error("Unauthorized"))
  }
}

// Reset auth mocks
export function resetAuthMocks() {
  mockAuth.mockReset()
  mockRequireAuth.mockReset()
  mockRequireAdmin.mockReset()
  mockRequireCoach.mockReset()
  mockRequireRole.mockReset()
}

// Setup module mocks
vi.mock("@/auth", () => ({
  auth: mockAuth,
}))

vi.mock("@/lib/auth", () => ({
  getSession: mockAuth,
  getCurrentUser: vi.fn(() => mockAuth().then((s: MockSession | null) => s?.user)),
  requireAuth: mockRequireAuth,
  requireAdmin: mockRequireAdmin,
  requireCoach: mockRequireCoach,
  requireRole: mockRequireRole,
}))
