import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"
import type { SendEmailOptions, SendSystemEmailOptions } from "@/lib/email"

// Mock Resend module
const mockSend = vi.fn()
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

// Mock email templates module
const mockRenderEmailTemplate = vi.fn()
vi.mock("@/lib/email-templates", () => ({
  renderEmailTemplate: mockRenderEmailTemplate,
}))

const originalEnv = process.env

describe("sendTransactionalEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = "test-key"
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("should suppress email for test users", async () => {
    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
      text: "Test content",
      isTestUser: true,
    }

    const result = await sendTransactionalEmail(options)

    expect(result.success).toBe(true)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("should log test email preview when suppressing", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
      text: "Test content with a long message that should be truncated in the preview when it exceeds 200 characters. This is a very long message that keeps going and going to ensure we test the substring logic properly. It needs to be longer than 200 characters to trigger the ellipsis.",
      isTestUser: true,
    }

    await sendTransactionalEmail(options)

    expect(consoleSpy).toHaveBeenCalledWith(
      "[TEST EMAIL - Not sent]",
      expect.objectContaining({
        to: "test@example.com",
        subject: "Test Email",
        preview: expect.stringContaining("..."),
      })
    )

    consoleSpy.mockRestore()
  })

  it("should gracefully handle missing RESEND_API_KEY", async () => {
    delete process.env.RESEND_API_KEY
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Test content</p>",
      text: "Test content",
      isTestUser: false,
    }

    const result = await sendTransactionalEmail(options)

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      "RESEND_API_KEY not configured. Email not sent:",
      expect.objectContaining({ to: "test@example.com", subject: "Test Email" })
    )
    expect(mockSend).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it("should successfully send email with valid configuration", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "email-123" }, error: null })

    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "user@example.com",
      subject: "Welcome",
      html: "<p>Welcome to Centurion</p>",
      text: "Welcome to Centurion",
      isTestUser: false,
    }

    const result = await sendTransactionalEmail(options)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(mockSend).toHaveBeenCalledWith({
      from: "Centurion <onboarding@resend.dev>",
      to: "user@example.com",
      subject: "Welcome",
      html: "<p>Welcome to Centurion</p>",
      text: "Welcome to Centurion",
    })
  })

  it("should handle Resend API errors", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid email address" },
    })

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "invalid-email",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
      isTestUser: false,
    }

    const result = await sendTransactionalEmail(options)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Invalid email address")
    expect(consoleSpy).toHaveBeenCalledWith("Resend API error:", expect.any(Object))

    consoleSpy.mockRestore()
  })

  it("should handle exceptions during send", async () => {
    mockSend.mockRejectedValueOnce(new Error("Network error"))

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "user@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
      isTestUser: false,
    }

    const result = await sendTransactionalEmail(options)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Network error")
    expect(consoleSpy).toHaveBeenCalledWith("Error sending email:", expect.any(Error))

    consoleSpy.mockRestore()
  })

  it("should handle non-Error exceptions", async () => {
    mockSend.mockRejectedValueOnce("String error")

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendTransactionalEmail } = await import("@/lib/email")

    const options: SendEmailOptions = {
      to: "user@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
      isTestUser: false,
    }

    const result = await sendTransactionalEmail(options)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Failed to send email")

    consoleSpy.mockRestore()
  })
})

describe("sendSystemEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = "test-key"
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("should use rendered template when available", async () => {
    mockRenderEmailTemplate.mockResolvedValueOnce({
      subject: "Welcome to Centurion",
      html: "<p>Welcome HTML</p>",
      text: "Welcome text",
    })
    mockSend.mockResolvedValueOnce({ data: { id: "email-123" }, error: null })

    const { sendSystemEmail } = await import("@/lib/email")

    const options: SendSystemEmailOptions = {
      templateKey: "welcome" as any,
      to: "user@example.com",
      variables: { name: "John" },
      isTestUser: false,
    }

    const result = await sendSystemEmail(options)

    expect(result.success).toBe(true)
    expect(mockRenderEmailTemplate).toHaveBeenCalledWith("welcome", { name: "John" })
    expect(mockSend).toHaveBeenCalledWith({
      from: "Centurion <onboarding@resend.dev>",
      to: "user@example.com",
      subject: "Welcome to Centurion",
      html: "<p>Welcome HTML</p>",
      text: "Welcome text",
    })
  })

  it("should fall back to provided fallback content", async () => {
    mockRenderEmailTemplate.mockResolvedValueOnce(null)
    mockSend.mockResolvedValueOnce({ data: { id: "email-123" }, error: null })

    const { sendSystemEmail } = await import("@/lib/email")

    const options: SendSystemEmailOptions = {
      templateKey: "nonexistent" as any,
      to: "user@example.com",
      variables: {},
      isTestUser: false,
      fallbackSubject: "Fallback Subject",
      fallbackHtml: "<p>Fallback HTML</p>",
      fallbackText: "Fallback text",
    }

    const result = await sendSystemEmail(options)

    expect(result.success).toBe(true)
    expect(mockSend).toHaveBeenCalledWith({
      from: "Centurion <onboarding@resend.dev>",
      to: "user@example.com",
      subject: "Fallback Subject",
      html: "<p>Fallback HTML</p>",
      text: "Fallback text",
    })
  })

  it("should return error when no template and no fallback", async () => {
    mockRenderEmailTemplate.mockResolvedValueOnce(null)

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendSystemEmail } = await import("@/lib/email")

    const options: SendSystemEmailOptions = {
      templateKey: "nonexistent" as any,
      to: "user@example.com",
      variables: {},
      isTestUser: false,
    }

    const result = await sendSystemEmail(options)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Email template not available")
    expect(consoleSpy).toHaveBeenCalledWith(
      "Template nonexistent not found and no fallback provided"
    )

    consoleSpy.mockRestore()
  })

  it("should handle renderEmailTemplate throwing", async () => {
    mockRenderEmailTemplate.mockRejectedValueOnce(new Error("Template render error"))

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendSystemEmail } = await import("@/lib/email")

    const options: SendSystemEmailOptions = {
      templateKey: "broken" as any,
      to: "user@example.com",
      variables: {},
      isTestUser: false,
    }

    const result = await sendSystemEmail(options)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Template render error")
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error sending system email broken:",
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it("should suppress email for test users even with valid template", async () => {
    mockRenderEmailTemplate.mockResolvedValueOnce({
      subject: "Test Subject",
      html: "<p>Test HTML</p>",
      text: "Test text",
    })

    const { sendSystemEmail } = await import("@/lib/email")

    const options: SendSystemEmailOptions = {
      templateKey: "welcome" as any,
      to: "test@example.com",
      variables: {},
      isTestUser: true,
    }

    const result = await sendSystemEmail(options)

    expect(result.success).toBe(true)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("should handle non-Error exceptions in sendSystemEmail", async () => {
    mockRenderEmailTemplate.mockRejectedValueOnce("String error")

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { sendSystemEmail } = await import("@/lib/email")

    const options: SendSystemEmailOptions = {
      templateKey: "broken" as any,
      to: "user@example.com",
      variables: {},
      isTestUser: false,
    }

    const result = await sendSystemEmail(options)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Failed to send email")

    consoleSpy.mockRestore()
  })
})
