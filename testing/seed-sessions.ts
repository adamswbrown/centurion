/**
 * Session Seed Script for Centurion
 *
 * Creates ClassTypes and ClassSessions based on Hitsona/TeamUp patterns.
 * Generates 3 months of sessions in a repeating weekly schedule.
 *
 * Usage:
 *   npx tsx testing/seed-sessions.ts
 *
 * Features:
 *   - HIIT and CORE class types with appropriate colors
 *   - Realistic weekly schedule (Mon-Sat, multiple sessions per day)
 *   - 3 months of sessions (past week + 12 weeks future)
 *   - Random registrations to simulate realistic booking
 *   - Venue/location information
 */

import { PrismaClient, SessionStatus, RegistrationStatus } from "@prisma/client"
import {
  addDays,
  addMinutes,
  addWeeks,
  startOfWeek,
  setHours,
  setMinutes,
  format,
  isBefore,
} from "date-fns"

const prisma = new PrismaClient()

// Class type definitions matching Hitsona
const CLASS_TYPES = [
  {
    name: "HIIT",
    description: "25-minute coach led high-intensity interval training sessions",
    color: "#452ddb", // Purple
    defaultCapacity: 10,
    defaultDurationMins: 25,
  },
  {
    name: "CORE",
    description: "25-minute coach led core strengthening session",
    color: "#f2de24", // Yellow
    defaultCapacity: 15,
    defaultDurationMins: 25,
  },
  {
    name: "Strength",
    description: "45-minute strength and resistance training",
    color: "#22c55e", // Green
    defaultCapacity: 12,
    defaultDurationMins: 45,
  },
  {
    name: "Yoga",
    description: "60-minute yoga and flexibility session",
    color: "#ec4899", // Pink
    defaultCapacity: 20,
    defaultDurationMins: 60,
  },
]

// Weekly schedule template (times in UTC, matching Hitsona pattern)
// Day 0 = Sunday, 1 = Monday, etc.
interface ScheduleSlot {
  day: number // 0-6 (Sun-Sat)
  hour: number
  minute: number
  classType: string
  coachIndex: number // Which coach (0-5)
}

const WEEKLY_SCHEDULE: ScheduleSlot[] = [
  // Monday (day 1)
  { day: 1, hour: 6, minute: 30, classType: "HIIT", coachIndex: 0 },
  { day: 1, hour: 7, minute: 0, classType: "HIIT", coachIndex: 0 },
  { day: 1, hour: 9, minute: 30, classType: "HIIT", coachIndex: 1 },
  { day: 1, hour: 10, minute: 5, classType: "HIIT", coachIndex: 1 },
  { day: 1, hour: 10, minute: 30, classType: "CORE", coachIndex: 0 },
  { day: 1, hour: 12, minute: 30, classType: "HIIT", coachIndex: 2 },
  { day: 1, hour: 17, minute: 30, classType: "HIIT", coachIndex: 3 },
  { day: 1, hour: 18, minute: 0, classType: "Strength", coachIndex: 3 },
  { day: 1, hour: 19, minute: 0, classType: "Yoga", coachIndex: 4 },

  // Tuesday (day 2)
  { day: 2, hour: 6, minute: 30, classType: "HIIT", coachIndex: 0 },
  { day: 2, hour: 7, minute: 0, classType: "HIIT", coachIndex: 0 },
  { day: 2, hour: 9, minute: 30, classType: "HIIT", coachIndex: 1 },
  { day: 2, hour: 10, minute: 5, classType: "HIIT", coachIndex: 1 },
  { day: 2, hour: 12, minute: 30, classType: "HIIT", coachIndex: 2 },
  { day: 2, hour: 17, minute: 30, classType: "HIIT", coachIndex: 3 },
  { day: 2, hour: 18, minute: 0, classType: "CORE", coachIndex: 3 },

  // Wednesday (day 3)
  { day: 3, hour: 6, minute: 30, classType: "HIIT", coachIndex: 0 },
  { day: 3, hour: 7, minute: 0, classType: "HIIT", coachIndex: 0 },
  { day: 3, hour: 9, minute: 30, classType: "HIIT", coachIndex: 1 },
  { day: 3, hour: 10, minute: 5, classType: "HIIT", coachIndex: 1 },
  { day: 3, hour: 10, minute: 30, classType: "CORE", coachIndex: 0 },
  { day: 3, hour: 12, minute: 30, classType: "HIIT", coachIndex: 2 },
  { day: 3, hour: 17, minute: 30, classType: "HIIT", coachIndex: 3 },
  { day: 3, hour: 18, minute: 0, classType: "Strength", coachIndex: 4 },

  // Thursday (day 4)
  { day: 4, hour: 6, minute: 30, classType: "HIIT", coachIndex: 0 },
  { day: 4, hour: 7, minute: 0, classType: "HIIT", coachIndex: 0 },
  { day: 4, hour: 9, minute: 30, classType: "HIIT", coachIndex: 1 },
  { day: 4, hour: 10, minute: 5, classType: "HIIT", coachIndex: 1 },
  { day: 4, hour: 12, minute: 30, classType: "HIIT", coachIndex: 2 },
  { day: 4, hour: 17, minute: 30, classType: "HIIT", coachIndex: 3 },
  { day: 4, hour: 18, minute: 0, classType: "CORE", coachIndex: 3 },
  { day: 4, hour: 19, minute: 0, classType: "Yoga", coachIndex: 4 },

  // Friday (day 5)
  { day: 5, hour: 6, minute: 30, classType: "HIIT", coachIndex: 0 },
  { day: 5, hour: 7, minute: 0, classType: "HIIT", coachIndex: 0 },
  { day: 5, hour: 9, minute: 30, classType: "HIIT", coachIndex: 1 },
  { day: 5, hour: 10, minute: 5, classType: "HIIT", coachIndex: 1 },
  { day: 5, hour: 10, minute: 30, classType: "CORE", coachIndex: 0 },
  { day: 5, hour: 12, minute: 30, classType: "HIIT", coachIndex: 2 },
  { day: 5, hour: 17, minute: 30, classType: "HIIT", coachIndex: 3 },

  // Saturday (day 6) - Special weekend schedule
  { day: 6, hour: 8, minute: 45, classType: "HIIT", coachIndex: 0 },
  { day: 6, hour: 9, minute: 15, classType: "CORE", coachIndex: 3 },
  { day: 6, hour: 9, minute: 45, classType: "HIIT", coachIndex: 0 },
  { day: 6, hour: 10, minute: 15, classType: "CORE", coachIndex: 3 },
  { day: 6, hour: 10, minute: 45, classType: "HIIT", coachIndex: 0 },
  { day: 6, hour: 11, minute: 15, classType: "Strength", coachIndex: 1 },
]

const VENUE = "Centurion Fitness Studio"

async function main() {
  console.log("🏋️ Starting session seed...")

  // Get existing coaches
  const coaches = await prisma.user.findMany({
    where: { role: "COACH" },
    orderBy: { id: "asc" },
  })

  if (coaches.length === 0) {
    console.error("❌ No coaches found. Please run seed-test-data.ts first.")
    process.exit(1)
  }

  console.log(`Found ${coaches.length} coaches`)

  // Get existing clients for registrations
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { id: "asc" },
  })

  console.log(`Found ${clients.length} clients for registrations`)

  // Get ALL active cohorts for access
  const cohorts = await prisma.cohort.findMany({
    where: { status: "ACTIVE" },
  })
  console.log(`Found ${cohorts.length} active cohorts`)

  // Clear existing session data
  console.log("🧹 Clearing existing session data...")
  await prisma.sessionRegistration.deleteMany()
  await prisma.classSession.deleteMany()
  await prisma.cohortSessionAccess.deleteMany()
  await prisma.classType.deleteMany()

  // Create class types
  console.log("📋 Creating class types...")
  const classTypeMap = new Map<string, number>()

  for (const ct of CLASS_TYPES) {
    const created = await prisma.classType.create({
      data: ct,
    })
    classTypeMap.set(ct.name, created.id)
    console.log(`  Created: ${ct.name} (${ct.color})`)
  }

  // Create cohort session access for ALL active cohorts
  if (cohorts.length > 0) {
    console.log("🔑 Creating cohort session access...")
    for (const cohort of cohorts) {
      for (const [, classTypeId] of classTypeMap) {
        await prisma.cohortSessionAccess.create({
          data: {
            cohortId: cohort.id,
            classTypeId,
          },
        })
      }
      console.log(`  Granted access to ${classTypeMap.size} class types for cohort "${cohort.name}"`)
    }
  }

  // Generate sessions for 3 months
  // Start from 1 week ago to have some past sessions
  const startDate = startOfWeek(addWeeks(new Date(), -1), { weekStartsOn: 1 })
  const weeksToGenerate = 14 // ~3 months + buffer

  console.log(`\n📅 Generating sessions from ${format(startDate, "MMM d, yyyy")} for ${weeksToGenerate} weeks...`)

  let sessionsCreated = 0
  let registrationsCreated = 0
  const now = new Date()

  for (let week = 0; week < weeksToGenerate; week++) {
    const weekStart = addWeeks(startDate, week)

    for (const slot of WEEKLY_SCHEDULE) {
      // Calculate the date for this slot
      const sessionDate = addDays(weekStart, slot.day === 0 ? 6 : slot.day - 1) // Adjust for Monday start
      let startTime = setHours(sessionDate, slot.hour)
      startTime = setMinutes(startTime, slot.minute)

      const classTypeId = classTypeMap.get(slot.classType)
      if (!classTypeId) continue

      const classType = CLASS_TYPES.find((ct) => ct.name === slot.classType)!
      const endTime = addMinutes(startTime, classType.defaultDurationMins)

      // Use coach based on schedule, wrapping if needed
      const coach = coaches[slot.coachIndex % coaches.length]

      // Determine status based on time
      const isPast = isBefore(endTime, now)
      const status = isPast ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED

      const session = await prisma.classSession.create({
        data: {
          classTypeId,
          coachId: coach.id,
          title: slot.classType,
          startTime,
          endTime,
          maxOccupancy: classType.defaultCapacity,
          location: VENUE,
          notes: classType.description,
          status,
        },
      })

      sessionsCreated++

      // Add random registrations (more for past sessions, less for future)
      if (clients.length > 0) {
        let registrationCount: number

        if (isPast) {
          // Past sessions: 50-100% full
          registrationCount = Math.floor(
            classType.defaultCapacity * (0.5 + Math.random() * 0.5)
          )
        } else if (isBefore(startTime, addWeeks(now, 1))) {
          // Next week: 30-70% full
          registrationCount = Math.floor(
            classType.defaultCapacity * (0.3 + Math.random() * 0.4)
          )
        } else if (isBefore(startTime, addWeeks(now, 2))) {
          // Week after: 10-40% full
          registrationCount = Math.floor(
            classType.defaultCapacity * (0.1 + Math.random() * 0.3)
          )
        } else {
          // Further out: 0-20% full
          registrationCount = Math.floor(
            classType.defaultCapacity * Math.random() * 0.2
          )
        }

        // Randomly select clients to register
        const shuffledClients = [...clients].sort(() => Math.random() - 0.5)
        const registeredClients = shuffledClients.slice(0, Math.min(registrationCount, clients.length))

        for (const client of registeredClients) {
          const registrationStatus = isPast
            ? (Math.random() > 0.1 ? RegistrationStatus.ATTENDED : RegistrationStatus.NO_SHOW)
            : RegistrationStatus.REGISTERED

          try {
            await prisma.sessionRegistration.create({
              data: {
                sessionId: session.id,
                userId: client.id,
                status: registrationStatus,
              },
            })
            registrationsCreated++
          } catch {
            // Ignore duplicate registrations
          }
        }
      }
    }

    // Progress indicator every 2 weeks
    if (week % 2 === 0) {
      process.stdout.write(`  Week ${week + 1}/${weeksToGenerate}...\r`)
    }
  }

  console.log(`\n✅ Created ${sessionsCreated} sessions`)
  console.log(`✅ Created ${registrationsCreated} registrations`)

  // Summary stats
  const futureSessionsCount = await prisma.classSession.count({
    where: { startTime: { gte: now } },
  })
  const pastSessionsCount = await prisma.classSession.count({
    where: { endTime: { lt: now } },
  })

  console.log("\n📊 Summary:")
  console.log(`  Past sessions: ${pastSessionsCount}`)
  console.log(`  Upcoming sessions: ${futureSessionsCount}`)
  console.log(`  Total registrations: ${registrationsCreated}`)

  // Show sample of upcoming sessions
  console.log("\n📅 Sample upcoming sessions:")
  const sampleSessions = await prisma.classSession.findMany({
    where: { startTime: { gte: now } },
    include: {
      classType: true,
      coach: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { startTime: "asc" },
    take: 10,
  })

  for (const s of sampleSessions) {
    console.log(
      `  ${format(s.startTime, "EEE MMM d HH:mm")} - ${s.classType?.name ?? s.title} with ${s.coach.name} (${s._count.registrations}/${s.maxOccupancy})`
    )
  }

  console.log("\n✨ Session seed completed!")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding sessions:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
