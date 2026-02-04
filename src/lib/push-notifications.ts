import webPush from "web-push"
import { prisma } from "./prisma"

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@centurion.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string; icon?: string }>
  requireInteraction?: boolean
  silent?: boolean
}

export type NotificationCategory =
  | "daily_reminder"
  | "weekly_questionnaire"
  | "progress_celebration"
  | "streak_notification"
  | "appointment_reminder"
  | "session_reminder"
  | "coach_note"
  | "weekly_review"
  | "client_activity"
  | "invoice"
  | "system"

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: number,
  category: NotificationCategory,
  payload: PushPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (!isPushConfigured()) {
    console.warn("Push notifications not configured - skipping")
    return { success: true, sent: 0, failed: 0 }
  }

  // Check user preferences
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  if (prefs && !prefs.pushEnabled) {
    return { success: true, sent: 0, failed: 0 }
  }

  // Check category-specific preferences
  if (prefs && !shouldSendNotification(prefs, category)) {
    return { success: true, sent: 0, failed: 0 }
  }

  // Get all push subscriptions for user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    return { success: true, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh,
          },
        },
        JSON.stringify(payload)
      )

      sent++

      // Log successful notification
      await prisma.notificationLog.create({
        data: {
          userId,
          type: "PUSH",
          category,
          title: payload.title,
          body: payload.body,
          status: "SENT",
          deliveredAt: new Date(),
        },
      })
    } catch (error: unknown) {
      failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Log failed notification
      await prisma.notificationLog.create({
        data: {
          userId,
          type: "PUSH",
          category,
          title: payload.title,
          body: payload.body,
          status: "FAILED",
          errorMessage,
        },
      })

      // Remove invalid subscriptions (410 Gone or 404 Not Found)
      if (error instanceof webPush.WebPushError) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          }).catch(() => {
            // Ignore deletion errors
          })
        }
      }
    }
  }

  return { success: true, sent, failed }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkPushNotification(
  userIds: number[],
  category: NotificationCategory,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0
  let totalFailed = 0

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, category, payload)
    totalSent += result.sent
    totalFailed += result.failed
  }

  return { sent: totalSent, failed: totalFailed }
}

/**
 * Check if a specific notification category should be sent based on preferences
 */
function shouldSendNotification(
  prefs: {
    dailyCheckInReminder: boolean
    weeklyQuestionnaireReminder: boolean
    progressNotifications: boolean
    stepGoalCelebrations: boolean
    streakNotifications: boolean
    appointmentReminder24h: boolean
    appointmentReminder1h: boolean
    sessionReminder24h: boolean
    sessionReminder1h: boolean
    coachNoteReceived: boolean
    weeklyReviewReady: boolean
    clientCheckInReceived: boolean
    questionnaireSubmitted: boolean
    attentionScoreAlerts: boolean
    invoiceReceived: boolean
    paymentReminders: boolean
    systemAnnouncements: boolean
  },
  category: NotificationCategory
): boolean {
  switch (category) {
    case "daily_reminder":
      return prefs.dailyCheckInReminder
    case "weekly_questionnaire":
      return prefs.weeklyQuestionnaireReminder
    case "progress_celebration":
      return prefs.progressNotifications || prefs.stepGoalCelebrations
    case "streak_notification":
      return prefs.streakNotifications
    case "appointment_reminder":
      return prefs.appointmentReminder24h || prefs.appointmentReminder1h
    case "session_reminder":
      return prefs.sessionReminder24h || prefs.sessionReminder1h
    case "coach_note":
      return prefs.coachNoteReceived
    case "weekly_review":
      return prefs.weeklyReviewReady
    case "client_activity":
      return prefs.clientCheckInReceived || prefs.questionnaireSubmitted || prefs.attentionScoreAlerts
    case "invoice":
      return prefs.invoiceReceived || prefs.paymentReminders
    case "system":
      return prefs.systemAnnouncements
    default:
      return true
  }
}

// ============================================
// NOTIFICATION MESSAGE HELPERS
// ============================================

export function createDailyCheckInReminder(userName?: string): PushPayload {
  return {
    title: "Time to Check In!",
    body: userName
      ? `Hey ${userName}, log your daily progress to stay on track.`
      : "Log your daily progress to stay on track with your goals.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "daily-checkin",
    data: { url: "/client/health" },
    actions: [
      { action: "view", title: "Log Now" },
      { action: "dismiss", title: "Later" },
    ],
  }
}

export function createWeeklyQuestionnaireReminder(
  cohortName: string,
  weekNumber: number,
  cohortId: number
): PushPayload {
  return {
    title: "Weekly Check-In Time!",
    body: `Complete your Week ${weekNumber} questionnaire for ${cohortName}.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: `questionnaire-${cohortId}-${weekNumber}`,
    data: { url: `/client/questionnaires/${cohortId}/${weekNumber}` },
    actions: [
      { action: "view", title: "Complete Now" },
      { action: "dismiss", title: "Remind Later" },
    ],
    requireInteraction: true,
  }
}

export function createStepGoalCelebration(
  steps: number,
  goal: number
): PushPayload {
  const percentOver = Math.round(((steps - goal) / goal) * 100)
  const isOver = steps >= goal

  return {
    title: isOver ? "Step Goal Crushed!" : "So Close!",
    body: isOver
      ? percentOver > 0
        ? `You hit ${steps.toLocaleString()} steps - ${percentOver}% over your goal!`
        : `You reached your ${goal.toLocaleString()} step goal!`
      : `You hit ${steps.toLocaleString()} steps - just ${(goal - steps).toLocaleString()} shy of your goal. Keep pushing!`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "step-celebration",
    data: { url: "/client/dashboard" },
  }
}

export function createStreakNotification(streakDays: number): PushPayload {
  const emoji = streakDays >= 7 ? "" : streakDays >= 3 ? "" : ""
  return {
    title: `${streakDays}-Day Streak! ${emoji}`,
    body:
      streakDays >= 7
        ? `Incredible! You've checked in for ${streakDays} days straight!`
        : `You're on a roll! Keep the momentum going.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "streak",
    data: { url: "/client/dashboard" },
  }
}

export function createAppointmentReminder(
  coachName: string,
  time: string,
  isOneHour: boolean
): PushPayload {
  return {
    title: isOneHour ? "Appointment in 1 Hour" : "Appointment Tomorrow",
    body: isOneHour
      ? `Your session with ${coachName} starts soon!`
      : `Your session with ${coachName} is tomorrow at ${time}.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "appointment-reminder",
    data: { url: "/appointments/me" },
    requireInteraction: isOneHour,
  }
}

export function createSessionReminder(
  sessionTitle: string,
  time: string,
  isOneHour: boolean,
  registeredCount?: number
): PushPayload {
  return {
    title: isOneHour ? "Session Starting Soon" : "Session Tomorrow",
    body: isOneHour
      ? `${sessionTitle} starts in 1 hour!`
      : `${sessionTitle} is tomorrow at ${time}${registeredCount ? ` - ${registeredCount} registered` : ""}.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "session-reminder",
    data: { url: "/appointments/me" },
    requireInteraction: isOneHour,
  }
}

export function createCoachNoteNotification(coachName: string): PushPayload {
  return {
    title: `New Note from ${coachName}`,
    body: "Your coach has left you a new note. Tap to view.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "coach-note",
    data: { url: "/client/dashboard" },
  }
}

export function createWeeklyReviewNotification(
  coachName: string,
  weekNumber: number
): PushPayload {
  return {
    title: "Your Weekly Review is Ready",
    body: `${coachName} has completed their review of your Week ${weekNumber} progress.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "weekly-review",
    data: { url: "/client/dashboard" },
  }
}

export function createClientCheckInNotification(
  clientName: string
): PushPayload {
  return {
    title: "Client Check-In",
    body: `${clientName} just logged their daily check-in.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "client-checkin",
    data: { url: "/dashboard" },
    silent: true,
  }
}

export function createQuestionnaireSubmittedNotification(
  clientName: string,
  weekNumber: number
): PushPayload {
  return {
    title: "Questionnaire Submitted",
    body: `${clientName} completed their Week ${weekNumber} questionnaire.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "questionnaire-submitted",
    data: { url: "/coach/review-queue" },
  }
}

export function createAttentionScoreAlert(
  clientName: string,
  priority: "red" | "amber"
): PushPayload {
  return {
    title: priority === "red" ? "Client Needs Attention" : "Client Check-In",
    body:
      priority === "red"
        ? `${clientName} may need your attention. Review their progress.`
        : `${clientName}'s engagement has dropped. Consider reaching out.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "attention-alert",
    data: { url: "/dashboard" },
    requireInteraction: priority === "red",
  }
}

export function createInvoiceNotification(
  amount: string,
  month: string
): PushPayload {
  return {
    title: "New Invoice",
    body: `Invoice for ${month} - ${amount}`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "invoice",
    data: { url: "/invoices/me" },
  }
}

export function createPaymentReminderNotification(
  amount: string,
  daysOverdue: number
): PushPayload {
  return {
    title: "Payment Reminder",
    body:
      daysOverdue > 0
        ? `Your payment of ${amount} is ${daysOverdue} days overdue.`
        : `Your payment of ${amount} is due soon.`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "payment-reminder",
    data: { url: "/invoices/me" },
    requireInteraction: daysOverdue > 7,
  }
}
