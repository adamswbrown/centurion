import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendPushNotification,
  createDailyCheckInReminder,
  createWeeklyQuestionnaireReminder,
  createAppointmentReminder,
  createSessionReminder,
  createStepGoalCelebration,
  createStreakNotification,
  createPaymentReminderNotification,
} from "@/lib/push-notifications"

// Verify cron secret for security
// Vercel Cron automatically sends CRON_SECRET in Authorization header
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Allow in development without secret configured
  if (process.env.NODE_ENV === "development" && !cronSecret) {
    return true
  }

  // Verify using CRON_SECRET (Vercel automatically adds this header)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  return false
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { type: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { type } = body

  switch (type) {
    case "daily_checkin_reminder":
      return await sendDailyCheckInReminders()
    case "weekly_questionnaire_reminder":
      return await sendWeeklyQuestionnaireReminders()
    case "appointment_reminders":
      return await sendAppointmentReminders()
    case "session_reminders":
      return await sendSessionReminders()
    case "progress_celebrations":
      return await sendProgressCelebrations()
    case "streak_notifications":
      return await sendStreakNotifications()
    case "payment_reminders":
      return await sendPaymentReminders()
    default:
      return NextResponse.json(
        { error: `Unknown notification type: ${type}` },
        { status: 400 }
      )
  }
}

// Also support GET for simple cron services (with type as query param)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get("type")
  if (!type) {
    return NextResponse.json({ error: "Missing type parameter" }, { status: 400 })
  }

  // Reuse POST logic
  const fakeRequest = {
    json: async () => ({ type }),
    headers: request.headers,
  } as NextRequest

  return POST(fakeRequest)
}

async function sendDailyCheckInReminders() {
  const now = new Date()
  const currentHour = now.getUTCHours().toString().padStart(2, "0")
  const currentMinute = Math.floor(now.getUTCMinutes() / 15) * 15 // Round to 15-min intervals
  const currentTime = `${currentHour}:${currentMinute.toString().padStart(2, "0")}`

  // Find users with daily check-in enabled around current time (within 15 min window)
  const timeStart = `${currentHour}:00`
  const timeEnd = `${currentHour}:59`

  const users = await prisma.notificationPreference.findMany({
    where: {
      dailyCheckInReminder: true,
      pushEnabled: true,
      dailyCheckInTime: {
        gte: timeStart,
        lte: timeEnd,
      },
    },
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  })

  // Filter to only CLIENT users
  const clientUsers = users.filter((u) => u.user.role === "CLIENT")

  // Check which users haven't logged today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let sent = 0
  let skipped = 0

  for (const pref of clientUsers) {
    const hasEntry = await prisma.entry.findFirst({
      where: {
        userId: pref.userId,
        date: { gte: today },
      },
    })

    if (!hasEntry) {
      const result = await sendPushNotification(
        pref.userId,
        "daily_reminder",
        createDailyCheckInReminder(pref.user.name || undefined)
      )
      sent += result.sent
    } else {
      skipped++
    }
  }

  return NextResponse.json({
    success: true,
    type: "daily_checkin_reminder",
    sent,
    skipped,
    checked: clientUsers.length,
  })
}

async function sendWeeklyQuestionnaireReminders() {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0 = Sunday

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
            include: {
              cohort: {
                select: { id: true, name: true, startDate: true, status: true },
              },
            },
          },
        },
      },
    },
  })

  let sent = 0

  for (const pref of users) {
    for (const membership of pref.user.cohortMemberships) {
      const cohort = membership.cohort
      if (cohort.status !== "ACTIVE") continue

      const weekNumber = calculateWeekNumber(cohort.startDate)
      if (weekNumber < 1 || weekNumber > 12) continue

      // Check if questionnaire exists and not completed
      const existingResponse = await prisma.weeklyQuestionnaireResponse.findFirst({
        where: {
          userId: pref.userId,
          weekNumber,
          bundle: { cohortId: cohort.id },
        },
      })

      // Send reminder if no response or response is in progress
      if (!existingResponse || existingResponse.status === "IN_PROGRESS") {
        const result = await sendPushNotification(
          pref.userId,
          "weekly_questionnaire",
          createWeeklyQuestionnaireReminder(cohort.name, weekNumber, cohort.id)
        )
        sent += result.sent
      }
    }
  }

  return NextResponse.json({
    success: true,
    type: "weekly_questionnaire_reminder",
    sent,
  })
}

async function sendAppointmentReminders() {
  const now = new Date()

  // 24-hour window (23-25 hours from now)
  const in24HoursStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in24HoursEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // 1-hour window (55-65 minutes from now)
  const in1HourStart = new Date(now.getTime() + 55 * 60 * 1000)
  const in1HourEnd = new Date(now.getTime() + 65 * 60 * 1000)

  let sent = 0

  // 24-hour reminders
  const appointments24h = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: in24HoursStart,
        lte: in24HoursEnd,
      },
    },
    include: {
      user: {
        include: { notificationPreference: true },
      },
      coach: { select: { name: true } },
    },
  })

  for (const apt of appointments24h) {
    if (apt.user.notificationPreference?.appointmentReminder24h !== false) {
      const result = await sendPushNotification(
        apt.userId,
        "appointment_reminder",
        createAppointmentReminder(
          apt.coach.name || "your coach",
          formatTime(apt.startTime),
          false
        )
      )
      sent += result.sent
    }
  }

  // 1-hour reminders
  const appointments1h = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: in1HourStart,
        lte: in1HourEnd,
      },
    },
    include: {
      user: {
        include: { notificationPreference: true },
      },
      coach: { select: { name: true } },
    },
  })

  for (const apt of appointments1h) {
    if (apt.user.notificationPreference?.appointmentReminder1h !== false) {
      const result = await sendPushNotification(
        apt.userId,
        "appointment_reminder",
        createAppointmentReminder(
          apt.coach.name || "your coach",
          formatTime(apt.startTime),
          true
        )
      )
      sent += result.sent
    }
  }

  return NextResponse.json({
    success: true,
    type: "appointment_reminders",
    sent,
    checked24h: appointments24h.length,
    checked1h: appointments1h.length,
  })
}

async function sendSessionReminders() {
  const now = new Date()

  // 24-hour window
  const in24HoursStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in24HoursEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // 1-hour window
  const in1HourStart = new Date(now.getTime() + 55 * 60 * 1000)
  const in1HourEnd = new Date(now.getTime() + 65 * 60 * 1000)

  let sent = 0

  // 24-hour session reminders
  const sessions24h = await prisma.classSession.findMany({
    where: {
      startTime: {
        gte: in24HoursStart,
        lte: in24HoursEnd,
      },
      status: "SCHEDULED",
    },
    include: {
      registrations: {
        where: { status: "REGISTERED" },
        include: {
          user: {
            include: { notificationPreference: true },
          },
        },
      },
    },
  })

  for (const session of sessions24h) {
    for (const reg of session.registrations) {
      if (reg.user.notificationPreference?.sessionReminder24h !== false) {
        const result = await sendPushNotification(
          reg.userId,
          "session_reminder",
          createSessionReminder(
            session.title,
            formatTime(session.startTime),
            false,
            session.registrations.length
          )
        )
        sent += result.sent
      }
    }
  }

  // 1-hour session reminders
  const sessions1h = await prisma.classSession.findMany({
    where: {
      startTime: {
        gte: in1HourStart,
        lte: in1HourEnd,
      },
      status: "SCHEDULED",
    },
    include: {
      registrations: {
        where: { status: "REGISTERED" },
        include: {
          user: {
            include: { notificationPreference: true },
          },
        },
      },
    },
  })

  for (const session of sessions1h) {
    for (const reg of session.registrations) {
      if (reg.user.notificationPreference?.sessionReminder1h !== false) {
        const result = await sendPushNotification(
          reg.userId,
          "session_reminder",
          createSessionReminder(session.title, formatTime(session.startTime), true)
        )
        sent += result.sent
      }
    }
  }

  return NextResponse.json({
    success: true,
    type: "session_reminders",
    sent,
  })
}

async function sendProgressCelebrations() {
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

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
          notificationPreference: true,
        },
      },
    },
  })

  let sent = 0

  for (const goal of usersWithGoals) {
    if (!goal.user.notificationPreference?.stepGoalCelebrations) continue

    const yesterdayEntry = goal.user.entries[0]
    if (yesterdayEntry?.steps && goal.dailyStepsTarget) {
      // Only celebrate if they hit at least 80% of goal
      if (yesterdayEntry.steps >= goal.dailyStepsTarget * 0.8) {
        const result = await sendPushNotification(
          goal.userId,
          "progress_celebration",
          createStepGoalCelebration(yesterdayEntry.steps, goal.dailyStepsTarget)
        )
        sent += result.sent
      }
    }
  }

  return NextResponse.json({
    success: true,
    type: "progress_celebrations",
    sent,
    checked: usersWithGoals.length,
  })
}

async function sendStreakNotifications() {
  // Find users who have checked in for multiple consecutive days
  const users = await prisma.notificationPreference.findMany({
    where: {
      streakNotifications: true,
      pushEnabled: true,
    },
    include: {
      user: {
        select: { id: true, role: true },
      },
    },
  })

  const clientUsers = users.filter((u) => u.user.role === "CLIENT")
  let sent = 0

  for (const pref of clientUsers) {
    const streakDays = await calculateStreak(pref.userId)

    // Send notifications at milestone days: 3, 5, 7, 14, 21, 30, etc.
    const milestones = [3, 5, 7, 14, 21, 30, 60, 90, 100]
    if (milestones.includes(streakDays)) {
      const result = await sendPushNotification(
        pref.userId,
        "streak_notification",
        createStreakNotification(streakDays)
      )
      sent += result.sent
    }
  }

  return NextResponse.json({
    success: true,
    type: "streak_notifications",
    sent,
  })
}

async function sendPaymentReminders() {
  const now = new Date()

  // Find overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      paymentStatus: "OVERDUE",
    },
    include: {
      user: {
        include: { notificationPreference: true },
      },
    },
  })

  let sent = 0

  for (const invoice of overdueInvoices) {
    if (!invoice.user.notificationPreference?.paymentReminders) continue

    const daysOverdue = Math.floor(
      (now.getTime() - invoice.month.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Only send every few days to avoid spam
    if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7 || daysOverdue % 7 === 0) {
      const result = await sendPushNotification(
        invoice.userId,
        "invoice",
        createPaymentReminderNotification(
          `$${invoice.totalAmount.toFixed(2)}`,
          daysOverdue
        )
      )
      sent += result.sent
    }
  }

  return NextResponse.json({
    success: true,
    type: "payment_reminders",
    sent,
  })
}

// Helper functions
function calculateWeekNumber(startDate: Date): number {
  const now = new Date()
  const diffTime = now.getTime() - startDate.getTime()
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks + 1
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: process.env.TIME_ZONE || "America/New_York",
  })
}

async function calculateStreak(userId: number): Promise<number> {
  const entries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 100,
    select: { date: true },
  })

  if (entries.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let expectedDate = today

  for (const entry of entries) {
    const entryDate = new Date(entry.date)
    entryDate.setUTCHours(0, 0, 0, 0)

    // Allow for today or yesterday as the streak start
    if (streak === 0) {
      const diffDays = Math.floor(
        (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays > 1) return 0 // No recent entry
      expectedDate = entryDate
    }

    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000)
    } else if (entryDate.getTime() < expectedDate.getTime()) {
      // Gap in streak
      break
    }
  }

  return streak
}
