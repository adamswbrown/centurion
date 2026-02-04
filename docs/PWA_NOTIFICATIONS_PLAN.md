# PWA Notifications Plan for Centurion

## Executive Summary

This document outlines a comprehensive plan to add Progressive Web App (PWA) support with system-level push notifications to Centurion. The implementation will cover iOS, Android, and desktop browsers with configurable notification preferences for both Coach and Client personas.

---

## Current State Audit

### What Exists

| Component | Status | Notes |
|-----------|--------|-------|
| **Manifest** | ✅ Timer only | `/public/manifest.json` - timer-specific PWA |
| **Service Worker** | ✅ Timer only | `/public/timer-sw.js` - cache-first, no push |
| **Email Notifications** | ✅ Full system | 14 templates via Resend |
| **Push Notifications** | ❌ Missing | No web-push infrastructure |
| **User Preferences** | ⚠️ Partial | Basic prefs exist, no notification settings |
| **Scheduled Jobs** | ❌ Missing | No cron/scheduler for automated reminders |
| **HealthKit Data** | ✅ Exists | Steps, workouts, sleep data available |

### Key Files

- `/public/manifest.json` - Timer-only manifest
- `/public/timer-sw.js` - Basic service worker (32 lines)
- `/src/lib/email-templates.ts` - 14 email notification types
- `/src/lib/email.ts` - Resend email client
- `prisma/schema.prisma` - `UserPreference`, `SystemSettings` models

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser/PWA)                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  PWA Manifest   │  │ Service Worker  │  │ Notification UI     │ │
│  │  (app-wide)     │  │ (push events)   │  │ (permission request)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SERVER (Next.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ Push API Routes │  │ Server Actions  │  │ Scheduled Jobs      │ │
│  │ /api/push/*     │  │ (triggers)      │  │ (cron reminders)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
│                                  │                                   │
│                    ┌─────────────┴─────────────┐                    │
│                    ▼                           ▼                    │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │    Push Service         │  │    Database (PostgreSQL)        │  │
│  │    (web-push/FCM)       │  │    - PushSubscription           │  │
│  │                         │  │    - NotificationPreference     │  │
│  └─────────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: PWA Foundation

### 1.1 App-Wide Manifest

Create a new app-wide manifest (keep timer manifest separate for backwards compatibility):

**File: `/public/app-manifest.json`**

```json
{
  "name": "Centurion Fitness Platform",
  "short_name": "Centurion",
  "description": "Your personal fitness coaching and training platform",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0B1020",
  "theme_color": "#0B1020",
  "orientation": "portrait-primary",
  "categories": ["health", "fitness", "lifestyle"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile-dashboard.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### 1.2 Service Worker with Push Support

**File: `/public/sw.js`**

```javascript
const CACHE_NAME = "centurion-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/client/dashboard",
  "/offline",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/offline")))
  );
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, badge, tag, data: notificationData, actions } = data;

  const options = {
    body,
    icon: icon || "/icons/icon-192x192.png",
    badge: badge || "/icons/badge-72x72.png",
    tag: tag || "centurion-notification",
    data: notificationData,
    actions: actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event - handle user interaction
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";
  const action = event.action;

  // Handle specific actions
  if (action === "view") {
    event.waitUntil(clients.openWindow(urlToOpen));
  } else if (action === "dismiss") {
    // Just close notification (already done above)
  } else {
    // Default: open the URL
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        return clients.openWindow(urlToOpen);
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-entries") {
    event.waitUntil(syncOfflineEntries());
  }
});

async function syncOfflineEntries() {
  // Sync any offline check-ins when connection is restored
  const cache = await caches.open("centurion-offline-entries");
  const requests = await cache.keys();

  for (const request of requests) {
    const response = await cache.match(request);
    const data = await response.json();

    try {
      await fetch("/api/entries/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await cache.delete(request);
    } catch (error) {
      console.error("Sync failed for entry:", error);
    }
  }
}
```

### 1.3 iOS-Specific Considerations

iOS requires special handling for PWA notifications (available in iOS 16.4+):

**Required Meta Tags in `/src/app/layout.tsx`:**

```tsx
export const metadata = {
  // ... existing metadata
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Centurion",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};
```

**iOS Limitations:**
- Push notifications only work when app is installed to home screen
- User must grant permission after installation
- No background sync support
- Badge API limited

---

## Phase 2: Database Schema Updates

### 2.1 Push Subscription Model

**Add to `prisma/schema.prisma`:**

```prisma
// ============================================
// PUSH NOTIFICATIONS
// ============================================

model PushSubscription {
  id        Int      @id @default(autoincrement())
  userId    Int
  endpoint  String   @unique
  auth      String   // Base64 encoded auth key
  p256dh    String   // Base64 encoded public key
  userAgent String?  // Device info for debugging

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("push_subscriptions")
  @@index([userId])
  @@index([endpoint])
}

model NotificationPreference {
  id     Int  @id @default(autoincrement())
  userId Int  @unique

  // Master toggle
  pushEnabled   Boolean @default(true)
  emailEnabled  Boolean @default(true)

  // Daily check-in reminders
  dailyCheckInReminder      Boolean @default(true)
  dailyCheckInTime          String  @default("09:00")  // HH:mm format
  dailyCheckInTimezone      String  @default("America/New_York")

  // Weekly questionnaire reminders (Sunday)
  weeklyQuestionnaireReminder     Boolean @default(true)
  weeklyQuestionnaireTime         String  @default("10:00")
  weeklyQuestionnaireDay          Int     @default(0)  // 0=Sunday, 6=Saturday

  // Motivational/progress notifications
  progressNotifications     Boolean @default(true)
  stepGoalCelebrations      Boolean @default(true)
  streakNotifications       Boolean @default(true)

  // Appointment reminders
  appointmentReminder24h    Boolean @default(true)
  appointmentReminder1h     Boolean @default(true)

  // Session reminders
  sessionReminder24h        Boolean @default(true)
  sessionReminder1h         Boolean @default(true)

  // Coach notifications (for CLIENT role)
  coachNoteReceived         Boolean @default(true)
  weeklyReviewReady         Boolean @default(true)

  // Client notifications (for COACH role)
  clientCheckInReceived     Boolean @default(true)
  questionnaireSubmitted    Boolean @default(true)
  attentionScoreAlerts      Boolean @default(true)

  // Invoice/payment notifications
  invoiceReceived           Boolean @default(true)
  paymentReminders          Boolean @default(true)

  // System notifications
  systemAnnouncements       Boolean @default(true)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("notification_preferences")
  @@index([userId])
}

model NotificationLog {
  id             Int      @id @default(autoincrement())
  userId         Int
  type           String   // PUSH, EMAIL
  category       String   // daily_reminder, questionnaire, etc.
  title          String
  body           String?
  status         String   // SENT, FAILED, CLICKED
  deliveredAt    DateTime?
  clickedAt      DateTime?
  errorMessage   String?

  createdAt DateTime @default(now())

  @@map("notification_logs")
  @@index([userId])
  @@index([type])
  @@index([category])
  @@index([createdAt])
}
```

### 2.2 Update User Model

Add relation to User model:

```prisma
model User {
  // ... existing fields

  // Push Notifications
  pushSubscriptions        PushSubscription[]
  notificationPreferences  NotificationPreference?

  // ... rest of model
}
```

---

## Phase 3: Backend Implementation

### 3.1 Environment Variables

**Add to `.env.example`:**

```bash
# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=        # Generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=       # Generate with: npx web-push generate-vapid-keys
VAPID_SUBJECT=mailto:notifications@centurion.app

# Cron/Scheduler
CRON_SECRET=             # Secret for cron endpoint authentication
```

### 3.2 Push Notification Library

**File: `/src/lib/push-notifications.ts`**

```typescript
import webPush from "web-push";
import { prisma } from "./prisma";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@centurion.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
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
  | "system";

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: number,
  category: NotificationCategory,
  payload: PushPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  // Check user preferences
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (prefs && !prefs.pushEnabled) {
    return { success: true, sent: 0, failed: 0 };
  }

  // Get all push subscriptions for user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

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
      );

      sent++;

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
      });
    } catch (error: unknown) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

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
      });

      // Remove invalid subscriptions (410 Gone)
      if (
        error instanceof webPush.WebPushError &&
        (error.statusCode === 410 || error.statusCode === 404)
      ) {
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        });
      }
    }
  }

  return { success: true, sent, failed };
}

/**
 * Send notification to multiple users
 */
export async function sendBulkPushNotification(
  userIds: number[],
  category: NotificationCategory,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, category, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
```

### 3.3 Push Notification Server Actions

**File: `/src/app/actions/push-notifications.ts`**

```typescript
"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
  userAgent: z.string().optional(),
});

export async function subscribeToPush(data: z.infer<typeof subscriptionSchema>) {
  const session = await requireAuth();
  const parsed = subscriptionSchema.parse(data);

  // Upsert subscription (user might resubscribe with same endpoint)
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.endpoint },
    update: {
      auth: parsed.keys.auth,
      p256dh: parsed.keys.p256dh,
      userAgent: parsed.userAgent,
      updatedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      endpoint: parsed.endpoint,
      auth: parsed.keys.auth,
      p256dh: parsed.keys.p256dh,
      userAgent: parsed.userAgent,
    },
  });

  // Ensure notification preferences exist
  await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  return { success: true };
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await requireAuth();

  await prisma.pushSubscription.deleteMany({
    where: {
      userId: session.user.id,
      endpoint,
    },
  });

  return { success: true };
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
});

export async function updateNotificationPreferences(
  data: z.infer<typeof preferencesSchema>
) {
  const session = await requireAuth();
  const parsed = preferencesSchema.parse(data);

  await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: parsed,
    create: {
      userId: session.user.id,
      ...parsed,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function getNotificationPreferences() {
  const session = await requireAuth();

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  return prefs;
}

export async function getPushSubscriptionStatus() {
  const session = await requireAuth();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
    select: { endpoint: true, userAgent: true, createdAt: true },
  });

  return {
    hasSubscription: subscriptions.length > 0,
    subscriptions,
  };
}
```

### 3.4 API Routes for Push

**File: `/src/app/api/push/vapid/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push-notifications";

export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
```

### 3.5 Scheduled Notification Jobs

**File: `/src/app/api/cron/notifications/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, sendBulkPushNotification } from "@/lib/push-notifications";

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await request.json();

  switch (type) {
    case "daily_checkin_reminder":
      return await sendDailyCheckInReminders();
    case "weekly_questionnaire_reminder":
      return await sendWeeklyQuestionnaireReminders();
    case "appointment_reminders":
      return await sendAppointmentReminders();
    case "progress_celebrations":
      return await sendProgressCelebrations();
    default:
      return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
  }
}

async function sendDailyCheckInReminders() {
  const now = new Date();
  const currentHour = now.getUTCHours().toString().padStart(2, "0");
  const currentMinute = now.getUTCMinutes().toString().padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;

  // Find users with daily check-in enabled at current time
  const users = await prisma.notificationPreference.findMany({
    where: {
      dailyCheckInReminder: true,
      pushEnabled: true,
      dailyCheckInTime: currentTime,
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Check which users haven't logged today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sent = 0;
  for (const pref of users) {
    const hasEntry = await prisma.entry.findFirst({
      where: {
        userId: pref.userId,
        date: { gte: today },
      },
    });

    if (!hasEntry) {
      await sendPushNotification(pref.userId, "daily_reminder", {
        title: "Time to Check In! 📝",
        body: "Log your daily progress to stay on track with your goals.",
        data: { url: "/client/health" },
        actions: [
          { action: "view", title: "Log Now" },
          { action: "dismiss", title: "Later" },
        ],
      });
      sent++;
    }
  }

  return NextResponse.json({ success: true, sent });
}

async function sendWeeklyQuestionnaireReminders() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday

  // Find users with questionnaire reminder on today
  const users = await prisma.notificationPreference.findMany({
    where: {
      weeklyQuestionnaireReminder: true,
      pushEnabled: true,
      weeklyQuestionnaireDay: dayOfWeek,
    },
    include: {
      user: {
        include: {
          cohortMemberships: {
            where: { status: "ACTIVE" },
            include: { cohort: true },
          },
        },
      },
    },
  });

  let sent = 0;
  for (const pref of users) {
    for (const membership of pref.user.cohortMemberships) {
      const cohort = membership.cohort;
      const weekNumber = calculateWeekNumber(cohort.startDate);

      // Check if questionnaire exists and not completed
      const response = await prisma.weeklyQuestionnaireResponse.findFirst({
        where: {
          userId: pref.userId,
          weekNumber,
          bundle: { cohortId: cohort.id },
          status: "IN_PROGRESS",
        },
      });

      if (response || weekNumber > 0) {
        await sendPushNotification(pref.userId, "weekly_questionnaire", {
          title: "Weekly Check-In Time! 📋",
          body: `Complete your Week ${weekNumber} questionnaire for ${cohort.name}.`,
          data: { url: `/client/questionnaires/${cohort.id}/${weekNumber}` },
          actions: [
            { action: "view", title: "Complete Now" },
            { action: "dismiss", title: "Remind Later" },
          ],
          requireInteraction: true,
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ success: true, sent });
}

async function sendAppointmentReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

  // 24-hour reminders
  const appointments24h = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: new Date(in24Hours.getTime() - 5 * 60 * 1000),
        lte: new Date(in24Hours.getTime() + 5 * 60 * 1000),
      },
    },
    include: {
      user: {
        include: { notificationPreferences: true },
      },
      coach: true,
    },
  });

  let sent = 0;
  for (const apt of appointments24h) {
    if (apt.user.notificationPreferences?.appointmentReminder24h) {
      await sendPushNotification(apt.userId, "appointment_reminder", {
        title: "Appointment Tomorrow",
        body: `Your session with ${apt.coach.name} is tomorrow at ${formatTime(apt.startTime)}.`,
        data: { url: "/appointments/me" },
      });
      sent++;
    }
  }

  // 1-hour reminders
  const appointments1h = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: new Date(in1Hour.getTime() - 5 * 60 * 1000),
        lte: new Date(in1Hour.getTime() + 5 * 60 * 1000),
      },
    },
    include: {
      user: {
        include: { notificationPreferences: true },
      },
      coach: true,
    },
  });

  for (const apt of appointments1h) {
    if (apt.user.notificationPreferences?.appointmentReminder1h) {
      await sendPushNotification(apt.userId, "appointment_reminder", {
        title: "Appointment in 1 Hour ⏰",
        body: `Your session with ${apt.coach.name} starts soon!`,
        data: { url: "/appointments/me" },
        requireInteraction: true,
      });
      sent++;
    }
  }

  return NextResponse.json({ success: true, sent });
}

async function sendProgressCelebrations() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get users with step goals and yesterday's entries
  const usersWithGoals = await prisma.userGoals.findMany({
    where: {
      dailyStepsTarget: { not: null },
    },
    include: {
      user: {
        include: {
          entries: {
            where: {
              date: { gte: yesterday, lt: today },
            },
          },
          notificationPreferences: true,
        },
      },
    },
  });

  let sent = 0;
  for (const goal of usersWithGoals) {
    if (!goal.user.notificationPreferences?.stepGoalCelebrations) continue;

    const yesterdayEntry = goal.user.entries[0];
    if (yesterdayEntry?.steps && goal.dailyStepsTarget) {
      if (yesterdayEntry.steps >= goal.dailyStepsTarget) {
        const percentOver = Math.round(
          ((yesterdayEntry.steps - goal.dailyStepsTarget) / goal.dailyStepsTarget) * 100
        );

        await sendPushNotification(goal.userId, "progress_celebration", {
          title: "Step Goal Crushed! 🎉",
          body:
            percentOver > 0
              ? `You hit ${yesterdayEntry.steps.toLocaleString()} steps yesterday - ${percentOver}% over your goal!`
              : `You reached your ${goal.dailyStepsTarget.toLocaleString()} step goal yesterday!`,
          data: { url: "/client/dashboard" },
        });
        sent++;
      } else if (yesterdayEntry.steps >= goal.dailyStepsTarget * 0.8) {
        await sendPushNotification(goal.userId, "progress_celebration", {
          title: "So Close! 💪",
          body: `You hit ${yesterdayEntry.steps.toLocaleString()} steps yesterday - just ${(goal.dailyStepsTarget - yesterdayEntry.steps).toLocaleString()} shy of your goal. Keep pushing!`,
          data: { url: "/client/dashboard" },
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ success: true, sent });
}

function calculateWeekNumber(startDate: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks + 1;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
```

---

## Phase 4: Frontend Components

### 4.1 Service Worker Registration

**File: `/src/components/providers/ServiceWorkerProvider.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return <>{children}</>;
}
```

### 4.2 Push Notification Hook

**File: `/src/hooks/usePushNotifications.ts`**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscriptionStatus,
} from "@/app/actions/push-notifications";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsSupported("Notification" in window && "serviceWorker" in navigator);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const { data: subscriptionStatus, isLoading } = useQuery({
    queryKey: ["pushSubscriptionStatus"],
    queryFn: getPushSubscriptionStatus,
    enabled: isSupported,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        throw new Error("Notification permission denied");
      }

      // Get VAPID public key
      const response = await fetch("/api/push/vapid");
      const { publicKey } = await response.json();

      if (!publicKey) {
        throw new Error("Push notifications not configured");
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save to server
      const subscriptionJson = subscription.toJSON();
      await subscribeToPush({
        endpoint: subscription.endpoint,
        keys: {
          auth: subscriptionJson.keys!.auth!,
          p256dh: subscriptionJson.keys!.p256dh!,
        },
        userAgent: navigator.userAgent,
      });

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pushSubscriptionStatus"] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeFromPush(subscription.endpoint);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pushSubscriptionStatus"] });
    },
  });

  const subscribe = useCallback(() => subscribeMutation.mutate(), [subscribeMutation]);
  const unsubscribe = useCallback(() => unsubscribeMutation.mutate(), [unsubscribeMutation]);

  return {
    isSupported,
    permission,
    isSubscribed: subscriptionStatus?.hasSubscription ?? false,
    isLoading,
    subscribe,
    unsubscribe,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    error: subscribeMutation.error || unsubscribeMutation.error,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### 4.3 Notification Settings Component

**File: `/src/features/settings/NotificationSettings.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Mail, Smartphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/app/actions/push-notifications";

const preferencesSchema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  dailyCheckInReminder: z.boolean(),
  dailyCheckInTime: z.string(),
  weeklyQuestionnaireReminder: z.boolean(),
  weeklyQuestionnaireDay: z.number(),
  progressNotifications: z.boolean(),
  stepGoalCelebrations: z.boolean(),
  streakNotifications: z.boolean(),
  appointmentReminder24h: z.boolean(),
  appointmentReminder1h: z.boolean(),
  sessionReminder24h: z.boolean(),
  sessionReminder1h: z.boolean(),
  coachNoteReceived: z.boolean(),
  weeklyReviewReady: z.boolean(),
  invoiceReceived: z.boolean(),
  paymentReminders: z.boolean(),
  systemAnnouncements: z.boolean(),
});

type PreferencesForm = z.infer<typeof preferencesSchema>;

interface NotificationSettingsProps {
  role: "CLIENT" | "COACH" | "ADMIN";
}

export function NotificationSettings({ role }: NotificationSettingsProps) {
  const queryClient = useQueryClient();
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isSubscribing,
    isUnsubscribing,
  } = usePushNotifications();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: getNotificationPreferences,
  });

  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
    },
  });

  const form = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      pushEnabled: true,
      emailEnabled: true,
      dailyCheckInReminder: true,
      dailyCheckInTime: "09:00",
      weeklyQuestionnaireReminder: true,
      weeklyQuestionnaireDay: 0,
      progressNotifications: true,
      stepGoalCelebrations: true,
      streakNotifications: true,
      appointmentReminder24h: true,
      appointmentReminder1h: true,
      sessionReminder24h: true,
      sessionReminder1h: true,
      coachNoteReceived: true,
      weeklyReviewReady: true,
      invoiceReceived: true,
      paymentReminders: true,
      systemAnnouncements: true,
    },
  });

  useEffect(() => {
    if (preferences) {
      form.reset(preferences);
    }
  }, [preferences, form]);

  const onSubmit = (data: PreferencesForm) => {
    mutation.mutate(data);
  };

  const handleToggle = (field: keyof PreferencesForm, value: boolean) => {
    form.setValue(field, value);
    mutation.mutate({ [field]: value });
  };

  const dayOptions = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  const timeOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `${i.toString().padStart(2, "0")}:00`,
    label: `${i === 0 ? "12" : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"}`,
  }));

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications on your device even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in this browser.
            </p>
          ) : permission === "denied" ? (
            <p className="text-sm text-destructive">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          ) : isSubscribed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Bell className="h-4 w-4" />
                Push notifications enabled
              </div>
              <Button
                variant="outline"
                onClick={unsubscribe}
                disabled={isUnsubscribing}
              >
                {isUnsubscribing ? "Disabling..." : "Disable"}
              </Button>
            </div>
          ) : (
            <Button onClick={subscribe} disabled={isSubscribing}>
              {isSubscribing ? "Enabling..." : "Enable Push Notifications"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Master Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <Label>Push Notifications</Label>
            </div>
            <Switch
              checked={form.watch("pushEnabled")}
              onCheckedChange={(v) => handleToggle("pushEnabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <Label>Email Notifications</Label>
            </div>
            <Switch
              checked={form.watch("emailEnabled")}
              onCheckedChange={(v) => handleToggle("emailEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-in Reminders */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Check-in Reminders</CardTitle>
            <CardDescription>
              Get reminded to log your daily progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Daily Reminders</Label>
              <Switch
                checked={form.watch("dailyCheckInReminder")}
                onCheckedChange={(v) => handleToggle("dailyCheckInReminder", v)}
              />
            </div>
            {form.watch("dailyCheckInReminder") && (
              <div className="flex items-center gap-4">
                <Label>Reminder Time</Label>
                <Select
                  value={form.watch("dailyCheckInTime")}
                  onValueChange={(v) => {
                    form.setValue("dailyCheckInTime", v);
                    mutation.mutate({ dailyCheckInTime: v });
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Questionnaire Reminders */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Questionnaire Reminders</CardTitle>
            <CardDescription>
              Get reminded to complete your weekly questionnaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Weekly Reminders</Label>
              <Switch
                checked={form.watch("weeklyQuestionnaireReminder")}
                onCheckedChange={(v) => handleToggle("weeklyQuestionnaireReminder", v)}
              />
            </div>
            {form.watch("weeklyQuestionnaireReminder") && (
              <div className="flex items-center gap-4">
                <Label>Reminder Day</Label>
                <Select
                  value={form.watch("weeklyQuestionnaireDay").toString()}
                  onValueChange={(v) => {
                    const day = parseInt(v);
                    form.setValue("weeklyQuestionnaireDay", day);
                    mutation.mutate({ weeklyQuestionnaireDay: day });
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress & Motivation */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Progress & Motivation</CardTitle>
            <CardDescription>
              Celebrate your achievements and stay motivated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Step Goal Celebrations</Label>
              <Switch
                checked={form.watch("stepGoalCelebrations")}
                onCheckedChange={(v) => handleToggle("stepGoalCelebrations", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Streak Notifications</Label>
              <Switch
                checked={form.watch("streakNotifications")}
                onCheckedChange={(v) => handleToggle("streakNotifications", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Progress Updates</Label>
              <Switch
                checked={form.watch("progressNotifications")}
                onCheckedChange={(v) => handleToggle("progressNotifications", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment & Session Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>24 Hours Before</Label>
            <Switch
              checked={form.watch("appointmentReminder24h")}
              onCheckedChange={(v) => handleToggle("appointmentReminder24h", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>1 Hour Before</Label>
            <Switch
              checked={form.watch("appointmentReminder1h")}
              onCheckedChange={(v) => handleToggle("appointmentReminder1h", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Coach Notifications (for Clients) */}
      {role === "CLIENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Coach Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>New Coach Notes</Label>
              <Switch
                checked={form.watch("coachNoteReceived")}
                onCheckedChange={(v) => handleToggle("coachNoteReceived", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Weekly Review Ready</Label>
              <Switch
                checked={form.watch("weeklyReviewReady")}
                onCheckedChange={(v) => handleToggle("weeklyReviewReady", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Invoice Received</Label>
            <Switch
              checked={form.watch("invoiceReceived")}
              onCheckedChange={(v) => handleToggle("invoiceReceived", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Payment Reminders</Label>
            <Switch
              checked={form.watch("paymentReminders")}
              onCheckedChange={(v) => handleToggle("paymentReminders", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>System Announcements</Label>
            <Switch
              checked={form.watch("systemAnnouncements")}
              onCheckedChange={(v) => handleToggle("systemAnnouncements", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 5: Notification Triggers

### 5.1 Notification Types by Persona

#### CLIENT Notifications

| Notification | Trigger | Default Time | Configurable |
|-------------|---------|--------------|--------------|
| Daily Check-in Reminder | Cron job if no entry today | 9:00 AM | Yes (time) |
| Weekly Questionnaire | Sunday cron | 10:00 AM Sunday | Yes (day, time) |
| Step Goal Celebration | After HealthKit sync | Immediate | Yes (on/off) |
| Streak Notification | After consecutive entries | Immediate | Yes (on/off) |
| Appointment 24h | Cron 24h before | 24h before | Yes (on/off) |
| Appointment 1h | Cron 1h before | 1h before | Yes (on/off) |
| Coach Note Received | On coach note create | Immediate | Yes (on/off) |
| Weekly Review Ready | On review completion | Immediate | Yes (on/off) |
| Invoice Received | On invoice create | Immediate | Yes (on/off) |
| Payment Reminder | Cron for overdue | 48h after due | Yes (on/off) |

#### COACH Notifications

| Notification | Trigger | Default Time | Configurable |
|-------------|---------|--------------|--------------|
| Client Check-in | On entry create | Immediate | Yes (on/off) |
| Questionnaire Submitted | On completion | Immediate | Yes (on/off) |
| Attention Score Alert | On red/amber score | Immediate | Yes (on/off) |
| Session Reminder 24h | Cron 24h before | 24h before | Yes (on/off) |
| Session Reminder 1h | Cron 1h before | 1h before | Yes (on/off) |
| Payment Received | On Stripe webhook | Immediate | Yes (on/off) |

### 5.2 Trigger Integration Points

**Modify existing server actions to trigger notifications:**

```typescript
// In src/app/actions/entries.ts
export async function upsertEntry(data: EntryData) {
  // ... existing logic ...

  // After successful upsert, send coach notification
  if (result.isNew) {
    await sendClientCheckInNotification(userId, entry);
    await checkAndSendStreakNotification(userId);
  }
}

// In src/app/actions/review-queue.ts
export async function submitWeeklyCoachResponse(data: ReviewData) {
  // ... existing logic ...

  // Notify client that review is ready
  await sendPushNotification(clientId, "weekly_review", {
    title: "Your Weekly Review is Ready",
    body: `${coachName} has reviewed your Week ${weekNumber} progress.`,
    data: { url: "/client/dashboard" },
  });
}

// In src/app/actions/invoices.ts
export async function createInvoice(data: InvoiceData) {
  // ... existing logic ...

  await sendPushNotification(userId, "invoice", {
    title: "New Invoice",
    body: `Invoice for ${month} - ${formatCurrency(amount)}`,
    data: { url: "/invoices/me" },
  });
}
```

---

## Phase 6: iOS & Android Specifics

### 6.1 iOS Requirements (iOS 16.4+)

**Installation Flow:**
1. User visits site in Safari
2. Tap Share → "Add to Home Screen"
3. Open app from home screen
4. Permission prompt appears
5. User grants notification permission

**Limitations:**
- No background sync
- No periodic background fetch
- Notifications only when installed as PWA
- Badge API limited
- No silent push notifications

**Required HTML:**
```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### 6.2 Android Requirements

**Installation Flow:**
1. Chrome shows "Add to Home Screen" banner
2. User accepts installation
3. Notification permission requested
4. Works in background

**Capabilities:**
- Full push notification support
- Background sync
- Badge API (on supported launchers)
- Silent notifications
- Persistent notifications

### 6.3 Cross-Platform Testing Matrix

| Feature | iOS Safari | Android Chrome | Desktop Chrome | Desktop Safari | Firefox |
|---------|-----------|----------------|----------------|----------------|---------|
| Install PWA | ✅ | ✅ | ✅ | ❌ | ✅ |
| Push Notifications | ✅* | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ❌ | ✅ | ✅ | ❌ | ✅ |
| Badge API | ❌ | ✅ | ✅ | ❌ | ❌ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ | ✅ |

*iOS requires PWA installation

---

## Phase 7: Cron Job Setup

> **✅ IMPLEMENTED** - Vercel Cron is configured in `vercel.json`

### 7.1 Vercel Cron Configuration (Recommended)

Vercel Cron is configured in `vercel.json` and will automatically run on deployment:

**File: `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications?type=daily_checkin_reminder",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/notifications?type=weekly_questionnaire_reminder",
      "schedule": "0 10 * * 0"
    },
    {
      "path": "/api/cron/notifications?type=appointment_reminders",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/notifications?type=session_reminders",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/notifications?type=progress_celebrations",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/notifications?type=streak_notifications",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/notifications?type=payment_reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

### 7.2 Cron Schedule Reference

| Job | Schedule | Description |
|-----|----------|-------------|
| `daily_checkin_reminder` | `0 * * * *` | Every hour (matches user's preferred time) |
| `weekly_questionnaire_reminder` | `0 10 * * 0` | Sundays at 10 AM UTC |
| `appointment_reminders` | `*/5 * * * *` | Every 5 minutes |
| `session_reminders` | `*/5 * * * *` | Every 5 minutes |
| `progress_celebrations` | `0 8 * * *` | Daily at 8 AM UTC |
| `streak_notifications` | `0 9 * * *` | Daily at 9 AM UTC |
| `payment_reminders` | `0 10 * * *` | Daily at 10 AM UTC |

### 7.3 Vercel Setup Instructions

1. **Add Environment Variable** in Vercel Dashboard → Settings → Environment Variables:
   ```
   CRON_SECRET=<generate-with-openssl-rand-base64-32>
   ```

2. **Deploy** - Vercel automatically detects `vercel.json` and registers cron jobs

3. **Monitor** - View cron execution in Vercel Dashboard → Logs → Filter by "Cron"

4. **Limits** - Vercel Cron availability by plan:
   - **Hobby**: Once per day max
   - **Pro**: Up to every minute
   - **Enterprise**: Up to every minute with higher limits

### 7.4 Alternative: External Cron Services

If not using Vercel, use any cron service (AWS CloudWatch, cron-job.org, etc.):

```bash
# Daily check-in reminders (every hour)
0 * * * * curl -X POST https://your-domain.com/api/cron/notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"daily_checkin_reminder"}'

# Weekly questionnaire reminders (Sunday 10 AM UTC)
0 10 * * 0 curl -X POST https://your-domain.com/api/cron/notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"weekly_questionnaire_reminder"}'

# Appointment reminders (every 5 minutes)
*/5 * * * * curl -X POST https://your-domain.com/api/cron/notifications \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"appointment_reminders"}'
```

---

## Phase 8: Additional Notification Ideas

### 8.1 Motivational Notifications

| Type | Trigger | Example Message |
|------|---------|-----------------|
| Step Milestone | Steps >= 10k | "🎉 10,000 steps today! You're on fire!" |
| Weight Progress | Weight trending down | "📉 You've lost 2 lbs this week. Keep it up!" |
| Workout Streak | 3+ consecutive days | "💪 3-day workout streak! Don't break the chain!" |
| Sleep Improvement | Sleep quality improving | "😴 Your sleep has improved 15% this week!" |
| Personal Record | New max weight/steps | "🏆 New personal record: 15,000 steps!" |

### 8.2 Coach-Specific Notifications

| Type | Trigger | Example Message |
|------|---------|-----------------|
| Client at Risk | Attention score red | "⚠️ John Doe needs attention - no check-in for 5 days" |
| Review Queue Full | 5+ pending reviews | "📋 You have 5 clients awaiting review" |
| New Registration | Client joins session | "👋 Sarah Smith registered for tomorrow's HIIT class" |
| Session Reminder | 1h before class | "⏰ HIIT class starts in 1 hour - 8 registered" |

### 8.3 Admin Notifications

| Type | Trigger | Example Message |
|------|---------|-----------------|
| System Alert | Error rate spike | "🚨 Error rate increased 50% in last hour" |
| Usage Milestone | 100th user | "🎊 Centurion hit 100 users!" |
| Revenue Update | Daily revenue | "💰 Daily revenue: $450" |
| Security Alert | Failed login attempts | "🔒 5 failed login attempts for admin@example.com" |

---

## Phase 9: Implementation Checklist

### Database & Schema
- [ ] Add `PushSubscription` model
- [ ] Add `NotificationPreference` model
- [ ] Add `NotificationLog` model
- [ ] Add relations to `User` model
- [ ] Run migration

### Environment & Config
- [ ] Generate VAPID keys
- [ ] Add env variables
- [ ] Configure cron service

### Backend
- [ ] Create `/src/lib/push-notifications.ts`
- [ ] Create `/src/app/actions/push-notifications.ts`
- [ ] Create `/src/app/api/push/vapid/route.ts`
- [ ] Create `/src/app/api/cron/notifications/route.ts`
- [ ] Add notification triggers to existing actions

### Frontend
- [ ] Create app-wide manifest
- [ ] Create main service worker with push support
- [ ] Create `ServiceWorkerProvider`
- [ ] Create `usePushNotifications` hook
- [ ] Create `NotificationSettings` component
- [ ] Add iOS meta tags to layout
- [ ] Create PWA icons (all sizes)
- [ ] Create offline page

### Testing
- [ ] Unit tests for push notification logic
- [ ] E2E tests for subscription flow
- [ ] Manual testing on iOS
- [ ] Manual testing on Android
- [ ] Manual testing on desktop browsers

### Documentation
- [ ] Update CLAUDE.md with notification patterns
- [ ] Document VAPID key rotation procedure
- [ ] Add troubleshooting guide

---

## Dependencies to Add

```bash
npm install web-push
npm install -D @types/web-push
```

---

## Timeline Estimate

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | PWA Foundation | Small |
| 2 | Database Schema | Small |
| 3 | Backend Implementation | Medium |
| 4 | Frontend Components | Medium |
| 5 | Notification Triggers | Medium |
| 6 | iOS/Android Testing | Small |
| 7 | Cron Setup | Small |
| 8 | Polish & Documentation | Small |

---

## Security Considerations

1. **VAPID Key Security**: Store private key in env vars only
2. **Cron Authentication**: Use bearer token for cron endpoints
3. **Subscription Validation**: Validate endpoint URLs
4. **Rate Limiting**: Limit subscription attempts per user
5. **Permission Logging**: Audit all notification sends
6. **Data Privacy**: Include notification preferences in GDPR export

---

## Conclusion

This plan provides a comprehensive roadmap for implementing PWA support with push notifications in Centurion. The implementation prioritizes:

1. **Cross-platform compatibility** (iOS, Android, Desktop)
2. **User control** (granular notification preferences)
3. **Role-based notifications** (CLIENT vs COACH personas)
4. **Motivational engagement** (progress celebrations, streaks)
5. **Reliability** (offline support, background sync)

The phased approach allows for incremental delivery while maintaining a cohesive architecture.
