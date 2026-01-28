import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockPrisma } from "../mocks/prisma"
import {
  setupAuthMock,
  mockAdminUser,
  mockCoachUser,
  mockClientUser,
  mockAuth,
} from "../mocks/auth"

vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("@/lib/auth")
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/lib/email-templates", () => ({
  previewEmailTemplate: vi.fn().mockReturnValue({
    subject: "Preview Subject",
    html: "<p>Preview</p>",
    text: "Preview",
  }),
  EMAIL_TEMPLATE_KEYS: {},
}))

import {
  getEmailTemplates,
  getEmailTemplateById,
  getEmailTemplateByKey,
  updateEmailTemplate,
  toggleEmailTemplate,
  createEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplateById,
} from "@/app/actions/email-templates"
import { logAuditEvent } from "@/lib/audit-log"

const mockTemplate = {
  id: 1,
  key: "welcome_email",
  name: "Welcome Email",
  subjectTemplate: "Welcome {{name}}",
  bodyTemplate: "<p>Hello {{name}}</p>",
  textTemplate: "Hello {{name}}",
  availableTokens: ["name", "email"],
  enabled: true,
  isSystem: false,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
}

const mockSystemTemplate = {
  ...mockTemplate,
  id: 2,
  key: "password_reset",
  name: "Password Reset",
  isSystem: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  setupAuthMock(mockAdminUser)
})

// ---------------------------------------------------------------------------
// getEmailTemplates
// ---------------------------------------------------------------------------
describe("getEmailTemplates", () => {
  it("returns all templates sorted", async () => {
    mockPrisma.emailTemplate.findMany.mockResolvedValue([
      mockTemplate,
      mockSystemTemplate,
    ])

    const result = await getEmailTemplates()

    expect(result).toHaveLength(2)
    expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.anything(),
      })
    )
  })

  it("requires admin role", async () => {
    setupAuthMock(mockAdminUser)
    mockPrisma.emailTemplate.findMany.mockResolvedValue([])

    await expect(getEmailTemplates()).resolves.toBeDefined()
  })

  it("forbids client role", async () => {
    setupAuthMock(mockClientUser)

    await expect(getEmailTemplates()).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getEmailTemplateById
// ---------------------------------------------------------------------------
describe("getEmailTemplateById", () => {
  it("returns template by id", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)

    const result = await getEmailTemplateById(1)

    expect(result).toEqual(mockTemplate)
    expect(mockPrisma.emailTemplate.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    )
  })

  it("throws when template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    await expect(getEmailTemplateById(999)).rejects.toThrow(
      "Email template not found"
    )
  })

  it("requires admin role", async () => {
    setupAuthMock(mockClientUser)

    await expect(getEmailTemplateById(1)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getEmailTemplateByKey
// ---------------------------------------------------------------------------
describe("getEmailTemplateByKey", () => {
  it("returns template by key", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)

    const result = await getEmailTemplateByKey("welcome_email")

    expect(result).toEqual(mockTemplate)
    expect(mockPrisma.emailTemplate.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: "welcome_email" } })
    )
  })

  it("returns null when template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    const result = await getEmailTemplateByKey("nonexistent_key")

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateEmailTemplate
// ---------------------------------------------------------------------------
describe("updateEmailTemplate", () => {
  const updateInput = {
    id: 1,
    subjectTemplate: "Updated Subject {{name}}",
    bodyTemplate: "<p>Updated {{name}}</p>",
    textTemplate: "Updated {{name}}",
  }

  it("updates template successfully", async () => {
    const updatedTemplate = { ...mockTemplate, ...updateInput }
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)
    mockPrisma.emailTemplate.update.mockResolvedValue(updatedTemplate)

    const result = await updateEmailTemplate(updateInput)

    expect(result).toEqual(updatedTemplate)
    expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          subjectTemplate: updateInput.subjectTemplate,
          bodyTemplate: updateInput.bodyTemplate,
          textTemplate: updateInput.textTemplate,
        }),
      })
    )
  })

  it("throws when template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    await expect(updateEmailTemplate(updateInput)).rejects.toThrow()
  })

  it("throws on validation error with missing fields", async () => {
    await expect(
      updateEmailTemplate({ id: 1 } as any)
    ).rejects.toThrow()
  })

  it("requires admin role", async () => {
    setupAuthMock(mockClientUser)

    await expect(updateEmailTemplate(updateInput)).rejects.toThrow()
  })

  it("creates audit log entry", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)
    mockPrisma.emailTemplate.update.mockResolvedValue({
      ...mockTemplate,
      ...updateInput,
    })

    await updateEmailTemplate(updateInput)

    expect(logAuditEvent).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// toggleEmailTemplate
// ---------------------------------------------------------------------------
describe("toggleEmailTemplate", () => {
  it("enables a template", async () => {
    const disabledTemplate = { ...mockTemplate, enabled: false }
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(disabledTemplate)
    mockPrisma.emailTemplate.update.mockResolvedValue({
      ...disabledTemplate,
      enabled: true,
    })

    const result = await toggleEmailTemplate(1, true)

    expect(result.enabled).toBe(true)
    expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ enabled: true }),
      })
    )
  })

  it("disables a template", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)
    mockPrisma.emailTemplate.update.mockResolvedValue({
      ...mockTemplate,
      enabled: false,
    })

    const result = await toggleEmailTemplate(1, false)

    expect(result.enabled).toBe(false)
  })

  it("throws when template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    await expect(toggleEmailTemplate(999, true)).rejects.toThrow()
  })

  it("requires admin role", async () => {
    setupAuthMock(mockClientUser)

    await expect(toggleEmailTemplate(1, true)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// createEmailTemplate
// ---------------------------------------------------------------------------
describe("createEmailTemplate", () => {
  const createInput = {
    key: "new_template",
    name: "New Template",
    subjectTemplate: "Subject {{token}}",
    bodyTemplate: "<p>Body {{token}}</p>",
    textTemplate: "Body {{token}}",
    availableTokens: ["token"],
  }

  it("creates template successfully", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)
    mockPrisma.emailTemplate.create.mockResolvedValue({
      id: 3,
      ...createInput,
      enabled: true,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createEmailTemplate(createInput)

    expect(result.key).toBe("new_template")
    expect(result.isSystem).toBe(false)
    expect(mockPrisma.emailTemplate.create).toHaveBeenCalled()
  })

  it("throws on duplicate key", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)

    await expect(
      createEmailTemplate({ ...createInput, key: "welcome_email" })
    ).rejects.toThrow()
  })

  it("throws on invalid key format", async () => {
    await expect(
      createEmailTemplate({ ...createInput, key: "Invalid-Key!" })
    ).rejects.toThrow()
  })

  it("sets isSystem to false", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)
    mockPrisma.emailTemplate.create.mockResolvedValue({
      id: 3,
      ...createInput,
      enabled: true,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await createEmailTemplate(createInput)

    expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isSystem: false }),
      })
    )
  })

  it("requires admin role", async () => {
    setupAuthMock(mockClientUser)

    await expect(createEmailTemplate(createInput)).rejects.toThrow()
  })

  it("creates audit log entry", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)
    mockPrisma.emailTemplate.create.mockResolvedValue({
      id: 3,
      ...createInput,
      enabled: true,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await createEmailTemplate(createInput)

    expect(logAuditEvent).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deleteEmailTemplate
// ---------------------------------------------------------------------------
describe("deleteEmailTemplate", () => {
  it("deletes template successfully", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)
    mockPrisma.emailTemplate.delete.mockResolvedValue(mockTemplate)

    await deleteEmailTemplate(1)

    expect(mockPrisma.emailTemplate.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    )
  })

  it("throws when template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    await expect(deleteEmailTemplate(999)).rejects.toThrow()
  })

  it("throws when attempting to delete system template", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockSystemTemplate)

    await expect(deleteEmailTemplate(2)).rejects.toThrow()
  })

  it("requires admin role", async () => {
    setupAuthMock(mockClientUser)

    await expect(deleteEmailTemplate(1)).rejects.toThrow()
  })

  it("creates audit log entry", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)
    mockPrisma.emailTemplate.delete.mockResolvedValue(mockTemplate)

    await deleteEmailTemplate(1)

    expect(logAuditEvent).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// previewEmailTemplateById
// ---------------------------------------------------------------------------
describe("previewEmailTemplateById", () => {
  it("previews template with mock variables", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate)

    const result = await previewEmailTemplateById(1)

    expect(result).toEqual({
      subject: "Preview Subject",
      html: "<p>Preview</p>",
      text: "Preview",
    })
  })

  it("throws when template not found", async () => {
    mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

    await expect(previewEmailTemplateById(999)).rejects.toThrow()
  })
})
