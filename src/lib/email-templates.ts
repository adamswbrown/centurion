// Email template keys for Centurion
export const EMAIL_TEMPLATE_KEYS = {
  // User management
  WELCOME_CLIENT: "welcome_client",
  WELCOME_COACH: "welcome_coach",
  PASSWORD_RESET: "password_reset",

  // Invitations
  COACH_INVITE: "coach_invite",
  COHORT_INVITE: "cohort_invite",

  // Appointments (from PTP)
  APPOINTMENT_CONFIRMATION: "appointment_confirmation",
  APPOINTMENT_REMINDER: "appointment_reminder",
  APPOINTMENT_CANCELLED: "appointment_cancelled",

  // Invoicing
  INVOICE_SENT: "invoice_sent",
  INVOICE_PAID: "invoice_paid",
  PAYMENT_REMINDER: "payment_reminder",

  // Health coaching
  WEEKLY_QUESTIONNAIRE_REMINDER: "weekly_questionnaire_reminder",
  WEEKLY_REVIEW_READY: "weekly_review_ready",
  COACH_NOTE_RECEIVED: "coach_note_received",
} as const

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[keyof typeof EMAIL_TEMPLATE_KEYS]

// Token whitelist for security - only these can be substituted
const TOKEN_WHITELIST = [
  "userName",
  "userEmail",
  "coachName",
  "coachEmail",
  "cohortName",
  "loginUrl",
  "appName",
  "clientName",
  "weekNumber",
  "questionnaireUrl",
  "appointmentDate",
  "appointmentTime",
  "appointmentLocation",
  "invoiceAmount",
  "invoiceMonth",
  "paymentUrl",
  "loomUrl",
  "resetUrl",
] as const

export type EmailToken = (typeof TOKEN_WHITELIST)[number]

export interface EmailVariables {
  userName?: string
  userEmail?: string
  coachName?: string
  coachEmail?: string
  cohortName?: string
  loginUrl?: string
  appName?: string
  clientName?: string
  weekNumber?: string
  questionnaireUrl?: string
  appointmentDate?: string
  appointmentTime?: string
  appointmentLocation?: string
  invoiceAmount?: string
  invoiceMonth?: string
  paymentUrl?: string
  loomUrl?: string
  resetUrl?: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

/**
 * Escapes HTML to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Substitutes tokens in a template string with provided variables
 * Tokens are in the format {{tokenName}}
 * Only whitelisted tokens are replaced
 * HTML-escapes values for security
 */
function substituteTokens(
  template: string,
  variables: EmailVariables,
  escapeValues = true
): string {
  let result = template

  // Replace each whitelisted token
  TOKEN_WHITELIST.forEach((token) => {
    const value = variables[token]
    if (value !== undefined && value !== null) {
      const escapedValue = escapeValues ? escapeHtml(value) : value
      const regex = new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, "g")
      result = result.replace(regex, escapedValue)
    }
  })

  // Remove any remaining tokens that weren't substituted
  result = result.replace(/\{\{\s*\w+\s*\}\}/g, "")

  return result
}

// Default templates (hardcoded for simplicity, can be moved to database later)
const DEFAULT_TEMPLATES: Record<EmailTemplateKey, { subject: string; body: string; text: string }> = {
  // User management
  welcome_client: {
    subject: "Welcome to Centurion, {{userName}}!",
    body: `
      <h1>Welcome to Centurion!</h1>
      <p>Hi {{userName}},</p>
      <p>We're excited to have you on board. Centurion is your all-in-one platform for fitness coaching and personal training.</p>
      <p><a href="{{loginUrl}}">Log in to get started</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Welcome to Centurion, {{userName}}! We're excited to have you on board. Log in at {{loginUrl}} to get started.",
  },
  welcome_coach: {
    subject: "Welcome to Centurion, Coach {{userName}}!",
    body: `
      <h1>Welcome to Centurion!</h1>
      <p>Hi {{userName}},</p>
      <p>Your coach account has been created. You can now create cohorts, invite clients, and manage their fitness journeys.</p>
      <p><a href="{{loginUrl}}">Log in to your coach dashboard</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Welcome to Centurion, Coach {{userName}}! Your coach account is ready. Log in at {{loginUrl}} to get started.",
  },
  password_reset: {
    subject: "Reset Your Centurion Password",
    body: `
      <h1>Password Reset Request</h1>
      <p>Hi {{userName}},</p>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="{{resetUrl}}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Password Reset Request for {{userName}}. Click here to reset: {{resetUrl}}. This link expires in 1 hour. If you didn't request this, please ignore this email.",
  },

  // Invitations
  coach_invite: {
    subject: "{{coachName}} invited you to join Centurion",
    body: `
      <h1>You're Invited!</h1>
      <p>Hi,</p>
      <p>{{coachName}} has invited you to join Centurion as their client.</p>
      <p><a href="{{loginUrl}}">Accept Invitation</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "{{coachName}} invited you to join Centurion. Accept at: {{loginUrl}}",
  },
  cohort_invite: {
    subject: "You've been invited to join {{cohortName}}",
    body: `
      <h1>Cohort Invitation</h1>
      <p>Hi {{userName}},</p>
      <p>You've been invited to join the {{cohortName}} cohort by {{coachName}}.</p>
      <p><a href="{{loginUrl}}">Join Cohort</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "You've been invited to join {{cohortName}} by {{coachName}}. Join at: {{loginUrl}}",
  },

  // Appointments
  appointment_confirmation: {
    subject: "Appointment Confirmed - {{appointmentDate}}",
    body: `
      <h1>Appointment Confirmed</h1>
      <p>Hi {{userName}},</p>
      <p>Your appointment has been confirmed:</p>
      <ul>
        <li><strong>Date:</strong> {{appointmentDate}}</li>
        <li><strong>Time:</strong> {{appointmentTime}}</li>
        <li><strong>Location:</strong> {{appointmentLocation}}</li>
      </ul>
      <p>See you then!</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Appointment Confirmed for {{userName}} on {{appointmentDate}} at {{appointmentTime}}. Location: {{appointmentLocation}}",
  },
  appointment_reminder: {
    subject: "Reminder: Appointment Tomorrow - {{appointmentDate}}",
    body: `
      <h1>Appointment Reminder</h1>
      <p>Hi {{userName}},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <ul>
        <li><strong>Date:</strong> {{appointmentDate}}</li>
        <li><strong>Time:</strong> {{appointmentTime}}</li>
        <li><strong>Location:</strong> {{appointmentLocation}}</li>
      </ul>
      <p>See you soon!</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Reminder: Appointment for {{userName}} on {{appointmentDate}} at {{appointmentTime}}. Location: {{appointmentLocation}}",
  },
  appointment_cancelled: {
    subject: "Appointment Cancelled - {{appointmentDate}}",
    body: `
      <h1>Appointment Cancelled</h1>
      <p>Hi {{userName}},</p>
      <p>Your appointment on {{appointmentDate}} at {{appointmentTime}} has been cancelled.</p>
      <p>If you have any questions, please reach out to your coach.</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Appointment Cancelled for {{userName}} on {{appointmentDate}} at {{appointmentTime}}.",
  },

  // Invoicing
  invoice_sent: {
    subject: "Invoice for {{invoiceMonth}} - {{invoiceAmount}}",
    body: `
      <h1>Your Invoice is Ready</h1>
      <p>Hi {{userName}},</p>
      <p>Your invoice for {{invoiceMonth}} is ready:</p>
      <p><strong>Amount Due:</strong> {{invoiceAmount}}</p>
      <p><a href="{{paymentUrl}}">Pay Now</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Invoice for {{invoiceMonth}} - Amount: {{invoiceAmount}}. Pay at: {{paymentUrl}}",
  },
  invoice_paid: {
    subject: "Payment Received - Thank You!",
    body: `
      <h1>Payment Received</h1>
      <p>Hi {{userName}},</p>
      <p>We've received your payment of {{invoiceAmount}} for {{invoiceMonth}}. Thank you!</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Payment of {{invoiceAmount}} received for {{invoiceMonth}}. Thank you, {{userName}}!",
  },
  payment_reminder: {
    subject: "Payment Reminder - {{invoiceAmount}} Due",
    body: `
      <h1>Payment Reminder</h1>
      <p>Hi {{userName}},</p>
      <p>This is a friendly reminder that your payment of {{invoiceAmount}} for {{invoiceMonth}} is due.</p>
      <p><a href="{{paymentUrl}}">Pay Now</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Payment Reminder: {{invoiceAmount}} due for {{invoiceMonth}}. Pay at: {{paymentUrl}}",
  },

  // Health coaching
  weekly_questionnaire_reminder: {
    subject: "Weekly Check-in Reminder - Week {{weekNumber}}",
    body: `
      <h1>Time for Your Weekly Check-in!</h1>
      <p>Hi {{userName}},</p>
      <p>It's time to complete your weekly check-in for Week {{weekNumber}}.</p>
      <p><a href="{{questionnaireUrl}}">Complete Check-in</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Weekly Check-in Reminder for Week {{weekNumber}}. Complete at: {{questionnaireUrl}}",
  },
  weekly_review_ready: {
    subject: "Your Weekly Review is Ready",
    body: `
      <h1>Weekly Review Available</h1>
      <p>Hi {{userName}},</p>
      <p>{{coachName}} has completed their review of your Week {{weekNumber}} progress.</p>
      <p><a href="{{loginUrl}}">View Your Review</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "Your Week {{weekNumber}} review from {{coachName}} is ready. View at: {{loginUrl}}",
  },
  coach_note_received: {
    subject: "New Note from {{coachName}}",
    body: `
      <h1>You Have a New Note</h1>
      <p>Hi {{userName}},</p>
      <p>{{coachName}} has left you a new note.</p>
      <p><a href="{{loginUrl}}">View Note</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    text: "New note from {{coachName}}. View at: {{loginUrl}}",
  },
}

/**
 * Renders an email template with the provided variables.
 * Checks the database first for DB-stored templates, falls back to hardcoded defaults.
 */
export async function renderEmailTemplate(
  key: EmailTemplateKey,
  variables: EmailVariables
): Promise<RenderedEmail | null> {
  try {
    // 1. Try to find template in DB
    let dbTemplate: { subjectTemplate: string; bodyTemplate: string; textTemplate: string; enabled: boolean } | null = null
    try {
      const { prisma } = await import("@/lib/prisma")
      dbTemplate = await prisma.emailTemplate.findUnique({
        where: { key },
        select: {
          subjectTemplate: true,
          bodyTemplate: true,
          textTemplate: true,
          enabled: true,
        },
      })
    } catch {
      // DB lookup failed (e.g. table doesn't exist yet) - fall through to defaults
    }

    if (dbTemplate && dbTemplate.enabled) {
      return {
        subject: substituteTokens(dbTemplate.subjectTemplate, variables, false),
        html: substituteTokens(dbTemplate.bodyTemplate, variables, true),
        text: substituteTokens(dbTemplate.textTemplate, variables, false),
      }
    }

    // 2. Fall back to hardcoded template
    const template = DEFAULT_TEMPLATES[key]

    if (!template) {
      console.error(`Template ${key} not found`)
      return null
    }

    return {
      subject: substituteTokens(template.subject, variables, false),
      html: substituteTokens(template.body, variables, true),
      text: substituteTokens(template.text, variables, false),
    }
  } catch (error) {
    console.error(`Error rendering email template ${key}:`, error)
    return null
  }
}

/**
 * Preview a template with mock data
 */
export function previewEmailTemplate(
  subjectTemplate: string,
  bodyTemplate: string,
  textTemplate: string,
  mockVariables: EmailVariables
): RenderedEmail {
  return {
    subject: substituteTokens(subjectTemplate, mockVariables, false),
    html: substituteTokens(bodyTemplate, mockVariables, true),
    text: substituteTokens(textTemplate, mockVariables, false),
  }
}
