import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const SYSTEM_SETTINGS_DEFAULTS: Record<string, unknown> = {
  // Coach management
  maxClientsPerCoach: 50,
  minClientsPerCoach: 10,

  // Activity windows
  recentActivityDays: 14,
  lowEngagementEntries: 7,
  noActivityDays: 14,
  criticalNoActivityDays: 30,
  shortTermWindowDays: 7,
  longTermWindowDays: 30,

  // Check-in
  defaultCheckInFrequencyDays: 7,
  notificationTimeUtc: "09:00",

  // Feature flags
  healthkitEnabled: true,
  iosIntegrationEnabled: true,
  showPersonalizedPlan: true,
  appointmentsEnabled: false,
  sessionsEnabled: true,
  cohortsEnabled: true,

  // Admin
  adminOverrideEmail: "",

  // Adherence scoring
  adherenceGreenMinimum: 6,
  adherenceAmberMinimum: 3,
  attentionMissedCheckinsPolicy: "option_a",

  // Body fat categories
  bodyFatLowPercent: 12.5,
  bodyFatMediumPercent: 20.0,
  bodyFatHighPercent: 30.0,
  bodyFatVeryHighPercent: 37.5,

  // Nutrition
  minDailyCalories: 1000,
  maxDailyCalories: 5000,
  minProteinPerLb: 0.4,
  maxProteinPerLb: 2.0,
  defaultCarbsPercent: 40.0,
  defaultProteinPercent: 30.0,
  defaultFatPercent: 30.0,

  // Step categories (thresholds)
  stepsNotMuch: 5000,
  stepsLight: 7500,
  stepsModerate: 10000,
  stepsHeavy: 12500,

  // Workout categories (minutes thresholds)
  workoutNotMuch: 75,
  workoutLight: 150,
  workoutModerate: 225,
  workoutHeavy: 300,

  // Legal content
  termsContentHtml: "",
  privacyContentHtml: "",
  dataProcessingContentHtml: "",
  consentVersion: "1.0.0",
}

async function main() {
  console.log("Seeding system settings defaults...")

  let created = 0
  let skipped = 0

  for (const [key, value] of Object.entries(SYSTEM_SETTINGS_DEFAULTS)) {
    const existing = await prisma.systemSettings.findUnique({ where: { key } })
    if (!existing) {
      await prisma.systemSettings.create({
        data: {
          key,
          value: value as any,
        },
      })
      created++
      console.log(`  Created: ${key} = ${JSON.stringify(value)}`)
    } else {
      skipped++
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped (already exist): ${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
