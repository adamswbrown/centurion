/**
 * E2E Test Data Seeding Script
 *
 * Seeds database with test users, sessions, memberships, etc.
 * Run before E2E tests to ensure consistent test data.
 *
 * Usage: npx tsx e2e/setup/seed-test-data.ts
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting E2E test data seeding...")

  // Clean up existing test data
  console.log("Cleaning up existing test users...")
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["admin@test.com", "coach@test.com", "client@test.com"],
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
      emailVerified: new Date(),
    },
  })
  console.log(`✓ Created admin user (id: ${admin.id})`)

  const coach = await prisma.user.create({
    data: {
      email: "coach@test.com",
      password: hashedPassword,
      name: "Test Coach",
      role: "COACH",
      isTestUser: true,
      emailVerified: new Date(),
    },
  })
  console.log(`✓ Created coach user (id: ${coach.id})`)

  const client = await prisma.user.create({
    data: {
      email: "client@test.com",
      password: hashedPassword,
      name: "Test Client",
      role: "CLIENT",
      isTestUser: true,
      emailVerified: new Date(),
      credits: 10,
    },
  })
  console.log(`✓ Created client user (id: ${client.id})`)

  // Create test class type
  console.log("Creating test class type...")
  const classType = await prisma.classType.create({
    data: {
      name: "HIIT",
      description: "High-intensity interval training",
      duration: 45,
      color: "#FF5733",
      createdBy: coach.id,
    },
  })
  console.log(`✓ Created class type (id: ${classType.id})`)

  // Create test sessions
  console.log("Creating test sessions...")
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(10, 0, 0, 0)

  const session1 = await prisma.classSession.create({
    data: {
      classTypeId: classType.id,
      coachId: coach.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 45 * 60 * 1000),
      maxOccupancy: 20,
      status: "SCHEDULED",
    },
  })
  console.log(`✓ Created session 1 (id: ${session1.id})`)

  const session2 = await prisma.classSession.create({
    data: {
      classTypeId: classType.id,
      coachId: coach.id,
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 45 * 60 * 1000),
      maxOccupancy: 20,
      status: "SCHEDULED",
    },
  })
  console.log(`✓ Created session 2 (id: ${session2.id})`)

  // Create test membership plans
  console.log("Creating test membership plans...")

  const recurringPlan = await prisma.membershipPlan.create({
    data: {
      name: "Monthly Unlimited",
      description: "Unlimited classes per month",
      type: "RECURRING",
      monthlyPrice: 149,
      maxSessionsPerWeek: 0, // Unlimited
      isActive: true,
      createdBy: admin.id,
    },
  })
  console.log(`✓ Created recurring plan (id: ${recurringPlan.id})`)

  const packPlan = await prisma.membershipPlan.create({
    data: {
      name: "10 Class Pack",
      description: "10 classes, no expiration",
      type: "PACK",
      packPrice: 180,
      packSessionCount: 10,
      packNeverExpires: true,
      isActive: true,
      createdBy: admin.id,
    },
  })
  console.log(`✓ Created pack plan (id: ${packPlan.id})`)

  const prepaidPlan = await prisma.membershipPlan.create({
    data: {
      name: "3-Month Prepaid",
      description: "3 months of unlimited classes",
      type: "PREPAID",
      prepaidPrice: 399,
      prepaidDurationMonths: 3,
      isActive: true,
      createdBy: admin.id,
    },
  })
  console.log(`✓ Created prepaid plan (id: ${prepaidPlan.id})`)

  // Assign membership to client
  console.log("Assigning membership to test client...")
  const membership = await prisma.userMembership.create({
    data: {
      userId: client.id,
      membershipPlanId: recurringPlan.id,
      status: "ACTIVE",
      startDate: now,
      weeklySessionsUsed: 2,
      currentWeekStart: now,
    },
  })
  console.log(`✓ Created user membership (id: ${membership.id})`)

  // Register client for session
  console.log("Registering client for session...")
  const registration = await prisma.sessionRegistration.create({
    data: {
      sessionId: session1.id,
      userId: client.id,
      status: "REGISTERED",
    },
  })
  console.log(`✓ Created session registration (id: ${registration.id})`)

  console.log("\nE2E test data seeding completed successfully!")
  console.log("\nTest user credentials:")
  console.log("  Admin: admin@test.com / password123")
  console.log("  Coach: coach@test.com / password123")
  console.log("  Client: client@test.com / password123")
}

main()
  .catch((e) => {
    console.error("Error seeding test data:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
