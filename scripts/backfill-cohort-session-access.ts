/**
 * Backfill CohortSessionAccess join table
 *
 * Reads historical ClassSession records that had a cohortId and classTypeId,
 * extracts unique (cohortId, classTypeId) pairs, and creates CohortSessionAccess
 * records for each pair (skipping any that already exist).
 *
 * Usage: npx tsx scripts/backfill-cohort-session-access.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function backfill() {
  console.log("Starting CohortSessionAccess backfill...")

  // 1. Find all unique (cohortId, classTypeId) pairs from historical sessions
  const sessions = await prisma.classSession.findMany({
    where: {
      cohortId: { not: null },
      classTypeId: { not: null },
    },
    select: {
      cohortId: true,
      classTypeId: true,
    },
    distinct: ["cohortId", "classTypeId"],
  })

  console.log(`Found ${sessions.length} unique (cohortId, classTypeId) pairs from historical sessions`)

  if (sessions.length === 0) {
    console.log("No historical data to backfill. Done.")
    return
  }

  // 2. Check which pairs already exist
  const existing = await prisma.cohortSessionAccess.findMany({
    select: { cohortId: true, classTypeId: true },
  })

  const existingSet = new Set(
    existing.map((e) => `${e.cohortId}-${e.classTypeId}`)
  )

  const toCreate = sessions.filter(
    (s) => !existingSet.has(`${s.cohortId}-${s.classTypeId}`)
  )

  console.log(`${existing.length} records already exist, ${toCreate.length} new records to create`)

  if (toCreate.length === 0) {
    console.log("All pairs already exist. Done.")
    return
  }

  // 3. Create missing records
  const result = await prisma.cohortSessionAccess.createMany({
    data: toCreate.map((s) => ({
      cohortId: s.cohortId!,
      classTypeId: s.classTypeId!,
    })),
    skipDuplicates: true,
  })

  console.log(`Created ${result.count} CohortSessionAccess records`)

  // 4. Summary
  const total = await prisma.cohortSessionAccess.count()
  console.log(`Total CohortSessionAccess records: ${total}`)
  console.log("Backfill complete.")
}

backfill()
  .catch((err) => {
    console.error("Backfill failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
