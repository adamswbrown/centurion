import { describe, it, expect, vi, beforeEach } from "vitest"
vi.mock("@/lib/prisma")
import { mockPrisma } from "../mocks/prisma"
import {
  EMAIL_TEMPLATE_KEYS,
  previewEmailTemplate,
  renderEmailTemplate,
} from "@/lib/email-templates"

describe("EMAIL_TEMPLATE_KEYS", () => {
  it("has all expected keys", () => {
    const expectedKeys = [
      "WELCOME_CLIENT",
      "WELCOME_COACH",
      "PASSWORD_RESET",
      "COACH_INVITE",
      "COHORT_INVITE",
      "APPOINTMENT_CONFIRMATION",
      "APPOINTMENT_REMINDER",
      "APPOINTMENT_CANCELLED",
      "INVOICE_SENT",
      "INVOICE_PAID",
      "PAYMENT_REMINDER",
      "WEEKLY_QUESTIONNAIRE_REMINDER",
      "WEEKLY_REVIEW_READY",
      "COACH_NOTE_RECEIVED",
      "SESSION_WAITLIST_PROMOTED",
    ]

    expectedKeys.forEach((key) => {
      expect(EMAIL_TEMPLATE_KEYS).toHaveProperty(key)
    })
  })

  it("has 15 keys total", () => {
    expect(Object.keys(EMAIL_TEMPLATE_KEYS)).toHaveLength(15)
  })

  it("values are snake_case strings", () => {
    Object.values(EMAIL_TEMPLATE_KEYS).forEach((value) => {
      expect(value).toMatch(/^[a-z_]+$/)
    })
  })
})

describe("previewEmailTemplate", () => {
  it("substitutes whitelisted tokens in subject, body, text", () => {
    const result = previewEmailTemplate(
      "Hello {{userName}}",
      "<p>Welcome {{userName}} to {{appName}}</p>",
      "Welcome {{userName}} to {{appName}}",
      { userName: "John", appName: "Centurion" }
    )

    expect(result.subject).toBe("Hello John")
    expect(result.html).toBe("<p>Welcome John to Centurion</p>")
    expect(result.text).toBe("Welcome John to Centurion")
  })

  it("HTML-escapes values in body but not in subject or text", () => {
    const xssPayload = "<script>alert('xss')</script>"
    const result = previewEmailTemplate(
      "Subject: {{userName}}",
      "<p>Body: {{userName}}</p>",
      "Text: {{userName}}",
      { userName: xssPayload }
    )

    expect(result.subject).toBe(`Subject: ${xssPayload}`)
    expect(result.html).toBe(
      "<p>Body: &lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;</p>"
    )
    expect(result.text).toBe(`Text: ${xssPayload}`)
  })

  it("removes unsubstituted tokens", () => {
    const result = previewEmailTemplate(
      "Hello {{userName}} {{unknown}}",
      "<p>Welcome {{userName}} to {{missing}}</p>",
      "Text {{userName}} {{another}}",
      { userName: "Jane" }
    )

    expect(result.subject).toBe("Hello Jane ")
    expect(result.html).toBe("<p>Welcome Jane to </p>")
    expect(result.text).toBe("Text Jane ")
  })

  it("handles empty variables - removes all tokens", () => {
    const result = previewEmailTemplate(
      "Hello {{userName}}",
      "<p>{{coachName}}</p>",
      "{{loginUrl}}",
      {}
    )

    expect(result.subject).toBe("Hello ")
    expect(result.html).toBe("<p></p>")
    expect(result.text).toBe("")
  })

  it("escapes multiple special characters in HTML body", () => {
    const result = previewEmailTemplate(
      "Test",
      "<div>{{userName}}</div>",
      "Test",
      { userName: '<>&"\'' }
    )

    expect(result.html).toBe("<div>&lt;&gt;&amp;&quot;&#039;</div>")
  })

  it("handles tokens with spaces around name", () => {
    const result = previewEmailTemplate(
      "Hello {{ userName }}",
      "<p>{{ userName }}</p>",
      "{{ userName }}",
      { userName: "Test" }
    )

    expect(result.subject).toBe("Hello Test")
    expect(result.html).toBe("<p>Test</p>")
  })
})

describe("renderEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("falls back to default template when DB template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    const result = await renderEmailTemplate("welcome_client", {
      userName: "Test User",
      loginUrl: "https://example.com/login",
    })

    expect(result).toBeDefined()
    expect(result?.subject).toContain("Test User")
    expect(result?.html).toContain("Test User")
  })

  it("uses DB template when found and enabled", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue({
      subjectTemplate: "Custom subject {{userName}}",
      bodyTemplate: "<p>Custom body {{userName}}</p>",
      textTemplate: "Custom text {{userName}}",
      enabled: true,
    })

    const result = await renderEmailTemplate("welcome_client", {
      userName: "Jane",
    })

    expect(result?.subject).toBe("Custom subject Jane")
    expect(result?.html).toContain("Custom body Jane")
    expect(result?.text).toBe("Custom text Jane")
  })

  it("returns null for unknown template key not in defaults", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    const result = await renderEmailTemplate("nonexistent_key" as any, {})

    expect(result).toBeNull()
  })

  it("falls back to default when DB template is disabled", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue({
      subjectTemplate: "Custom reset",
      bodyTemplate: "<p>Custom</p>",
      textTemplate: "Custom",
      enabled: false,
    })

    const result = await renderEmailTemplate("password_reset", {
      userName: "John",
      resetUrl: "https://example.com/reset",
    })

    expect(result).toBeDefined()
    expect(result?.subject).not.toBe("Custom reset")
    expect(result?.subject).toContain("Password")
  })

  it("XSS protection in DB template rendering", async () => {
    const xssPayload = "<script>alert('xss')</script>"
    mockPrisma.emailTemplate.findUnique.mockResolvedValue({
      subjectTemplate: "Alert: {{userName}}",
      bodyTemplate: "<p>{{userName}}</p>",
      textTemplate: "{{userName}}",
      enabled: true,
    })

    const result = await renderEmailTemplate("welcome_client", {
      userName: xssPayload,
    })

    expect(result?.html).toBe(
      "<p>&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;</p>"
    )
    // Subject and text should NOT be escaped
    expect(result?.subject).toBe(`Alert: ${xssPayload}`)
    expect(result?.text).toBe(xssPayload)
  })

  it("returns null when DB lookup throws and key not in defaults", async () => {
    mockPrisma.emailTemplate.findUnique.mockRejectedValue(
      new Error("DB error")
    )

    const result = await renderEmailTemplate("nonexistent_key" as any, {})

    expect(result).toBeNull()
  })
})
