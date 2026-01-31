/**
 * Test Data Seed Script for Centurion
 *
 * This script creates a complete set of test data for validating all functionality
 * through Phase 7 & 8 (Check-Ins and Questionnaires).
 *
 * Usage:
 *   npx tsx testing/seed-test-data.ts
 */

import { PrismaClient, Role, CohortStatus, PaymentStatus, ResponseStatus } from "@prisma/client"
import fs from "fs"
import path from "path"
import { hash } from "bcryptjs"
import { addDays, subDays, addWeeks, startOfDay } from "date-fns"
import { DEFAULT_TEMPLATES } from "../src/lib/default-questionnaire-templates"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // Clear existing data (in reverse dependency order)
  console.log("🧹 Clearing existing test data...")
  await prisma.weeklyQuestionnaireResponse.deleteMany()
  await prisma.questionnaireBundle.deleteMany()
  await prisma.entry.deleteMany()
  await prisma.cohortCheckInConfig.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.cohortMembership.deleteMany()
  await prisma.coachCohortMembership.deleteMany()
  await prisma.cohort.deleteMany()
  await prisma.sessionRegistration.deleteMany()
  await prisma.classSession.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  console.log("👤 Creating users...")
  const password = await hash("password123", 12)

  // Admin user
  await prisma.user.create({
    data: {
      email: "admin@centurion.test",
      name: "Admin User",
      password,
      role: Role.ADMIN,
      emailVerified: true,
    },
  })

  // Seed clients (static for test consistency)
  const clients = await Promise.all([
    prisma.user.create({
      data: {
        email: "client1@centurion.test",
        name: "Alice Client",
        password,
        role: Role.CLIENT,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "client2@centurion.test",
        name: "Bob Client",
        password,
        role: Role.CLIENT,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "client3@centurion.test",
        name: "Charlie Client",
        password,
        role: Role.CLIENT,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "client4@centurion.test",
        name: "Diana Client",
        password,
        role: Role.CLIENT,
        emailVerified: true,
      },
    }),
  ])

  // Seed coaches from instructors.json
  const instructorsPath = path.join(__dirname, "instructors.json")
  const instructorsData = JSON.parse(fs.readFileSync(instructorsPath, "utf-8")).results
  const coachUsers = await Promise.all(
    instructorsData.map((inst: any, idx: number) =>
      prisma.user.create({
        data: {
          email: `coach${idx + 1}@centurion.test`,
          name: inst.name,
          password,
          role: Role.COACH,
          emailVerified: true,
        },
      })
    )
  )
  console.log(`✅ Created ${clients.length + coachUsers.length + 1} users (clients + coaches + admin)`)

  // Create cohorts
  console.log("🎯 Creating cohorts...")
  const activeCohort = await prisma.cohort.create({
    data: {
      name: "Spring 2026 Fitness Challenge",
      description: "12-week transformation program focusing on strength and nutrition",
      startDate: subDays(new Date(), 14), // Started 2 weeks ago
      endDate: addWeeks(new Date(), 10), // Ends in 10 weeks
      status: CohortStatus.ACTIVE,
    },
  })

  const upcomingCohort = await prisma.cohort.create({
    data: {
      name: "Summer 2026 Bootcamp",
      description: "Intensive 8-week summer conditioning program",
      startDate: addWeeks(new Date(), 2), // Starts in 2 weeks
      endDate: addWeeks(new Date(), 10),
      status: CohortStatus.ACTIVE,
    },
  })

  const completedCohort = await prisma.cohort.create({
    data: {
      name: "Winter 2025 Challenge",
      description: "Completed cohort for testing historical data",
      startDate: subDays(new Date(), 90),
      endDate: subDays(new Date(), 7),
      status: CohortStatus.COMPLETED,
    },
  })

  console.log("✅ Created 3 cohorts")

  // Assign coaches to cohorts
  console.log("👨‍🏫 Assigning coaches to cohorts...")
  await prisma.coachCohortMembership.createMany({
    data: [
      { cohortId: activeCohort.id, coachId: coachUsers[0]?.id },
      { cohortId: activeCohort.id, coachId: coachUsers[1]?.id }, // Multi-coach
      { cohortId: upcomingCohort.id, coachId: coachUsers[0]?.id },
      { cohortId: completedCohort.id, coachId: coachUsers[1]?.id },
    ],
  })

  // Assign members to cohorts
  console.log("👥 Assigning members to cohorts...")
  await prisma.cohortMembership.createMany({
    data: [
      // Active cohort members
      {
        cohortId: activeCohort.id,
        userId: clients[0].id,
        status: "ACTIVE",
        joinedAt: subDays(new Date(), 14),
      },
      {
        cohortId: activeCohort.id,
        userId: clients[1].id,
        status: "ACTIVE",
        joinedAt: subDays(new Date(), 14),
      },
      {
        cohortId: activeCohort.id,
        userId: clients[2].id,
        status: "PAUSED",
        joinedAt: subDays(new Date(), 14),
      },
      // Upcoming cohort
      {
        cohortId: upcomingCohort.id,
        userId: clients[2].id,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      {
        cohortId: upcomingCohort.id,
        userId: clients[3].id,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    ],
  })

  // Create check-in config for active cohort
  console.log("📋 Creating check-in configs...")
  await prisma.cohortCheckInConfig.create({
    data: {
      cohortId: activeCohort.id,
      prompts: {
        weight: { enabled: true, label: "Weight (lbs)" },
        steps: { enabled: true, label: "Daily Steps" },
        calories: { enabled: true, label: "Calories Consumed" },
        sleepQuality: { enabled: true, label: "Sleep Quality (1-10)" },
        perceivedStress: { enabled: true, label: "Stress Level (1-10)" },
        notes: { enabled: true, label: "Daily Notes" },
      },
    },
  })

  // Create full-featured daily check-in entries for all clients
  console.log("📊 Creating full-featured check-in entries...")
  const entriesData: Array<{
    userId: number
    date: Date
    weight: number | null
    steps: number | null
    calories: number | null
    sleepQuality: number | null
    perceivedStress: number | null
    notes: string | null
    customResponses: Record<string, unknown> | null
    dataSources: Record<string, string> | null
  }> = []

  const aliceNotes = [
    "Feeling great today! Hit all my macros.",
    "Legs are sore from yesterday's workout but pushed through cardio.",
    "Meal prep paid off - stayed on plan all day.",
    "Busy day at work, squeezed in a quick 30min session.",
    "Rest day. Focused on stretching and recovery.",
    "Morning run felt amazing, best pace this month!",
    "Struggled with cravings in the evening but stayed strong.",
    "Had a social dinner out - estimated calories as best I could.",
    "Great sleep last night, woke up feeling refreshed.",
    "Tough day mentally. Skipped the gym but hit step goal.",
    "New PR on deadlift! Feeling strong.",
    "Water intake was excellent today - 3L+.",
    null,
    null,
    null,
  ]

  const bobNotes = [
    "Getting into the groove finally.",
    "Missed morning alarm, did evening workout instead.",
    "Work stress made it hard to focus on nutrition.",
    null,
    null,
    null,
  ]

  const charlieNotes = [
    "Back at it after a break. Taking things slow.",
    "Feeling motivated again after talking to coach.",
    null,
    null,
  ]

  // --- Alice (Client 1): Dedicated & consistent ---
  // 42 days of daily check-ins showing a weight loss journey
  for (let i = 0; i < 42; i++) {
    const date = startOfDay(subDays(new Date(), i))
    // Gradual weight loss from 182 to ~173 with natural fluctuation
    const baseWeight = 182 - (i * 0.2)
    const weightFluctuation = (Math.sin(i * 0.7) * 0.8) + (Math.random() * 0.6 - 0.3)
    const weight = Math.round((baseWeight + weightFluctuation) * 10) / 10

    // Steps: generally high with weekend peaks
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseSteps = isWeekend ? 12000 : 9000
    const steps = baseSteps + Math.floor(Math.random() * 3000)

    // Calories: disciplined, trending down slightly
    const baseCals = 1900 - Math.floor(i * 2)
    const calories = Math.max(1600, baseCals + Math.floor(Math.random() * 300 - 150))

    // Sleep: generally good (7-9), occasional bad nights
    const sleepQuality = i % 7 === 3 ? 4 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 3)

    // Stress: low-moderate, spikes mid-week
    const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5
    const perceivedStress = isWorkDay
      ? 3 + Math.floor(Math.random() * 3)
      : 1 + Math.floor(Math.random() * 3)

    // High stress event around day 20
    const stressOverride = (i >= 19 && i <= 22) ? 7 + Math.floor(Math.random() * 3) : null

    entriesData.push({
      userId: clients[0].id,
      date,
      weight,
      steps,
      calories,
      sleepQuality: Math.min(10, sleepQuality),
      perceivedStress: stressOverride ?? Math.min(10, perceivedStress),
      notes: aliceNotes[i % aliceNotes.length],
      customResponses: i < 14 ? {
        mood: ["great", "good", "okay", "tired", "energized"][Math.floor(Math.random() * 5)],
        water_litres: Math.round((2 + Math.random() * 1.5) * 10) / 10,
        protein_grams: 120 + Math.floor(Math.random() * 40),
      } : null,
      dataSources: i % 3 === 0
        ? { weight: "manual", steps: "healthkit", calories: "myfitnesspal" }
        : { weight: "manual", steps: "manual", calories: "manual" },
    })
  }

  // --- Bob (Client 2): Sporadic but improving ---
  // ~20 entries over 42 days, getting more consistent recently
  for (let i = 0; i < 42; i++) {
    const date = startOfDay(subDays(new Date(), i))
    // Recent weeks: check-in ~5/7 days. Older weeks: ~2/7 days
    const recentConsistency = i < 14 ? 0.7 : i < 28 ? 0.4 : 0.25
    if (Math.random() > recentConsistency) continue

    const weight = Math.round((195 - i * 0.1 + Math.random() * 1.5 - 0.75) * 10) / 10
    const steps = 6000 + Math.floor(Math.random() * 6000)
    const calories = 2200 + Math.floor(Math.random() * 600 - 300)
    const sleepQuality = 5 + Math.floor(Math.random() * 4)
    const perceivedStress = 4 + Math.floor(Math.random() * 4)

    entriesData.push({
      userId: clients[1].id,
      date,
      weight,
      steps,
      calories,
      sleepQuality: Math.min(10, sleepQuality),
      perceivedStress: Math.min(10, perceivedStress),
      notes: bobNotes[i % bobNotes.length],
      customResponses: i < 7 ? {
        mood: ["okay", "tired", "good"][Math.floor(Math.random() * 3)],
        water_litres: Math.round((1.5 + Math.random() * 1) * 10) / 10,
      } : null,
      dataSources: { weight: "manual", steps: "manual", calories: "manual" },
    })
  }

  // --- Charlie (Client 3): Paused member with historical data ---
  // Check-ins from 60-20 days ago (before pause), then a few recent ones
  for (let i = 20; i < 60; i++) {
    const date = startOfDay(subDays(new Date(), i))
    if (Math.random() > 0.6) continue // ~60% consistency before pause

    const weight = Math.round((210 - (60 - i) * 0.15 + Math.random() * 2 - 1) * 10) / 10
    const steps = 5000 + Math.floor(Math.random() * 4000)
    const calories = 2400 + Math.floor(Math.random() * 400 - 200)
    const sleepQuality = 4 + Math.floor(Math.random() * 4) // poorer sleep
    const perceivedStress = 5 + Math.floor(Math.random() * 4) // higher stress

    entriesData.push({
      userId: clients[2].id,
      date,
      weight,
      steps,
      calories,
      sleepQuality: Math.min(10, sleepQuality),
      perceivedStress: Math.min(10, perceivedStress),
      notes: charlieNotes[i % charlieNotes.length],
      customResponses: null,
      dataSources: { weight: "manual", steps: "manual", calories: "manual" },
    })
  }
  // Charlie's recent comeback: 3 entries in last week
  for (let i = 0; i < 3; i++) {
    const date = startOfDay(subDays(new Date(), i * 2))
    entriesData.push({
      userId: clients[2].id,
      date,
      weight: Math.round((205 + Math.random() * 1.5) * 10) / 10,
      steps: 4000 + Math.floor(Math.random() * 3000),
      calories: 2300 + Math.floor(Math.random() * 300),
      sleepQuality: 5 + Math.floor(Math.random() * 3),
      perceivedStress: 6 + Math.floor(Math.random() * 3),
      notes: i === 0 ? "First check-in back. Ready to restart." : null,
      customResponses: null,
      dataSources: { weight: "manual", steps: "manual", calories: "manual" },
    })
  }

  // --- Diana (Client 4): Brand new, minimal data ---
  // Just 3 entries from the last few days
  for (let i = 0; i < 3; i++) {
    const date = startOfDay(subDays(new Date(), i))
    entriesData.push({
      userId: clients[3].id,
      date,
      weight: i === 0 ? 155.0 : null, // Only weighed on first day
      steps: 7000 + Math.floor(Math.random() * 2000),
      calories: i < 2 ? 1800 + Math.floor(Math.random() * 200) : null, // Didn't track on day 3
      sleepQuality: 7,
      perceivedStress: 3,
      notes: i === 0 ? "Just getting started! Excited to begin the program." : null,
      customResponses: null,
      dataSources: { steps: "healthkit" },
    })
  }

  // Remove nulls for JSON fields (customResponses, dataSources)
  // Convert JSON fields to JSON.stringify for createMany
  const entriesDataCleaned = entriesData.map((entry) => ({
    ...entry,
    customResponses: entry.customResponses == null ? undefined : JSON.stringify(entry.customResponses),
    dataSources: entry.dataSources == null ? undefined : JSON.stringify(entry.dataSources),
  }))
  await prisma.entry.createMany({ data: entriesDataCleaned })
  console.log(`✅ Created ${entriesData.length} check-in entries across all clients`)

  // Create questionnaire bundles for active cohort using CoachFit baseline templates
  console.log("📝 Creating questionnaire bundles...")

  for (let week = 1; week <= 3; week++) {
    await prisma.questionnaireBundle.create({
      data: {
        cohortId: activeCohort.id,
        weekNumber: week,
        questions: DEFAULT_TEMPLATES[`week${week}` as keyof typeof DEFAULT_TEMPLATES],
      },
    })
  }
  console.log("✅ Created 3 questionnaire bundles")

  // Create questionnaire responses
  console.log("💬 Creating questionnaire responses...")
  const bundle1 = await prisma.questionnaireBundle.findFirst({
    where: { cohortId: activeCohort.id, weekNumber: 1 },
  })
  const bundle2 = await prisma.questionnaireBundle.findFirst({
    where: { cohortId: activeCohort.id, weekNumber: 2 },
  })

  if (bundle1) {
    // Client 1 (Alice): Completed week 1 and 2 with detailed responses
    await prisma.weeklyQuestionnaireResponse.create({
      data: {
        userId: clients[0].id,
        bundleId: bundle1.id,
        weekNumber: 1,
        responses: {
          wins: "Hit all my training sessions this week and felt really strong during workouts. Meal prep on Sunday helped me stay on track!",
          challenges: "Social event on Friday made it hard to stick to calories. Had a few late-night cravings.",
          days_trained: 3,
          days_hit_steps: 5,
          days_on_calories: 6,
          nutrition_help: "I could use some ideas for healthy restaurant options when eating out with friends.",
          behavior_goal: "Prepare lunch the night before at least 5 days this week and drink 2L of water daily.",
        },
        status: ResponseStatus.COMPLETED,
      },
    })

    if (bundle2) {
      await prisma.weeklyQuestionnaireResponse.create({
        data: {
          userId: clients[0].id,
          bundleId: bundle2.id,
          weekNumber: 2,
          responses: {
            wins: "Managed to prepare lunch 4 times and increased my water intake significantly. Feeling more energetic!",
            challenges: "Had poor sleep this week which made workouts harder. Work stress was high.",
            days_trained: 3,
            days_hit_steps: 6,
            days_on_calories: 5,
            nutrition_help: "Would love some quick high-protein snack ideas for busy afternoons.",
            behavior_goal_review: "I set a goal to prepare lunch 5 times and drink 2L water daily. I hit 4/5 for lunch prep and successfully drank enough water 6 days. Pretty happy with that!",
          },
          status: ResponseStatus.COMPLETED,
        },
      })
    }

    // Client 2 (Bob): Only completed week 1 with simpler responses
    await prisma.weeklyQuestionnaireResponse.create({
      data: {
        userId: clients[1].id,
        bundleId: bundle1.id,
        weekNumber: 1,
        responses: {
          wins: "Made it to the gym twice and started tracking my food intake.",
          challenges: "Finding time to exercise with my work schedule. Also struggling with portion control.",
          days_trained: 2,
          days_hit_steps: 3,
          days_on_calories: 4,
          nutrition_help: "Need help with meal planning and portion sizes.",
          behavior_goal: "Get up 15 minutes earlier to fit in morning walks at least 3 times this week.",
        },
        status: ResponseStatus.COMPLETED,
      },
    })
  }
  console.log("✅ Created questionnaire responses")

  // Create appointments from appointments.json
  console.log("📅 Creating appointments from appointments.json ...")
  const appointmentsPath = path.join(__dirname, "appointments.json")
  const appointmentsRaw = JSON.parse(fs.readFileSync(appointmentsPath, "utf-8")).results
  let createdAppointments = 0
  for (const event of appointmentsRaw) {
    if (!event.instructors || event.instructors.length === 0) continue
    const coachName = event.instructors[0].name
    const coach = coachUsers.find((c) => c.name === coachName)
    if (!coach) continue
    // Assign a random client
    const client = clients[Math.floor(Math.random() * clients.length)]
    await prisma.appointment.create({
      data: {
        userId: client.id,
        coachId: coach.id,
        title: event.name,
        startTime: new Date(event.starts_at),
        endTime: new Date(event.ends_at),
        status: "NOT_ATTENDED",
        fee: 75.0,
        notes: event.description ? event.description.replace(/<[^>]+>/g, "") : null,
      } as any,
    })
    createdAppointments++
  }
  console.log(`✅ Created ${createdAppointments} appointments from appointments.json`)

  // Create invoices
  console.log("💵 Creating invoices...")
  const attendedAppointments = await prisma.appointment.findMany({
    where: { status: "ATTENDED" }, // AttendanceStatus.ATTENDED
    take: 3,
  })

  if (attendedAppointments.length > 0) {
    const invoice1 = await prisma.invoice.create({
      data: {
        userId: clients[0].id,
        totalAmount: 225.0, // 3 sessions x $75
        month: new Date(),
        paymentStatus: PaymentStatus.UNPAID,
      },
    })

    // Link appointments to invoice
    await prisma.appointment.updateMany({
      where: {
        id: { in: attendedAppointments.map((a) => a.id) },
      },
      data: {
        invoiceId: invoice1.id,
      },
    })

    // Create a paid invoice for client 1
    await prisma.invoice.create({
      data: {
        userId: clients[0].id,
        totalAmount: 150.0,
        month: new Date(),
        paymentStatus: PaymentStatus.PAID,
        paidAt: subDays(new Date(), 3),
        stripePaymentUrl: "https://checkout.stripe.com/test_sample",
      },
    })

    console.log("✅ Created 2 invoices")
  }

  console.log("\n✨ Seed completed successfully!\n")
  console.log("📋 Test Accounts:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("ADMIN:")
  console.log("  Email: admin@centurion.test")
  console.log("  Password: password123")
  console.log("\nCOACHES:")
  console.log("  Email: coach@centurion.test (Sarah Coach)")
  console.log("  Email: coach2@centurion.test (Mike Coach)")
  console.log("  Password: password123")
  console.log("\nCLIENTS:")
  console.log("  Email: client1@centurion.test (Alice - Active, many check-ins)")
  console.log("  Email: client2@centurion.test (Bob - Active, few check-ins)")
  console.log("  Email: client3@centurion.test (Charlie - Paused)")
  console.log("  Email: client4@centurion.test (Diana - New)")
  console.log("  Password: password123")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
