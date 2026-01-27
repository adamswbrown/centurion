"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { headers } from "next/headers"
import { logAuditEvent } from "@/lib/audit-log"
import type { Prisma } from "@prisma/client"

const acceptConsentSchema = z.object({
  termsAccepted: z.boolean().refine((v) => v === true, "Must accept terms"),
  privacyAccepted: z.boolean().refine((v) => v === true, "Must accept privacy policy"),
  dataProcessing: z.boolean().refine((v) => v === true, "Must accept data processing agreement"),
  marketing: z.boolean().optional(),
})

const DEFAULT_CONSENT_VERSION = "1.0.0"

export async function getUserConsent() {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const consent = await prisma.userConsent.findUnique({
    where: { userId },
  })

  return consent
}

export async function acceptConsent(input: z.infer<typeof acceptConsentSchema>) {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const result = acceptConsentSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  // Get IP and User-Agent from headers
  const headersList = await headers()
  const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
  const userAgent = headersList.get("user-agent") || "unknown"

  // Get current consent version from SystemSettings
  const versionSetting = await prisma.systemSettings.findUnique({
    where: { key: "consentVersion" },
  })
  const version = versionSetting
    ? String(versionSetting.value)
    : DEFAULT_CONSENT_VERSION

  const now = new Date()

  await prisma.userConsent.upsert({
    where: { userId },
    update: {
      termsAccepted: now,
      privacyAccepted: now,
      dataProcessing: now,
      marketing: result.data.marketing ? now : null,
      version,
      ipAddress,
      userAgent,
    },
    create: {
      userId,
      termsAccepted: now,
      privacyAccepted: now,
      dataProcessing: now,
      marketing: result.data.marketing ? now : null,
      version,
      ipAddress,
      userAgent,
    },
  })

  await logAuditEvent({
    action: "ACCEPT_CONSENT",
    actorId: userId,
    targetId: userId,
    targetType: "UserConsent",
    details: {
      version,
      marketing: !!result.data.marketing,
    },
  })

  return { success: true }
}

export async function hasValidConsent() {
  const session = await requireAuth()
  const userId = Number.parseInt(session.id, 10)

  const consent = await prisma.userConsent.findUnique({
    where: { userId },
  })

  if (!consent) {
    return { valid: false, needsUpdate: false }
  }

  // Check if consent version matches current system version
  const versionSetting = await prisma.systemSettings.findUnique({
    where: { key: "consentVersion" },
  })
  const currentVersion = versionSetting
    ? String(versionSetting.value)
    : DEFAULT_CONSENT_VERSION

  if (consent.version !== currentVersion) {
    return { valid: false, needsUpdate: true }
  }

  return { valid: true, needsUpdate: false }
}

export async function getLegalContent() {
  const keys = ["termsContentHtml", "privacyContentHtml", "dataProcessingContentHtml", "consentVersion"]

  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: keys } },
  })

  const result: Record<string, string> = {}
  for (const setting of settings) {
    result[setting.key] = String(setting.value)
  }

  return {
    terms: result.termsContentHtml || getDefaultTerms(),
    privacy: result.privacyContentHtml || getDefaultPrivacy(),
    dataProcessing: result.dataProcessingContentHtml || getDefaultDataProcessing(),
    version: result.consentVersion || DEFAULT_CONSENT_VERSION,
  }
}

export async function updateLegalContent(input: { key: string; html: string }) {
  await requireAdmin()

  const session = await requireAuth()
  const actorId = Number.parseInt(session.id, 10)

  const allowedKeys = ["termsContentHtml", "privacyContentHtml", "dataProcessingContentHtml"]
  if (!allowedKeys.includes(input.key)) {
    return { error: "Invalid content key" }
  }

  const jsonValue = input.html as unknown as Prisma.InputJsonValue
  await prisma.systemSettings.upsert({
    where: { key: input.key },
    update: { value: jsonValue },
    create: { key: input.key, value: jsonValue },
  })

  await logAuditEvent({
    action: "UPDATE_LEGAL_CONTENT",
    actorId,
    targetType: "SystemSettings",
    details: { key: input.key },
  })

  return { success: true }
}

// Default legal content (placeholder)
function getDefaultTerms(): string {
  return `
    <h2>Terms of Service</h2>
    <p>Last updated: ${new Date().toLocaleDateString()}</p>
    <p>Welcome to Centurion. By using our platform, you agree to these terms of service.</p>
    <h3>1. Use of Service</h3>
    <p>Centurion provides a fitness coaching and personal training platform. You must be at least 18 years old to use this service.</p>
    <h3>2. Account Responsibilities</h3>
    <p>You are responsible for maintaining the security of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
    <h3>3. Data and Privacy</h3>
    <p>Your use of Centurion is also governed by our Privacy Policy. Please review our Privacy Policy for information on how we collect, use, and share your data.</p>
    <h3>4. Termination</h3>
    <p>You may terminate your account at any time through the account settings. We reserve the right to terminate accounts that violate these terms.</p>
    <p>For questions about these terms, please contact your administrator.</p>
  `
}

function getDefaultPrivacy(): string {
  return `
    <h2>Privacy Policy</h2>
    <p>Last updated: ${new Date().toLocaleDateString()}</p>
    <p>Centurion is committed to protecting your privacy. This policy explains how we handle your personal data.</p>
    <h3>1. Data We Collect</h3>
    <p>We collect information you provide directly: name, email, health entries, workout data, sleep records, and questionnaire responses.</p>
    <h3>2. How We Use Your Data</h3>
    <p>Your data is used to provide fitness coaching services, track your progress, and enable communication with your coach.</p>
    <h3>3. Data Sharing</h3>
    <p>Your data is shared only with your assigned coaches and administrators. We do not sell your data to third parties.</p>
    <h3>4. Your Rights</h3>
    <p>You can export all your data or delete your account at any time through your account settings.</p>
    <h3>5. Data Security</h3>
    <p>We use industry-standard security measures to protect your data, including encryption in transit and at rest.</p>
    <p>For privacy inquiries, please contact your administrator.</p>
  `
}

function getDefaultDataProcessing(): string {
  return `
    <h2>Data Processing Agreement</h2>
    <p>Last updated: ${new Date().toLocaleDateString()}</p>
    <p>This agreement governs how Centurion processes your personal data in accordance with applicable data protection laws.</p>
    <h3>1. Purpose of Processing</h3>
    <p>We process your personal data to provide fitness coaching and personal training services, including tracking health metrics, managing appointments, and facilitating coach-client communication.</p>
    <h3>2. Categories of Data</h3>
    <p>Health and fitness data (weight, steps, sleep, workouts), personal identifiers (name, email), and communication records (coach notes, questionnaire responses).</p>
    <h3>3. Retention Period</h3>
    <p>Your data is retained for as long as your account is active. Upon account deletion, all data is permanently removed.</p>
    <h3>4. Your Rights</h3>
    <p>You have the right to access, export, rectify, and delete your personal data at any time.</p>
    <p>For questions about data processing, please contact your administrator.</p>
  `
}
