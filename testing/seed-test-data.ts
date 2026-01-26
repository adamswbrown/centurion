/**
 * Test Data Seed Script for Centurion
 *
 * This script creates a complete set of test data for validating all functionality
 * through Phase 7 & 8 (Check-Ins and Questionnaires).
 *
 * Usage:
 *   npx tsx testing/seed-test-data.ts
 */

import { PrismaClient, Role, CohortStatus, InvoiceStatus, ResponseStatus } from "@prisma/client"
import fs from "fs"
import path from "path"
// Use AttendanceStatus for appointments
import type { AttendanceStatus } from "@prisma/client"
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
  await prisma.bootcampAttendee.deleteMany()
  await prisma.bootcamp.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.cohortMembership.deleteMany()
  await prisma.coachCohortMembership.deleteMany()
  await prisma.cohort.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  console.log("👤 Creating users...")
  const password = await hash("password123", 12)

  // Admin user
  const admin = await prisma.user.create({
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
    instructorsData.map((inst, idx) =>
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

  // Create daily check-in entries for active members
  console.log("📊 Creating daily check-in entries...")
  const entriesData = []
  for (let i = 0; i < 14; i++) {
    const date = startOfDay(subDays(new Date(), i))
    // Client 1: Consistent daily check-ins
    entriesData.push({
      userId: clients[0].id,
      date,
      weight: 180 - i * 0.5, // Losing weight gradually
      steps: 8000 + Math.floor(Math.random() * 4000),
      calories: 1800 + Math.floor(Math.random() * 400),
      sleepQuality: 6 + Math.floor(Math.random() * 4),
      perceivedStress: 3 + Math.floor(Math.random() * 4),
      notes: i === 0 ? "Feeling great today!" : null,
    })

    // Client 2: Sporadic check-ins (only every 3 days)
    if (i % 3 === 0) {
      entriesData.push({
        userId: clients[1].id,
        date,
        weight: 165,
        steps: 10000 + Math.floor(Math.random() * 2000),
        calories: 2000,
        sleepQuality: 7,
        perceivedStress: 4,
        notes: null,
      })
    }
  }
  await prisma.entry.createMany({ data: entriesData })
  console.log(`✅ Created ${entriesData.length} check-in entries`)

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
        coachId: coach.id, // Now supported by schema
        title: event.name,
        startTime: new Date(event.starts_at),
        endTime: new Date(event.ends_at),
        status: "NOT_ATTENDED",
        fee: 75.0,
        notes: event.description ? event.description.replace(/<[^>]+>/g, "") : null,
      },
    })
    createdAppointments++
  }
  console.log(`✅ Created ${createdAppointments} appointments from appointments.json`)

  // Create bootcamps as multi-week programs
  console.log("💪 Creating bootcamps...")
  const bootcampPrograms = [
    {
      name: "Morning HIIT Bootcamp",
      description: "High-intensity interval training for 6 weeks",
      startDate: addDays(new Date(), 1),
      weeks: 6,
      location: "Main Gym",
      attendees: [clients[0], clients[1], clients[2]],
    },
    {
      name: "Strength & Conditioning Bootcamp",
      description: "Full body strength training for 8 weeks",
      startDate: addDays(new Date(), 3),
      weeks: 8,
      location: "Weight Room",
      attendees: [clients[0]],
    },
  ]

  for (const bootcamp of bootcampPrograms) {
    const created = await prisma.bootcamp.create({
      data: {
        name: bootcamp.name,
        description: bootcamp.description,
        startTime: bootcamp.startDate,
        endTime: addDays(bootcamp.startDate, bootcamp.weeks * 7),
        location: bootcamp.location,
        capacity: bootcamp.attendees.length,
      },
    })
    // Register attendees
    await prisma.bootcampAttendee.createMany({
      data: bootcamp.attendees.map((user) => ({ bootcampId: created.id, userId: user.id })),
    })
  }
  console.log("✅ Created bootcamp programs with attendees")

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
        amount: 225.0, // 3 sessions x $75
        dueDate: addDays(new Date(), 7),
        paymentStatus: InvoiceStatus.UNPAID,
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
    const invoice2 = await prisma.invoice.create({
      data: {
        userId: clients[0].id,
        amount: 150.0,
        dueDate: subDays(new Date(), 7),
        paymentStatus: InvoiceStatus.PAID,
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
