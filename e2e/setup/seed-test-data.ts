/**
 * E2E Test Data Seeding Script
 *
 * Seeds database with test users, sessions, memberships, health data,
 * questionnaires, check-ins, and attendance records.
 * Run before E2E tests to ensure consistent test data.
 *
 * Usage: npx tsx e2e/setup/seed-test-data.ts
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Helper to generate random number within range
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to generate random float within range
function randomFloat(min: number, max: number, decimals: number = 1): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

// Helper to get date N days ago
function daysAgo(n: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - n)
  date.setHours(8, 0, 0, 0) // Morning check-in time
  return date
}

async function main() {
  console.log("Starting E2E test data seeding...")

  // Clean up existing test data (order matters for foreign keys)
  console.log("Cleaning up existing test data...")

  // Clean up attention scores
  await prisma.attentionScore.deleteMany({
    where: {
      entityType: "user",
    },
  })

  // Clean up coach notes
  await prisma.coachNote.deleteMany({})

  // Clean up questionnaire responses
  await prisma.weeklyQuestionnaireResponse.deleteMany({})

  // Clean up questionnaire bundles
  await prisma.questionnaireBundle.deleteMany({})

  // Clean up sleep records
  await prisma.sleepRecord.deleteMany({})

  // Clean up healthkit workouts
  await prisma.healthKitWorkout.deleteMany({})

  // Clean up entries
  await prisma.entry.deleteMany({})

  // Clean up session registrations
  await prisma.sessionRegistration.deleteMany({})

  // Clean up cohort session access, cohort memberships, and cohorts
  await prisma.cohortSessionAccess.deleteMany({
    where: { cohort: { name: { in: ["Spring 2026", "Transformation Challenge"] } } },
  })
  await prisma.coachCohortMembership.deleteMany({})
  await prisma.cohortMembership.deleteMany({})
  await prisma.cohort.deleteMany({
    where: { name: { in: ["Spring 2026", "Transformation Challenge"] } },
  })

  // Clean up class sessions and class types
  await prisma.classSession.deleteMany({})
  await prisma.classType.deleteMany({
    where: { name: { in: ["HIIT", "Yoga", "Strength Training"] } },
  })

  // Clean up membership plans
  await prisma.userMembership.deleteMany({})
  await prisma.membershipClassTypeAllowance.deleteMany({})
  await prisma.membershipPlan.deleteMany({
    where: { name: { in: ["Monthly Unlimited", "10 Class Pack", "3-Month Prepaid"] } },
  })

  // Clean up appointments
  await prisma.appointment.deleteMany({})

  // Clean up test users (cascades registrations, memberships, etc.)
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "admin@test.com",
          "coach@test.com",
          "client@test.com",
          "client2@test.com",
          "client3@test.com",
        ],
      },
    },
  })

  // Hash password for test users
  const hashedPassword = await bcrypt.hash("password123", 10)

  // Create test users
  console.log("Creating test users...")

  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      password: hashedPassword,
      name: "Test Admin",
      role: "ADMIN",
      isTestUser: true,
      emailVerified: true,
    },
  })
  console.log(`✓ Created admin user (id: ${admin.id})`)

  const coach = await prisma.user.create({
    data: {
      email: "coach@test.com",
      password: hashedPassword,
      name: "Sarah Johnson",
      role: "COACH",
      isTestUser: true,
      emailVerified: true,
    },
  })
  console.log(`✓ Created coach user (id: ${coach.id})`)

  const client = await prisma.user.create({
    data: {
      email: "client@test.com",
      password: hashedPassword,
      name: "Mike Thompson",
      role: "CLIENT",
      isTestUser: true,
      emailVerified: true,
      credits: 10,
      checkInFrequencyDays: 1, // Daily check-ins
    },
  })
  console.log(`✓ Created client user (id: ${client.id})`)

  // Create additional test clients for variety
  const client2 = await prisma.user.create({
    data: {
      email: "client2@test.com",
      password: hashedPassword,
      name: "Emily Davis",
      role: "CLIENT",
      isTestUser: true,
      emailVerified: true,
      credits: 5,
    },
  })
  console.log(`✓ Created client2 user (id: ${client2.id})`)

  const client3 = await prisma.user.create({
    data: {
      email: "client3@test.com",
      password: hashedPassword,
      name: "James Wilson",
      role: "CLIENT",
      isTestUser: true,
      emailVerified: true,
      credits: 0,
    },
  })
  console.log(`✓ Created client3 user (id: ${client3.id})`)

  // Create test class types
  console.log("Creating test class types...")
  const classTypeHIIT = await prisma.classType.create({
    data: {
      name: "HIIT",
      description: "High-intensity interval training",
      defaultDurationMins: 45,
      color: "#FF5733",
    },
  })
  console.log(`✓ Created class type HIIT (id: ${classTypeHIIT.id})`)

  const classTypeYoga = await prisma.classType.create({
    data: {
      name: "Yoga",
      description: "Vinyasa yoga flow",
      defaultDurationMins: 60,
      color: "#4CAF50",
    },
  })
  console.log(`✓ Created class type Yoga (id: ${classTypeYoga.id})`)

  const classTypeStrength = await prisma.classType.create({
    data: {
      name: "Strength Training",
      description: "Full body strength workout",
      defaultDurationMins: 50,
      color: "#2196F3",
    },
  })
  console.log(`✓ Created class type Strength (id: ${classTypeStrength.id})`)

  // Create test sessions (past and future)
  console.log("Creating test sessions...")
  const now = new Date()

  // Past sessions (for attendance tracking)
  const pastDates = [3, 5, 7, 10, 12] // days ago
  const pastSessions = []

  for (const daysBack of pastDates) {
    const sessionDate = new Date(now)
    sessionDate.setDate(sessionDate.getDate() - daysBack)
    sessionDate.setHours(10, 0, 0, 0)

    const session = await prisma.classSession.create({
      data: {
        classTypeId: classTypeHIIT.id,
        coachId: coach.id,
        title: `HIIT Session - ${sessionDate.toLocaleDateString()}`,
        startTime: sessionDate,
        endTime: new Date(sessionDate.getTime() + 45 * 60 * 1000),
        maxOccupancy: 20,
        status: "COMPLETED",
      },
    })
    pastSessions.push(session)
  }
  console.log(`✓ Created ${pastSessions.length} past sessions`)

  // Future sessions
  const futureDates = [1, 3, 7, 10, 14] // days from now
  const futureSessions = []

  for (const daysAhead of futureDates) {
    const sessionDate = new Date(now)
    sessionDate.setDate(sessionDate.getDate() + daysAhead)
    sessionDate.setHours(10, 0, 0, 0)

    const classType =
      daysAhead % 3 === 0 ? classTypeYoga : daysAhead % 2 === 0 ? classTypeStrength : classTypeHIIT

    const session = await prisma.classSession.create({
      data: {
        classTypeId: classType.id,
        coachId: coach.id,
        title: `${classType.name === "HIIT" ? "HIIT" : classType.name} Session`,
        startTime: sessionDate,
        endTime: new Date(sessionDate.getTime() + classType.defaultDurationMins * 60 * 1000),
        maxOccupancy: 20,
        status: "SCHEDULED",
      },
    })
    futureSessions.push(session)
  }
  console.log(`✓ Created ${futureSessions.length} future sessions`)

  // Create session registrations with attendance
  console.log("Creating session registrations with attendance...")

  // Register and mark attendance for past sessions
  for (let i = 0; i < pastSessions.length; i++) {
    const session = pastSessions[i]
    // Client 1 attended most sessions
    if (i < 4) {
      await prisma.sessionRegistration.create({
        data: {
          sessionId: session.id,
          userId: client.id,
          status: i < 3 ? "ATTENDED" : "NO_SHOW", // One no-show
          registeredAt: new Date(session.startTime.getTime() - 24 * 60 * 60 * 1000), // Day before
        },
      })
    }
    // Client 2 attended some sessions
    if (i % 2 === 0) {
      await prisma.sessionRegistration.create({
        data: {
          sessionId: session.id,
          userId: client2.id,
          status: "ATTENDED",
          registeredAt: new Date(session.startTime.getTime() - 48 * 60 * 60 * 1000), // 2 days before
        },
      })
    }
  }
  console.log(`✓ Created past session attendance records`)

  // Register for future sessions
  for (let i = 0; i < futureSessions.length; i++) {
    if (i < 3) {
      await prisma.sessionRegistration.create({
        data: {
          sessionId: futureSessions[i].id,
          userId: client.id,
          status: "REGISTERED",
        },
      })
    }
    if (i < 2) {
      await prisma.sessionRegistration.create({
        data: {
          sessionId: futureSessions[i].id,
          userId: client2.id,
          status: "REGISTERED",
        },
      })
    }
  }
  console.log(`✓ Created future session registrations`)

  // Create test membership plans
  console.log("Creating test membership plans...")

  const recurringPlan = await prisma.membershipPlan.create({
    data: {
      name: "Monthly Unlimited",
      description: "Unlimited classes per month",
      type: "RECURRING",
      monthlyPrice: 149,
      sessionsPerWeek: 0, // Unlimited
      isActive: true,
    },
  })
  console.log(`✓ Created recurring plan (id: ${recurringPlan.id})`)

  const packPlan = await prisma.membershipPlan.create({
    data: {
      name: "10 Class Pack",
      description: "10 classes, no expiration",
      type: "PACK",
      packPrice: 180,
      totalSessions: 10,
      isActive: true,
    },
  })
  console.log(`✓ Created pack plan (id: ${packPlan.id})`)

  const prepaidPlan = await prisma.membershipPlan.create({
    data: {
      name: "3-Month Prepaid",
      description: "3 months of unlimited classes",
      type: "PREPAID",
      prepaidPrice: 399,
      durationDays: 90,
      isActive: true,
    },
  })
  console.log(`✓ Created prepaid plan (id: ${prepaidPlan.id})`)

  // Assign memberships to clients
  console.log("Assigning memberships to test clients...")
  await prisma.userMembership.create({
    data: {
      userId: client.id,
      planId: recurringPlan.id,
      status: "ACTIVE",
      startDate: daysAgo(30),
    },
  })

  await prisma.userMembership.create({
    data: {
      userId: client2.id,
      planId: packPlan.id,
      status: "ACTIVE",
      startDate: daysAgo(14),
      sessionsRemaining: 7,
    },
  })
  console.log(`✓ Created user memberships`)

  // Create test cohort
  console.log("Creating test cohort...")
  const cohort = await prisma.cohort.create({
    data: {
      name: "Spring 2026",
      description: "6-week transformation program",
      startDate: daysAgo(21), // Started 3 weeks ago
      endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // Ends in 3 weeks
      status: "ACTIVE",
      type: "TIMED",
      checkInFrequencyDays: 1,
    },
  })
  console.log(`✓ Created cohort (id: ${cohort.id})`)

  // Add clients to cohort
  await prisma.cohortMembership.create({
    data: {
      cohortId: cohort.id,
      userId: client.id,
      status: "ACTIVE",
      joinedAt: daysAgo(21),
    },
  })

  await prisma.cohortMembership.create({
    data: {
      cohortId: cohort.id,
      userId: client2.id,
      status: "ACTIVE",
      joinedAt: daysAgo(14),
    },
  })
  console.log(`✓ Added clients to cohort`)

  // Add coach to cohort
  await prisma.coachCohortMembership.create({
    data: {
      cohortId: cohort.id,
      coachId: coach.id,
    },
  })
  console.log(`✓ Added coach to cohort`)

  // Create CohortSessionAccess
  await prisma.cohortSessionAccess.create({
    data: {
      cohortId: cohort.id,
      classTypeId: classTypeHIIT.id,
    },
  })
  await prisma.cohortSessionAccess.create({
    data: {
      cohortId: cohort.id,
      classTypeId: classTypeStrength.id,
    },
  })
  console.log(`✓ Created cohort session access (HIIT, Strength)`)

  // ============================================
  // HEALTH DATA - Entries (Daily Check-ins)
  // ============================================
  console.log("Creating health data entries...")

  // Client 1: Good adherence, losing weight trend
  let baseWeight = 185.0
  for (let i = 30; i >= 0; i--) {
    // Skip some days to simulate realistic check-in patterns
    if (i === 8 || i === 15 || i === 22) continue // Missed 3 days

    // Weight gradually decreasing with some fluctuation
    const weightFluctuation = randomFloat(-0.5, 0.5)
    const weightTrend = (30 - i) * -0.15 // Losing ~0.15 lbs per day average
    const weight = baseWeight + weightTrend + weightFluctuation

    // Higher stress on certain days
    const isHighStressDay = i === 5 || i === 12 // Two high-stress days
    const stress = isHighStressDay ? randomInRange(8, 10) : randomInRange(3, 6)

    // Sleep quality inversely related to stress
    const sleepQuality = isHighStressDay ? randomInRange(3, 5) : randomInRange(6, 9)

    // Steps vary by day of week (less on weekends)
    const dayOfWeek = daysAgo(i).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const steps = isWeekend ? randomInRange(4000, 8000) : randomInRange(7000, 14000)

    // Calories consistent
    const calories = randomInRange(1800, 2400)

    await prisma.entry.create({
      data: {
        userId: client.id,
        date: daysAgo(i),
        weight: parseFloat(weight.toFixed(1)),
        steps,
        calories,
        sleepQuality,
        perceivedStress: stress,
        notes:
          isHighStressDay
            ? "Tough day at work, feeling stressed"
            : i === 0
              ? "Great workout today!"
              : null,
        dataSources: {
          weight: "manual",
          steps: i % 3 === 0 ? "healthkit" : "manual",
          calories: "manual",
        },
      },
    })
  }
  console.log(`✓ Created 28 entries for client 1 (good adherence)`)

  // Client 2: Moderate adherence, stable weight
  for (let i = 14; i >= 0; i--) {
    // Skip more days - less adherent
    if (i === 3 || i === 6 || i === 9 || i === 11 || i === 13) continue

    await prisma.entry.create({
      data: {
        userId: client2.id,
        date: daysAgo(i),
        weight: 155 + randomFloat(-1, 1),
        steps: randomInRange(5000, 10000),
        calories: randomInRange(1600, 2000),
        sleepQuality: randomInRange(5, 8),
        perceivedStress: randomInRange(4, 7),
        dataSources: { weight: "manual", steps: "healthkit" },
      },
    })
  }
  console.log(`✓ Created 10 entries for client 2 (moderate adherence)`)

  // Client 3: Poor adherence - only 3 entries
  for (let i of [14, 7, 1]) {
    await prisma.entry.create({
      data: {
        userId: client3.id,
        date: daysAgo(i),
        weight: 210 + randomFloat(-2, 2),
        steps: randomInRange(2000, 5000),
        sleepQuality: randomInRange(3, 6),
        perceivedStress: randomInRange(6, 9),
      },
    })
  }
  console.log(`✓ Created 3 entries for client 3 (poor adherence)`)

  // ============================================
  // HEALTHKIT WORKOUTS
  // ============================================
  console.log("Creating HealthKit workout data...")

  const workoutTypes = ["Running", "Cycling", "Swimming", "HIIT", "Strength Training", "Walking"]

  for (let i = 20; i >= 0; i--) {
    // Client 1: Active, 4-5 workouts per week
    if (i % 2 === 0 || i % 3 === 0) {
      const workoutDate = daysAgo(i)
      workoutDate.setHours(randomInRange(6, 19), randomInRange(0, 59))
      const duration = randomInRange(30, 90) * 60 // 30-90 min in seconds

      await prisma.healthKitWorkout.create({
        data: {
          userId: client.id,
          workoutType: workoutTypes[randomInRange(0, workoutTypes.length - 1)],
          startTime: workoutDate,
          endTime: new Date(workoutDate.getTime() + duration * 1000),
          duration,
          calories: randomFloat(200, 600, 0),
          distance: workoutTypes.includes("Running") ? randomFloat(3000, 10000, 0) : null,
          heartRate: { avg: randomInRange(120, 160), max: randomInRange(165, 190) },
        },
      })
    }
  }
  console.log(`✓ Created HealthKit workouts for client 1`)

  // Client 2: Moderate activity
  for (let i = 14; i >= 0; i--) {
    if (i % 3 === 0) {
      const workoutDate = daysAgo(i)
      workoutDate.setHours(randomInRange(17, 20), randomInRange(0, 59))
      const duration = randomInRange(20, 45) * 60

      await prisma.healthKitWorkout.create({
        data: {
          userId: client2.id,
          workoutType: "Walking",
          startTime: workoutDate,
          endTime: new Date(workoutDate.getTime() + duration * 1000),
          duration,
          calories: randomFloat(100, 250, 0),
          distance: randomFloat(2000, 5000, 0),
        },
      })
    }
  }
  console.log(`✓ Created HealthKit workouts for client 2`)

  // ============================================
  // SLEEP RECORDS
  // ============================================
  console.log("Creating sleep records...")

  for (let i = 14; i >= 0; i--) {
    const sleepStart = daysAgo(i)
    sleepStart.setHours(22, randomInRange(0, 59)) // 10 PM - 11 PM
    const totalSleep = randomInRange(360, 480) // 6-8 hours in minutes
    const inBedTime = totalSleep + randomInRange(15, 45) // Time in bed > actual sleep

    await prisma.sleepRecord.create({
      data: {
        userId: client.id,
        startTime: sleepStart,
        endTime: new Date(sleepStart.getTime() + inBedTime * 60 * 1000),
        totalSleep,
        inBedTime,
        deepSleep: Math.floor(totalSleep * randomFloat(0.15, 0.25)),
        remSleep: Math.floor(totalSleep * randomFloat(0.2, 0.3)),
        coreSleep: Math.floor(totalSleep * randomFloat(0.45, 0.55)),
        sourceDevice: "Apple Watch",
      },
    })
  }
  console.log(`✓ Created 15 sleep records for client 1`)

  // ============================================
  // QUESTIONNAIRE BUNDLES AND RESPONSES
  // ============================================
  console.log("Creating questionnaire bundles...")

  // Create questionnaire bundles for weeks 1-3 of the cohort
  const questionnaireTemplate = {
    pages: [
      {
        name: "weekly_reflection",
        elements: [
          {
            type: "comment",
            name: "wins",
            title: "What wins did you have this week?",
            isRequired: true,
          },
          {
            type: "comment",
            name: "challenges",
            title: "What was your biggest challenge this week?",
            isRequired: true,
          },
          {
            type: "rating",
            name: "days_trained",
            title: "How many days did you train in the studio?",
            rateMax: 7,
          },
          {
            type: "rating",
            name: "days_hit_steps",
            title: "How many days did you hit your step target?",
            rateMax: 7,
          },
          {
            type: "rating",
            name: "days_on_calories",
            title: "How many days were you within your calorie target?",
            rateMax: 7,
          },
          {
            type: "comment",
            name: "behavior_goal",
            title: "What is your behaviour goal for next week?",
          },
        ],
      },
    ],
  }

  const bundles = []
  for (let week = 1; week <= 3; week++) {
    const bundle = await prisma.questionnaireBundle.create({
      data: {
        cohortId: cohort.id,
        weekNumber: week,
        questions: questionnaireTemplate,
        isActive: true,
      },
    })
    bundles.push(bundle)
  }
  console.log(`✓ Created ${bundles.length} questionnaire bundles`)

  // Create questionnaire responses
  console.log("Creating questionnaire responses...")

  // Client 1: Completed weeks 1 and 2, in progress for week 3
  await prisma.weeklyQuestionnaireResponse.create({
    data: {
      userId: client.id,
      bundleId: bundles[0].id,
      weekNumber: 1,
      status: "COMPLETED",
      completedAt: daysAgo(14),
      responses: {
        wins: "Started the program strong! Hit all my workouts and stayed on track with nutrition.",
        challenges: "Managing work stress while trying to eat well.",
        days_trained: 4,
        days_hit_steps: 5,
        days_on_calories: 6,
        behavior_goal: "Meal prep on Sunday for the week",
      },
    },
  })

  await prisma.weeklyQuestionnaireResponse.create({
    data: {
      userId: client.id,
      bundleId: bundles[1].id,
      weekNumber: 2,
      status: "COMPLETED",
      completedAt: daysAgo(7),
      responses: {
        wins: "Meal prep worked great! Saved time and ate cleaner.",
        challenges: "Sleep has been rough - need to work on bedtime routine.",
        days_trained: 5,
        days_hit_steps: 6,
        days_on_calories: 5,
        behavior_goal: "No phone after 9pm to improve sleep",
      },
    },
  })

  await prisma.weeklyQuestionnaireResponse.create({
    data: {
      userId: client.id,
      bundleId: bundles[2].id,
      weekNumber: 3,
      status: "IN_PROGRESS",
      responses: {
        wins: "Sleep is improving!",
        // Incomplete - other fields not filled
      },
    },
  })
  console.log(`✓ Created questionnaire responses for client 1`)

  // Client 2: Only completed week 1
  await prisma.weeklyQuestionnaireResponse.create({
    data: {
      userId: client2.id,
      bundleId: bundles[0].id,
      weekNumber: 1,
      status: "COMPLETED",
      completedAt: daysAgo(10),
      responses: {
        wins: "Got started and feeling motivated!",
        challenges: "Finding time to workout with my schedule.",
        days_trained: 2,
        days_hit_steps: 3,
        days_on_calories: 4,
        behavior_goal: "Schedule workouts like appointments",
      },
    },
  })
  console.log(`✓ Created questionnaire responses for client 2`)

  // ============================================
  // COACH NOTES
  // ============================================
  console.log("Creating coach notes...")

  await prisma.coachNote.create({
    data: {
      userId: client.id,
      coachId: coach.id,
      weekNumber: 1,
      notes:
        "Mike is off to a great start! Very motivated and asking good questions. Watch for potential overtraining - encourage rest days.",
    },
  })

  await prisma.coachNote.create({
    data: {
      userId: client.id,
      coachId: coach.id,
      weekNumber: 2,
      notes:
        "Good progress continues. Mike mentioned work stress - suggested breathing exercises before meals. Weight trend looking good.",
    },
  })

  await prisma.coachNote.create({
    data: {
      userId: client2.id,
      coachId: coach.id,
      weekNumber: 1,
      notes:
        "Emily needs more structure. Set up a consistent workout schedule together. Good attitude but needs accountability.",
    },
  })
  console.log(`✓ Created coach notes`)

  // ============================================
  // APPOINTMENTS (1:1 sessions)
  // ============================================
  console.log("Creating appointments...")

  // Past appointments
  const appointmentDates = [21, 14, 7]
  for (const daysBack of appointmentDates) {
    const appointmentDate = daysAgo(daysBack)
    appointmentDate.setHours(14, 0, 0, 0) // 2 PM

    await prisma.appointment.create({
      data: {
        userId: client.id,
        coachId: coach.id,
        title: "Weekly Check-in",
        startTime: appointmentDate,
        endTime: new Date(appointmentDate.getTime() + 30 * 60 * 1000),
        fee: 50,
        status: "ATTENDED",
        notes: daysBack === 7 ? "Discussed nutrition adjustments for better energy" : null,
      },
    })
  }

  // Future appointment
  const futureAppt = new Date(now)
  futureAppt.setDate(futureAppt.getDate() + 7)
  futureAppt.setHours(14, 0, 0, 0)

  await prisma.appointment.create({
    data: {
      userId: client.id,
      coachId: coach.id,
      title: "Weekly Check-in",
      startTime: futureAppt,
      endTime: new Date(futureAppt.getTime() + 30 * 60 * 1000),
      fee: 50,
      status: "NOT_ATTENDED",
    },
  })
  console.log(`✓ Created appointments`)

  // ============================================
  // ATTENTION SCORES
  // ============================================
  console.log("Creating attention scores...")

  await prisma.attentionScore.create({
    data: {
      entityType: "user",
      entityId: client.id,
      priority: "green",
      score: 85,
      reasons: ["Good check-in adherence", "Weight trending down", "Completing questionnaires"],
      metadata: {
        checkInRate: 0.93,
        weightChange: -4.5,
        lastCheckIn: daysAgo(0).toISOString(),
      },
      calculatedAt: now,
    },
  })

  await prisma.attentionScore.create({
    data: {
      entityType: "user",
      entityId: client2.id,
      priority: "amber",
      score: 55,
      reasons: ["Moderate check-in adherence", "Missing week 2-3 questionnaires"],
      metadata: {
        checkInRate: 0.67,
        lastCheckIn: daysAgo(3).toISOString(),
      },
      calculatedAt: now,
    },
  })

  await prisma.attentionScore.create({
    data: {
      entityType: "user",
      entityId: client3.id,
      priority: "red",
      score: 20,
      reasons: [
        "Poor check-in adherence (3 entries in 14 days)",
        "No questionnaire responses",
        "High stress reported",
      ],
      metadata: {
        checkInRate: 0.21,
        lastCheckIn: daysAgo(1).toISOString(),
      },
      calculatedAt: now,
    },
  })
  console.log(`✓ Created attention scores`)

  // Set feature flags (all enabled for testing)
  console.log("Setting feature flags...")
  await prisma.systemSettings.upsert({
    where: { key: "appointmentsEnabled" },
    update: { value: true },
    create: { key: "appointmentsEnabled", value: true },
  })
  await prisma.systemSettings.upsert({
    where: { key: "sessionsEnabled" },
    update: { value: true },
    create: { key: "sessionsEnabled", value: true },
  })
  await prisma.systemSettings.upsert({
    where: { key: "cohortsEnabled" },
    update: { value: true },
    create: { key: "cohortsEnabled", value: true },
  })
  console.log(`✓ Set feature flags (all enabled)`)

  console.log("\n========================================")
  console.log("E2E test data seeding completed successfully!")
  console.log("========================================\n")
  console.log("Test user credentials:")
  console.log("  Admin:   admin@test.com / password123")
  console.log("  Coach:   coach@test.com / password123 (Sarah Johnson)")
  console.log("  Client1: client@test.com / password123 (Mike Thompson - good adherence)")
  console.log("  Client2: client2@test.com / password123 (Emily Davis - moderate adherence)")
  console.log("  Client3: client3@test.com / password123 (James Wilson - poor adherence)")
  console.log("\nTest data includes:")
  console.log("  • 3 class types (HIIT, Yoga, Strength Training)")
  console.log("  • 5 past sessions with attendance records")
  console.log("  • 5 future sessions with registrations")
  console.log("  • 1 active cohort (Spring 2026) with 2 members")
  console.log("  • 41 daily check-in entries across 3 clients")
  console.log("  • HealthKit workouts and sleep records")
  console.log("  • 3 questionnaire bundles with responses")
  console.log("  • Coach notes for clients")
  console.log("  • Attention scores (green, amber, red)")
  console.log("  • 4 appointments (3 past attended, 1 future)")
}

main()
  .catch((e) => {
    console.error("Error seeding test data:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
