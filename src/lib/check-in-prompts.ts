/**
 * Check-in prompt configuration constants
 */

export const MANDATORY_PROMPTS = ["weight", "steps", "calories", "perceivedStress"]

export const OPTIONAL_PROMPTS = ["sleepQuality", "notes"]

export const ALL_CHECK_IN_PROMPTS = [
  { key: "weight", label: "Weight", mandatory: true },
  { key: "steps", label: "Steps", mandatory: true },
  { key: "calories", label: "Calories", mandatory: true },
  { key: "perceivedStress", label: "Perceived Stress (1-10)", mandatory: true },
  { key: "sleepQuality", label: "Sleep Quality (1-10)", mandatory: false },
  { key: "notes", label: "Notes / Comments", mandatory: false },
]
