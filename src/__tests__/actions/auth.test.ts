/**
 * Auth Server Actions Tests
 *
 * Tests for authentication-related server actions including
 * user registration, credentials sign-in, and OAuth sign-in.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Setup mocks - all inline to avoid hoisting issues
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
}))

vi.mock("next-auth", () => {
  class MockAuthError extends Error {
    type: string
    constructor(type: string) {
      super(type)
      this.type = type
      this.name = "AuthError"
    }
  }

  return {
    AuthError: MockAuthError,
  }
})

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}))

// Import modules after mocks are set up
import { prisma } from "@/lib/prisma"
import { signIn } from "@/auth"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"

// Now import the functions to test
import {
  registerUser,
  signInWithCredentials,
  signInWithGoogle,
  signInWithApple,
} from "@/app/actions/auth"

// Get typed mocked versions after imports
const mockSignInFn = vi.mocked(signIn)
const mockHashFn = vi.mocked(bcrypt.hash)
const mockPrismaUser = vi.mocked(prisma.user)

// Helper function to create FormData
function createFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(data).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe("Auth Server Actions", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Default mock for bcrypt hash
    mockHashFn.mockResolvedValue("hashed_password")

    // Default mock for signIn - successful
    mockSignInFn.mockResolvedValue(undefined)
  })

  describe("registerUser", () => {
    it("should register user successfully", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
      })

      // Mock no existing user
      mockPrismaUser.findUnique.mockResolvedValue(null)

      // Mock user creation
      mockPrismaUser.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        password: "hashed_password",
        role: "CLIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
        isTestUser: false,
      })

      const result = await registerUser(formData)

      expect(result).toEqual({ success: true })
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      })
      expect(mockHashFn).toHaveBeenCalledWith("Password123", 12)
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          email: "john@example.com",
          password: "hashed_password",
          role: "CLIENT",
        },
      })
      expect(mockSignInFn).toHaveBeenCalledWith("credentials", {
        email: "john@example.com",
        password: "Password123",
        redirect: false,
      })
    })

    it("should return error for duplicate email", async () => {
      const formData = createFormData({
        name: "Jane Doe",
        email: "existing@example.com",
        password: "Password123",
      })

      // Mock existing user
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 2,
        name: "Existing User",
        email: "existing@example.com",
        password: "some_hash",
        role: "CLIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
        isTestUser: false,
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "User with this email already exists",
      })
      expect(mockPrismaUser.create).not.toHaveBeenCalled()
      expect(mockSignInFn).not.toHaveBeenCalled()
    })

    it("should validate name is at least 2 characters", async () => {
      const formData = createFormData({
        name: "J",
        email: "john@example.com",
        password: "Password123",
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Name must be at least 2 characters",
      })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it("should validate email format", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "invalid-email",
        password: "Password123",
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Invalid email address",
      })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it("should validate password is at least 8 characters", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "Pass1",
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Password must be at least 8 characters",
      })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it("should validate password contains uppercase letter", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Password must contain at least one uppercase letter",
      })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it("should validate password contains lowercase letter", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "PASSWORD123",
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Password must contain at least one lowercase letter",
      })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it("should validate password contains number", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "PasswordABC",
      })

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Password must contain at least one number",
      })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it("should hash password with 12 rounds", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
      })

      mockPrismaUser.findUnique.mockResolvedValue(null)
      mockPrismaUser.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        password: "hashed_password",
        role: "CLIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
        isTestUser: false,
      })

      await registerUser(formData)

      expect(mockHashFn).toHaveBeenCalledWith("Password123", 12)
    })

    it("should create user with CLIENT role", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
      })

      mockPrismaUser.findUnique.mockResolvedValue(null)
      mockPrismaUser.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        password: "hashed_password",
        role: "CLIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
        isTestUser: false,
      })

      await registerUser(formData)

      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          email: "john@example.com",
          password: "hashed_password",
          role: "CLIENT",
        },
      })
    })

    it("should auto-sign in after successful registration", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
      })

      mockPrismaUser.findUnique.mockResolvedValue(null)
      mockPrismaUser.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        password: "hashed_password",
        role: "CLIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
        isTestUser: false,
      })

      await registerUser(formData)

      expect(mockSignInFn).toHaveBeenCalledWith("credentials", {
        email: "john@example.com",
        password: "Password123",
        redirect: false,
      })
    })

    it("should return error if sign-in fails after registration", async () => {
      const formData = createFormData({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
      })

      mockPrismaUser.findUnique.mockResolvedValue(null)
      mockPrismaUser.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        password: "hashed_password",
        role: "CLIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
        isTestUser: false,
      })

      // Mock signIn to throw AuthError
      const error = new AuthError("CredentialsSignin")
      error.type = "CredentialsSignin"
      mockSignInFn.mockRejectedValue(error)

      const result = await registerUser(formData)

      expect(result).toEqual({
        error: "Failed to sign in after registration",
      })
    })
  })

  describe("signInWithCredentials", () => {
    it("should sign in successfully", async () => {
      const formData = createFormData({
        email: "user@example.com",
        password: "Password123",
      })

      mockSignInFn.mockResolvedValue(undefined)

      const result = await signInWithCredentials(formData)

      expect(result).toEqual({ success: true })
      expect(mockSignInFn).toHaveBeenCalledWith("credentials", {
        email: "user@example.com",
        password: "Password123",
        redirectTo: "/dashboard",
      })
    })

    it("should return error for invalid credentials (CredentialsSignin)", async () => {
      const formData = createFormData({
        email: "user@example.com",
        password: "WrongPassword",
      })

      const error = new AuthError("CredentialsSignin")
      error.type = "CredentialsSignin"
      mockSignInFn.mockRejectedValue(error)

      const result = await signInWithCredentials(formData)

      expect(result).toEqual({ error: "Invalid email or password" })
    })

    it("should return generic error for other AuthError types", async () => {
      const formData = createFormData({
        email: "user@example.com",
        password: "Password123",
      })

      const error = new AuthError("OAuthAccountNotLinked")
      error.type = "OAuthAccountNotLinked"
      mockSignInFn.mockRejectedValue(error)

      const result = await signInWithCredentials(formData)

      expect(result).toEqual({ error: "Something went wrong" })
    })

    it("should rethrow non-AuthError errors", async () => {
      const formData = createFormData({
        email: "user@example.com",
        password: "Password123",
      })

      const genericError = new Error("Network error")
      mockSignInFn.mockRejectedValue(genericError)

      await expect(signInWithCredentials(formData)).rejects.toThrow(
        "Network error"
      )
    })
  })

  describe("signInWithGoogle", () => {
    it("should call signIn with google provider", async () => {
      await signInWithGoogle()

      expect(mockSignInFn).toHaveBeenCalledWith("google", {
        redirectTo: "/dashboard",
      })
    })
  })

  describe("signInWithApple", () => {
    it("should call signIn with apple provider", async () => {
      await signInWithApple()

      expect(mockSignInFn).toHaveBeenCalledWith("apple", {
        redirectTo: "/dashboard",
      })
    })
  })
})
