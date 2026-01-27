"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit-log"
import {
  type EmailVariables,
  previewEmailTemplate as previewTemplate,
} from "@/lib/email-templates"

const updateTemplateSchema = z.object({
  id: z.number().int().positive(),
  subjectTemplate: z.string().min(1, "Subject is required"),
  bodyTemplate: z.string().min(1, "Body is required"),
  textTemplate: z.string().min(1, "Text version is required"),
  enabled: z.boolean().optional(),
})

const createTemplateSchema = z.object({
  key: z.string().min(1).regex(/^[a-z_]+$/, "Key must be lowercase letters and underscores only"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  subjectTemplate: z.string().min(1, "Subject is required"),
  bodyTemplate: z.string().min(1, "Body is required"),
  textTemplate: z.string().min(1, "Text version is required"),
  availableTokens: z.array(z.string()),
})

export async function getEmailTemplates() {
  await requireAdmin()

  return prisma.emailTemplate.findMany({
    orderBy: { name: "asc" },
  })
}

export async function getEmailTemplateById(id: number) {
  await requireAdmin()

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  })

  if (!template) {
    throw new Error("Email template not found")
  }

  return template
}

export async function getEmailTemplateByKey(key: string) {
  return prisma.emailTemplate.findUnique({
    where: { key },
  })
}

export async function updateEmailTemplate(
  input: z.infer<typeof updateTemplateSchema>
) {
  const session = await requireAdmin()

  const result = updateTemplateSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { id, subjectTemplate, bodyTemplate, textTemplate, enabled } = result.data

  const existing = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Email template not found")
  }

  const updated = await prisma.emailTemplate.update({
    where: { id },
    data: {
      subjectTemplate,
      bodyTemplate,
      textTemplate,
      ...(enabled !== undefined ? { enabled } : {}),
    },
  })

  const actorId = Number.parseInt(session.id, 10)
  await logAuditEvent({
    action: "UPDATE_EMAIL_TEMPLATE",
    actorId,
    targetId: id,
    targetType: "EmailTemplate",
    details: { key: existing.key, name: existing.name },
  })

  return updated
}

export async function toggleEmailTemplate(id: number, enabled: boolean) {
  const session = await requireAdmin()

  const existing = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Email template not found")
  }

  const updated = await prisma.emailTemplate.update({
    where: { id },
    data: { enabled },
  })

  const actorId = Number.parseInt(session.id, 10)
  await logAuditEvent({
    action: "TOGGLE_EMAIL_TEMPLATE",
    actorId,
    targetId: id,
    targetType: "EmailTemplate",
    details: { key: existing.key, enabled },
  })

  return updated
}

export async function createEmailTemplate(
  input: z.infer<typeof createTemplateSchema>
) {
  const session = await requireAdmin()

  const result = createTemplateSchema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.errors[0].message)
  }

  const { key, name, description, subjectTemplate, bodyTemplate, textTemplate, availableTokens } =
    result.data

  // Check for duplicate key
  const existing = await prisma.emailTemplate.findUnique({ where: { key } })
  if (existing) {
    throw new Error("An email template with this key already exists")
  }

  const template = await prisma.emailTemplate.create({
    data: {
      key,
      name,
      description: description || null,
      subjectTemplate,
      bodyTemplate,
      textTemplate,
      availableTokens,
      enabled: true,
      isSystem: false, // Admin-created templates are not system templates
    },
  })

  const actorId = Number.parseInt(session.id, 10)
  await logAuditEvent({
    action: "CREATE_EMAIL_TEMPLATE",
    actorId,
    targetId: template.id,
    targetType: "EmailTemplate",
    details: { key, name },
  })

  return template
}

export async function deleteEmailTemplate(id: number) {
  const session = await requireAdmin()

  const existing = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Email template not found")
  }

  if (existing.isSystem) {
    throw new Error("System templates cannot be deleted")
  }

  await prisma.emailTemplate.delete({ where: { id } })

  const actorId = Number.parseInt(session.id, 10)
  await logAuditEvent({
    action: "DELETE_EMAIL_TEMPLATE",
    actorId,
    targetId: id,
    targetType: "EmailTemplate",
    details: { key: existing.key, name: existing.name },
  })

  return { success: true }
}

export async function previewEmailTemplateById(id: number) {
  await requireAdmin()

  const template = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!template) {
    throw new Error("Email template not found")
  }

  const mockVariables: EmailVariables = {
    userName: "John Doe",
    userEmail: "john@example.com",
    coachName: "Coach Smith",
    coachEmail: "coach@example.com",
    cohortName: "Spring 2026 Bootcamp",
    loginUrl: "https://app.example.com/login",
    appName: "Centurion",
    clientName: "John Doe",
    weekNumber: "4",
    questionnaireUrl: "https://app.example.com/questionnaire",
    appointmentDate: "January 30, 2026",
    appointmentTime: "10:00 AM",
    appointmentLocation: "Main Gym",
    invoiceAmount: "$150.00",
    invoiceMonth: "January 2026",
    paymentUrl: "https://app.example.com/pay",
    loomUrl: "https://loom.com/share/example",
    resetUrl: "https://app.example.com/reset-password?token=abc123",
  }

  return previewTemplate(
    template.subjectTemplate,
    template.bodyTemplate,
    template.textTemplate,
    mockVariables
  )
}
