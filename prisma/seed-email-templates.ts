import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Template definitions matching the hardcoded defaults in src/lib/email-templates.ts
const SYSTEM_TEMPLATES = [
  {
    key: "welcome_client",
    name: "Welcome Client",
    description: "Sent when a new client account is created",
    subjectTemplate: "Welcome to Centurion, {{userName}}!",
    bodyTemplate: `
      <h1>Welcome to Centurion!</h1>
      <p>Hi {{userName}},</p>
      <p>We're excited to have you on board. Centurion is your all-in-one platform for fitness coaching and personal training.</p>
      <p><a href="{{loginUrl}}">Log in to get started</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Welcome to Centurion, {{userName}}! We're excited to have you on board. Log in at {{loginUrl}} to get started.",
    availableTokens: ["userName", "loginUrl"],
  },
  {
    key: "welcome_coach",
    name: "Welcome Coach",
    description: "Sent when a new coach account is created",
    subjectTemplate: "Welcome to Centurion, Coach {{userName}}!",
    bodyTemplate: `
      <h1>Welcome to Centurion!</h1>
      <p>Hi {{userName}},</p>
      <p>Your coach account has been created. You can now create cohorts, invite clients, and manage their fitness journeys.</p>
      <p><a href="{{loginUrl}}">Log in to your coach dashboard</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Welcome to Centurion, Coach {{userName}}! Your coach account is ready. Log in at {{loginUrl}} to get started.",
    availableTokens: ["userName", "loginUrl"],
  },
  {
    key: "password_reset",
    name: "Password Reset",
    description: "Sent when a user requests a password reset",
    subjectTemplate: "Reset Your Centurion Password",
    bodyTemplate: `
      <h1>Password Reset Request</h1>
      <p>Hi {{userName}},</p>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="{{resetUrl}}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Password Reset Request for {{userName}}. Click here to reset: {{resetUrl}}. This link expires in 1 hour. If you didn't request this, please ignore this email.",
    availableTokens: ["userName", "resetUrl"],
  },
  {
    key: "coach_invite",
    name: "Coach Invite",
    description: "Sent when a coach invites a client to the platform",
    subjectTemplate: "{{coachName}} invited you to join Centurion",
    bodyTemplate: `
      <h1>You're Invited!</h1>
      <p>Hi,</p>
      <p>{{coachName}} has invited you to join Centurion as their client.</p>
      <p><a href="{{loginUrl}}">Accept Invitation</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate: "{{coachName}} invited you to join Centurion. Accept at: {{loginUrl}}",
    availableTokens: ["coachName", "loginUrl"],
  },
  {
    key: "cohort_invite",
    name: "Cohort Invite",
    description: "Sent when a user is invited to join a cohort",
    subjectTemplate: "You've been invited to join {{cohortName}}",
    bodyTemplate: `
      <h1>Cohort Invitation</h1>
      <p>Hi {{userName}},</p>
      <p>You've been invited to join the {{cohortName}} cohort by {{coachName}}.</p>
      <p><a href="{{loginUrl}}">Join Cohort</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "You've been invited to join {{cohortName}} by {{coachName}}. Join at: {{loginUrl}}",
    availableTokens: ["userName", "cohortName", "coachName", "loginUrl"],
  },
  {
    key: "appointment_confirmation",
    name: "Appointment Confirmation",
    description: "Sent when an appointment is confirmed",
    subjectTemplate: "Appointment Confirmed - {{appointmentDate}}",
    bodyTemplate: `
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
    textTemplate:
      "Appointment Confirmed for {{userName}} on {{appointmentDate}} at {{appointmentTime}}. Location: {{appointmentLocation}}",
    availableTokens: ["userName", "appointmentDate", "appointmentTime", "appointmentLocation"],
  },
  {
    key: "appointment_reminder",
    name: "Appointment Reminder",
    description: "Sent as a reminder before an upcoming appointment",
    subjectTemplate: "Reminder: Appointment Tomorrow - {{appointmentDate}}",
    bodyTemplate: `
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
    textTemplate:
      "Reminder: Appointment for {{userName}} on {{appointmentDate}} at {{appointmentTime}}. Location: {{appointmentLocation}}",
    availableTokens: ["userName", "appointmentDate", "appointmentTime", "appointmentLocation"],
  },
  {
    key: "appointment_cancelled",
    name: "Appointment Cancelled",
    description: "Sent when an appointment is cancelled",
    subjectTemplate: "Appointment Cancelled - {{appointmentDate}}",
    bodyTemplate: `
      <h1>Appointment Cancelled</h1>
      <p>Hi {{userName}},</p>
      <p>Your appointment on {{appointmentDate}} at {{appointmentTime}} has been cancelled.</p>
      <p>If you have any questions, please reach out to your coach.</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Appointment Cancelled for {{userName}} on {{appointmentDate}} at {{appointmentTime}}.",
    availableTokens: ["userName", "appointmentDate", "appointmentTime"],
  },
  {
    key: "invoice_sent",
    name: "Invoice Sent",
    description: "Sent when an invoice is generated for a client",
    subjectTemplate: "Invoice for {{invoiceMonth}} - {{invoiceAmount}}",
    bodyTemplate: `
      <h1>Your Invoice is Ready</h1>
      <p>Hi {{userName}},</p>
      <p>Your invoice for {{invoiceMonth}} is ready:</p>
      <p><strong>Amount Due:</strong> {{invoiceAmount}}</p>
      <p><a href="{{paymentUrl}}">Pay Now</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Invoice for {{invoiceMonth}} - Amount: {{invoiceAmount}}. Pay at: {{paymentUrl}}",
    availableTokens: ["userName", "invoiceMonth", "invoiceAmount", "paymentUrl"],
  },
  {
    key: "invoice_paid",
    name: "Invoice Paid",
    description: "Sent when a payment is received for an invoice",
    subjectTemplate: "Payment Received - Thank You!",
    bodyTemplate: `
      <h1>Payment Received</h1>
      <p>Hi {{userName}},</p>
      <p>We've received your payment of {{invoiceAmount}} for {{invoiceMonth}}. Thank you!</p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Payment of {{invoiceAmount}} received for {{invoiceMonth}}. Thank you, {{userName}}!",
    availableTokens: ["userName", "invoiceAmount", "invoiceMonth"],
  },
  {
    key: "payment_reminder",
    name: "Payment Reminder",
    description: "Sent as a reminder for overdue payments",
    subjectTemplate: "Payment Reminder - {{invoiceAmount}} Due",
    bodyTemplate: `
      <h1>Payment Reminder</h1>
      <p>Hi {{userName}},</p>
      <p>This is a friendly reminder that your payment of {{invoiceAmount}} for {{invoiceMonth}} is due.</p>
      <p><a href="{{paymentUrl}}">Pay Now</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Payment Reminder: {{invoiceAmount}} due for {{invoiceMonth}}. Pay at: {{paymentUrl}}",
    availableTokens: ["userName", "invoiceAmount", "invoiceMonth", "paymentUrl"],
  },
  {
    key: "weekly_questionnaire_reminder",
    name: "Weekly Questionnaire Reminder",
    description: "Sent to remind clients to complete their weekly check-in",
    subjectTemplate: "Weekly Check-in Reminder - Week {{weekNumber}}",
    bodyTemplate: `
      <h1>Time for Your Weekly Check-in!</h1>
      <p>Hi {{userName}},</p>
      <p>It's time to complete your weekly check-in for Week {{weekNumber}}.</p>
      <p><a href="{{questionnaireUrl}}">Complete Check-in</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Weekly Check-in Reminder for Week {{weekNumber}}. Complete at: {{questionnaireUrl}}",
    availableTokens: ["userName", "weekNumber", "questionnaireUrl"],
  },
  {
    key: "weekly_review_ready",
    name: "Weekly Review Ready",
    description: "Sent when a coach completes their weekly review of a client",
    subjectTemplate: "Your Weekly Review is Ready",
    bodyTemplate: `
      <h1>Weekly Review Available</h1>
      <p>Hi {{userName}},</p>
      <p>{{coachName}} has completed their review of your Week {{weekNumber}} progress.</p>
      <p><a href="{{loginUrl}}">View Your Review</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate:
      "Your Week {{weekNumber}} review from {{coachName}} is ready. View at: {{loginUrl}}",
    availableTokens: ["userName", "coachName", "weekNumber", "loginUrl"],
  },
  {
    key: "coach_note_received",
    name: "Coach Note Received",
    description: "Sent when a coach leaves a note for a client",
    subjectTemplate: "New Note from {{coachName}}",
    bodyTemplate: `
      <h1>You Have a New Note</h1>
      <p>Hi {{userName}},</p>
      <p>{{coachName}} has left you a new note.</p>
      <p><a href="{{loginUrl}}">View Note</a></p>
      <p>Best regards,<br>The Centurion Team</p>
    `,
    textTemplate: "New note from {{coachName}}. View at: {{loginUrl}}",
    availableTokens: ["userName", "coachName", "loginUrl"],
  },
]

async function main() {
  console.log("Seeding email templates...")

  let created = 0
  let skipped = 0

  for (const template of SYSTEM_TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { key: template.key },
    })

    if (!existing) {
      await prisma.emailTemplate.create({
        data: {
          ...template,
          enabled: true,
          isSystem: true,
        },
      })
      created++
      console.log(`  Created: ${template.key} (${template.name})`)
    } else {
      skipped++
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped (already exist): ${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
