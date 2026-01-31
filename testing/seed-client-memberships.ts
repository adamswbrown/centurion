/**
 * Seed script to add memberships to centurion test clients
 * Usage: npx tsx testing/seed-client-memberships.ts
 */

import { PrismaClient, MembershipPlanType, MembershipTierStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Get centurion test clients
  const clients = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      email: { contains: "@centurion.test" },
    },
  })

  console.log(`Found ${clients.length} centurion test clients`)

  // Get or create a default membership plan
  let plan = await prisma.membershipPlan.findFirst({
    where: { name: "Unlimited" },
  })

  if (!plan) {
    plan = await prisma.membershipPlan.create({
      data: {
        name: "Unlimited",
        type: MembershipPlanType.RECURRING,
        sessionsPerWeek: null, // Unlimited
        monthlyPrice: 99.99,
        isActive: true,
      },
    })
    console.log("Created Unlimited plan")
  } else {
    console.log("Found existing Unlimited plan")
  }

  // Get cohort for membership
  const cohort = await prisma.cohort.findFirst({
    where: { status: "ACTIVE" },
  })

  console.log(`Using cohort: ${cohort?.name || "None"}`)

  // Add memberships to test clients
  for (const client of clients) {
    // Check if already has membership
    const existing = await prisma.userMembership.findFirst({
      where: { userId: client.id },
    })

    if (existing) {
      console.log(`  ${client.email}: Already has membership`)
      continue
    }

    // Create membership
    await prisma.userMembership.create({
      data: {
        userId: client.id,
        planId: plan.id,
        status: MembershipTierStatus.ACTIVE,
        startDate: new Date(),
      },
    })
    console.log(`  ${client.email}: Added membership`)

    // Add to cohort if available
    if (cohort) {
      const existingCohort = await prisma.cohortMembership.findFirst({
        where: { userId: client.id, cohortId: cohort.id },
      })

      if (!existingCohort) {
        await prisma.cohortMembership.create({
          data: {
            userId: client.id,
            cohortId: cohort.id,
            status: "ACTIVE",
          },
        })
        console.log(`    Added to cohort: ${cohort.name}`)
      }
    }
  }

  console.log("Done!")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
