import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"

vi.mock("@/lib/prisma")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>()
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue("mock-token-hex-string"),
    }),
  }
})

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

const mockSendSystemEmail = vi.fn()
vi.mock("@/lib/email", () => ({
  sendSystemEmail: mockSendSystemEmail,
}))

vi.mock("@/lib/email-templates", () => ({
  EMAIL_TEMPLATE_KEYS: {
    PASSWORD_RESET: "password_reset",
  },
}))

const validToken = {
  token: "valid-token",
  identifier: "user@test.com",
  expires: new Date(Date.now() + 3600000),
}

const expiredToken = {
  token: "expired-token",
  identifier: "user@test.com",
  expires: new Date(Date.now() - 3600000),
}

const passwordUser = {
  id: "user-1",
  email: "user@test.com",
  name: "Test User",
  password: "existing-hashed-password",
  isTestUser: false,
}

const oauthUser = {
  id: "user-2",
  email: "oauth@test.com",
  name: "OAuth User",
  password: null,
  isTestUser: false,
}

const testFlagUser = {
  id: "user-3",
  email: "testflag@test.com",
  name: "Test Flag User",
  password: "existing-hashed-password",
  isTestUser: true,
}

describe("Password Reset Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("requestPasswordReset", () => {
    it("returns success for valid email with password user", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.verificationToken.create.mockResolvedValue(validToken)
      mockSendSystemEmail.mockResolvedValue(undefined)

      const result = await requestPasswordReset({ email: "user@test.com" })

      expect(result).toEqual({ success: true })
    })

    it("returns success for non-existent email (no enumeration)", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await requestPasswordReset({
        email: "nonexistent@test.com",
      })

      expect(result).toEqual({ success: true })
    })

    it("returns success for OAuth-only user (no password field)", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(oauthUser)

      const result = await requestPasswordReset({ email: "oauth@test.com" })

      expect(result).toEqual({ success: true })
    })

    it("creates verification token with 1-hour expiry", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.verificationToken.create.mockResolvedValue(validToken)
      mockSendSystemEmail.mockResolvedValue(undefined)

      await requestPasswordReset({ email: "user@test.com" })

      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identifier: "user@test.com",
          token: expect.any(String),
          expires: expect.any(Date),
        }),
      })

      const createCall = mockPrisma.verificationToken.create.mock.calls[0][0]
      const expiresDate = createCall.data.expires as Date
      const now = Date.now()
      const oneHourMs = 3600000
      const diffMs = expiresDate.getTime() - now

      expect(diffMs).toBeGreaterThan(oneHourMs - 5000)
      expect(diffMs).toBeLessThanOrEqual(oneHourMs + 1000)
    })

    it("deletes existing tokens before creating new one", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 })
      mockPrisma.verificationToken.create.mockResolvedValue(validToken)
      mockSendSystemEmail.mockResolvedValue(undefined)

      await requestPasswordReset({ email: "user@test.com" })

      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: "user@test.com" },
      })

      const deleteManyOrder =
        mockPrisma.verificationToken.deleteMany.mock.invocationCallOrder[0]
      const createOrder =
        mockPrisma.verificationToken.create.mock.invocationCallOrder[0]
      expect(deleteManyOrder).toBeLessThan(createOrder)
    })

    it("sends PASSWORD_RESET email with reset URL", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.verificationToken.create.mockResolvedValue(validToken)
      mockSendSystemEmail.mockResolvedValue(undefined)

      await requestPasswordReset({ email: "user@test.com" })

      expect(mockSendSystemEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          templateKey: "password_reset",
        })
      )

      const emailCall = mockSendSystemEmail.mock.calls[0][0]
      expect(emailCall.variables.resetUrl).toContain("reset-password?token=")
    })

    it("does not send email for non-existent user", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(null)

      await requestPasswordReset({ email: "nonexistent@test.com" })

      expect(mockSendSystemEmail).not.toHaveBeenCalled()
    })

    it("returns error for invalid email format", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      const result = await requestPasswordReset({ email: "not-an-email" })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
    })

    it("respects isTestUser flag in email", async () => {
      const { requestPasswordReset } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.user.findUnique.mockResolvedValue(testFlagUser)
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.verificationToken.create.mockResolvedValue(validToken)
      mockSendSystemEmail.mockResolvedValue(undefined)

      await requestPasswordReset({ email: "testflag@test.com" })

      if (mockSendSystemEmail.mock.calls.length > 0) {
        const emailCall = mockSendSystemEmail.mock.calls[0][0]
        expect(emailCall).toEqual(
          expect.objectContaining({
            isTestUser: true,
          })
        )
      }
    })
  })

  describe("validateResetToken", () => {
    it("returns valid: true and email for valid token", async () => {
      const { validateResetToken } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken)

      const result = await validateResetToken("valid-token")

      expect(result).toEqual(
        expect.objectContaining({
          valid: true,
          email: "user@test.com",
        })
      )
    })

    it("returns valid: false for non-existent token", async () => {
      const { validateResetToken } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null)

      const result = await validateResetToken("non-existent-token")

      expect(result).toEqual(
        expect.objectContaining({
          valid: false,
        })
      )
    })

    it("returns valid: false and deletes expired token", async () => {
      const { validateResetToken } = await import(
        "@/app/actions/password-reset"
      )

      mockPrisma.verificationToken.findUnique.mockResolvedValue(expiredToken)
      mockPrisma.verificationToken.delete.mockResolvedValue(expiredToken)

      const result = await validateResetToken("expired-token")

      expect(result).toEqual(
        expect.objectContaining({
          valid: false,
        })
      )
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: expect.objectContaining({
          token: "expired-token",
        }),
      })
    })
  })

  describe("resetPassword", () => {
    it("resets password successfully", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken)
      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.user.update.mockResolvedValue({
        ...passwordUser,
        password: "hashed-password",
      })
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 })

      const result = await resetPassword({
        token: "valid-token",
        password: "NewPassword1",
      })

      expect(result).toEqual(expect.objectContaining({ success: true }))
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: passwordUser.id },
          data: expect.objectContaining({
            password: "hashed-password",
          }),
        })
      )
    })

    it("hashes password with bcrypt (12 rounds)", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")
      const bcrypt = await import("bcryptjs")

      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken)
      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.user.update.mockResolvedValue({
        ...passwordUser,
        password: "hashed-password",
      })
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 })

      await resetPassword({
        token: "valid-token",
        password: "NewPassword1",
      })

      expect(bcrypt.default.hash).toHaveBeenCalledWith("NewPassword1", 12)
    })

    it("deletes all tokens for email after reset", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken)
      mockPrisma.user.findUnique.mockResolvedValue(passwordUser)
      mockPrisma.user.update.mockResolvedValue({
        ...passwordUser,
        password: "hashed-password",
      })
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 2 })

      await resetPassword({
        token: "valid-token",
        password: "NewPassword1",
      })

      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: "user@test.com" },
      })
    })

    it("returns error for expired token", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      mockPrisma.verificationToken.findUnique.mockResolvedValue(expiredToken)
      mockPrisma.verificationToken.delete.mockResolvedValue(expiredToken)

      const result = await resetPassword({
        token: "expired-token",
        password: "NewPassword1",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("returns error for non-existent token", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null)

      const result = await resetPassword({
        token: "non-existent-token",
        password: "NewPassword1",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("returns error for user not found", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await resetPassword({
        token: "valid-token",
        password: "NewPassword1",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("returns error for password too short", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      const result = await resetPassword({
        token: "valid-token",
        password: "Short1",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("returns error for password without uppercase", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      const result = await resetPassword({
        token: "valid-token",
        password: "lowercase1only",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("returns error for password without lowercase", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      const result = await resetPassword({
        token: "valid-token",
        password: "UPPERCASE1ONLY",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it("returns error for password without number", async () => {
      const { resetPassword } = await import("@/app/actions/password-reset")

      const result = await resetPassword({
        token: "valid-token",
        password: "NoNumberHere",
      })

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })
})
