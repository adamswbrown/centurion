"use server"

import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
  userAgent: z.string().optional(),
})

export async function subscribeToPush(data: z.infer<typeof subscriptionSchema>) {
  const user = await requireAuth()
  const parsed = subscriptionSchema.parse(data)

  // Upsert subscription (user might resubscribe with same endpoint)
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.endpoint },
    update: {
      userId: Number(user.id),
      auth: parsed.keys.auth,
      p256dh: parsed.keys.p256dh,
      userAgent: parsed.userAgent || null,
      updatedAt: new Date(),
    },
    create: {
      userId: Number(user.id),
      endpoint: parsed.endpoint,
      auth: parsed.keys.auth,
      p256dh: parsed.keys.p256dh,
      userAgent: parsed.userAgent || null,
    },
  })

  // Ensure notification preferences exist with defaults
  await prisma.notificationPreference.upsert({
    where: { userId: Number(user.id) },
    update: {},
    create: { userId: Number(user.id) },
  })

  revalidatePath("/settings")
  return { success: true }
}

export async function unsubscribeFromPush(endpoint: string) {
  const user = await requireAuth()

  await prisma.pushSubscription.deleteMany({
    where: {
      userId: Number(user.id),
      endpoint,
    },
  })

  revalidatePath("/settings")
  return { success: true }
}

export async function unsubscribeAllPush() {
  const user = await requireAuth()

  await prisma.pushSubscription.deleteMany({
    where: { userId: Number(user.id) },
  })

  revalidatePath("/settings")
  return { success: true }
}

const preferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  dailyCheckInReminder: z.boolean().optional(),
  dailyCheckInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dailyCheckInTimezone: z.string().optional(),
  weeklyQuestionnaireReminder: z.boolean().optional(),
  weeklyQuestionnaireTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  weeklyQuestionnaireDay: z.number().min(0).max(6).optional(),
  progressNotifications: z.boolean().optional(),
  stepGoalCelebrations: z.boolean().optional(),
  streakNotifications: z.boolean().optional(),
  appointmentReminder24h: z.boolean().optional(),
  appointmentReminder1h: z.boolean().optional(),
  sessionReminder24h: z.boolean().optional(),
  sessionReminder1h: z.boolean().optional(),
  coachNoteReceived: z.boolean().optional(),
  weeklyReviewReady: z.boolean().optional(),
  clientCheckInReceived: z.boolean().optional(),
  questionnaireSubmitted: z.boolean().optional(),
  attentionScoreAlerts: z.boolean().optional(),
  invoiceReceived: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
})

export type NotificationPreferencesInput = z.infer<typeof preferencesSchema>

export async function updateNotificationPreferences(
  data: NotificationPreferencesInput
) {
  const user = await requireAuth()
  const parsed = preferencesSchema.parse(data)

  const result = await prisma.notificationPreference.upsert({
    where: { userId: Number(user.id) },
    update: parsed,
    create: {
      userId: Number(user.id),
      ...parsed,
    },
  })

  revalidatePath("/settings")
  return { success: true, preferences: result }
}

export async function getNotificationPreferences() {
  const user = await requireAuth()

  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: Number(user.id) },
  })

  // Create default preferences if none exist
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId: Number(user.id) },
    })
  }

  return prefs
}

export async function getPushSubscriptionStatus() {
  const user = await requireAuth()

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: Number(user.id) },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    hasSubscription: subscriptions.length > 0,
    subscriptionCount: subscriptions.length,
    subscriptions,
  }
}

export async function getNotificationHistory(limit = 20) {
  const user = await requireAuth()

  const logs = await prisma.notificationLog.findMany({
    where: { userId: Number(user.id) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      category: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
    },
  })

  return logs
}

// Admin function to send test notification
export async function sendTestNotification() {
  const user = await requireAuth()

  const { sendPushNotification } = await import("@/lib/push-notifications")

  const result = await sendPushNotification(Number(user.id), "system", {
    title: "Test Notification",
    body: "If you see this, push notifications are working!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "test",
    data: { url: "/settings" },
  })

  return result
}
