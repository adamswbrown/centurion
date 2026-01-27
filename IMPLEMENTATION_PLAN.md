# Centurion Implementation Plan - 23 Feature Gaps

**Generated:** 2026-01-27
**Source:** AUDIT.md cross-platform feature audit (CoachFit + PTP vs Centurion)
**Total Gaps:** 9 Critical, 8 Medium, 6 Low

---

## Table of Contents

- [Codebase Architecture Summary](#codebase-architecture-summary)
- [Phase 1: Legal & Auth (C1, C6, C7)](#phase-1-legal--auth-c1-c6-c7)
- [Phase 2: User Personalization (C2, C3, C9)](#phase-2-user-personalization-c2-c3-c9)
- [Phase 3: Admin Configuration (C4, C5, C8)](#phase-3-admin-configuration-c4-c5-c8)
- [Phase 4: Medium Gaps (M1-M8)](#phase-4-medium-gaps-m1-m8)
- [Phase 5: Polish (L1-L6)](#phase-5-polish-l1-l6)
- [Migration Execution Order](#migration-execution-order)

---

## Codebase Architecture Summary

**Tech Stack:**
- Next.js 15 (App Router), React 19, TypeScript
- Prisma 6.3 + PostgreSQL
- NextAuth v5 (JWT strategy, 30-day sessions)
- Resend for email, Stripe for payments
- Tailwind CSS 4, Radix UI, shadcn/ui components
- Zod for validation, date-fns for dates
- TipTap for rich text editing (already installed)
- SurveyJS for questionnaires
- Vitest for testing, Playwright for E2E

**Key Patterns:**
- Server Actions in `src/app/actions/*.ts` (not API routes for most CRUD)
- Auth guards: `requireAuth()`, `requireAdmin()`, `requireCoach()` from `src/lib/auth.ts`
- Audit logging via `logAuditEvent()` from `src/lib/audit-log.ts`
- Email via `sendSystemEmail()` with template keys from `src/lib/email-templates.ts`
- UI components in `src/components/ui/` (shadcn), features in `src/features/`
- Pages in `src/app/` with `AppLayout` wrapper
- SystemSettings stored as key-value pairs (key: string, value: Json)
- ViewModeContext for admin/coach view switching already exists

**Database:** PostgreSQL via Prisma, autoincrement integer IDs, `@@map("snake_case")` table names

---

## Phase 1: Legal & Auth (C1, C6, C7)

### C1: Password Reset Flow

**Priority:** CRITICAL
**Source:** PTP
**Description:** Forgot password -> email token -> reset flow. Users currently cannot recover accounts without admin intervention.

#### 1.1 Database Schema Changes

The `VerificationToken` model already exists and can be reused for password reset tokens:

```prisma
// No schema change needed - VerificationToken already supports this:
// model VerificationToken {
//   identifier String   // Will store email
//   token      String   @unique
//   expires    DateTime
//   @@unique([identifier, token])
//   @@map("verification_tokens")
// }
```

No migration required.

#### 1.2 Server Actions

**File:** `src/app/actions/password-reset.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { sendSystemEmail } from "@/lib/email"
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email-templates"

const requestResetSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
})

export async function requestPasswordReset(input: z.infer<typeof requestResetSchema>)
  // Validate input
  // Find user by email
  // If user exists AND has a password (not OAuth-only):
  //   Generate random token (32 bytes hex)
  //   Delete any existing tokens for this email
  //   Create VerificationToken with 1-hour expiry
  //   Send password_reset email with reset URL
  // Always return success (don't reveal if email exists)
  // Return { success: true }

export async function validateResetToken(token: string)
  // Find token in VerificationToken
  // Check not expired
  // Return { valid: boolean, email?: string }

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>)
  // Validate input
  // Find and validate token
  // Hash new password with bcrypt (12 rounds)
  // Update user password
  // Delete the used token
  // Delete all other tokens for this email
  // Return { success: true }
```

#### 1.3 Email Template Update

**File:** `src/lib/email-templates.ts`

The `PASSWORD_RESET` template key and template already exist. Add `resetUrl` to the token whitelist:

```typescript
// Add to TOKEN_WHITELIST:
"resetUrl"

// Add to EmailVariables interface:
resetUrl?: string

// Update password_reset template body to use {{resetUrl}} instead of {{loginUrl}}
```

#### 1.4 UI Pages

**File:** `src/app/forgot-password/page.tsx`
- Simple form with email input
- Calls `requestPasswordReset` server action
- Shows success message regardless (security: don't reveal if email exists)
- Link back to login

**File:** `src/app/reset-password/page.tsx`
- Reads `token` from URL search params
- Calls `validateResetToken` on mount
- If valid: show new password form (password + confirm)
- If invalid/expired: show error with link to request new reset
- On submit: calls `resetPassword`, redirects to login on success

**File:** `src/app/login/page.tsx` (modify)
- Add "Forgot password?" link below the password field, linking to `/forgot-password`

#### 1.5 Implementation Details

- Token format: `randomBytes(32).toString("hex")` (64 char hex string)
- Token expiry: 1 hour from creation
- Rate limiting: Delete existing tokens before creating new one (prevents token spam)
- Security: Always return success on request (prevents email enumeration)
- OAuth-only users: Silently skip (they don't have passwords)

---

### C6: GDPR Account Deletion + Data Export

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** Cascade deletion of all user data. Data export endpoint returning profile, entries, workouts, sleep records.

#### 6.1 Database Schema Changes

No schema changes needed. All relations already have `onDelete: Cascade` configured, which means deleting a User will cascade to:
- Account, Session, Appointment (both relations), BootcampAttendee, Workout
- CohortMembership, CoachCohortMembership, Entry, WeeklyQuestionnaireResponse
- CoachNote (both relations), WeeklyCoachResponse (both relations)
- HealthKitWorkout, SleepRecord, PairingCode (both relations)
- CreditTransaction (both relations), Invoice

#### 6.2 Server Actions

**File:** `src/app/actions/gdpr.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/audit-log"

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  password: z.string().optional(), // Required for password users
})

export async function exportUserData()
  // requireAuth()
  // Fetch ALL user data across every table:
  //   - User profile (excluding password hash)
  //   - Entries (all)
  //   - HealthKitWorkouts (all)
  //   - SleepRecords (all)
  //   - Appointments (as client)
  //   - Workouts (all)
  //   - CohortMemberships (all)
  //   - WeeklyQuestionnaireResponses (all)
  //   - CoachNotes received
  //   - WeeklyCoachResponses received
  //   - Invoices (all)
  //   - CreditTransactions received
  // Return as structured JSON object
  // Log audit event: EXPORT_USER_DATA

export async function deleteAccount(input: z.infer<typeof deleteAccountSchema>)
  // requireAuth()
  // Validate confirmation text
  // If user has password: verify password matches
  // Log audit event BEFORE deletion: DELETE_ACCOUNT
  // Delete user (cascades handle all related data)
  // Return { success: true }
  // Note: Client should sign out and redirect to home page
```

#### 6.3 UI Components

**File:** `src/features/settings/DataExportButton.tsx`
- Button that triggers `exportUserData()`
- Downloads result as JSON file named `centurion-data-export-{date}.json`
- Shows loading state during export

**File:** `src/features/settings/DeleteAccountDialog.tsx`
- Alert dialog (uses existing `alert-dialog` component)
- Explains consequences: "All your data will be permanently deleted"
- Requires typing "DELETE MY ACCOUNT" to confirm
- For password users: also requires password input
- Calls `deleteAccount()`, signs out on success, redirects to `/`

**File:** `src/app/client/settings/page.tsx` (modify) OR `src/app/settings/page.tsx` (modify)
- Add "Data & Privacy" section at bottom
- Add DataExportButton and DeleteAccountDialog components

---

### C7: Consent Management

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** UserConsent model: terms acceptance, privacy policy, data processing agreement, marketing opt-in. Version tracking, IP/UA capture.

#### 7.1 Database Schema Changes

**File:** `prisma/schema.prisma`

```prisma
model UserConsent {
  id              Int       @id @default(autoincrement())
  userId          Int       @unique
  termsAccepted   DateTime
  privacyAccepted DateTime
  dataProcessing  DateTime
  marketing       DateTime?  // Optional marketing opt-in
  version         String     // e.g. "1.0.0" - tracks which version of terms
  ipAddress       String?
  userAgent       String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_consents")
  @@index([userId])
  @@index([createdAt])
}
```

Add to User model:
```prisma
consent UserConsent?
```

Add legal content fields to SystemSettings (stored as key-value):
- `termsContentHtml` (string)
- `privacyContentHtml` (string)
- `dataProcessingContentHtml` (string)
- `consentVersion` (string, e.g., "1.0.0")

#### 7.2 Server Actions

**File:** `src/app/actions/consent.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { headers } from "next/headers"

const acceptConsentSchema = z.object({
  termsAccepted: z.boolean().refine(v => v === true, "Must accept terms"),
  privacyAccepted: z.boolean().refine(v => v === true, "Must accept privacy policy"),
  dataProcessing: z.boolean().refine(v => v === true, "Must accept data processing"),
  marketing: z.boolean().optional(),
})

export async function getUserConsent()
  // requireAuth()
  // Return user's consent record (or null if none)

export async function acceptConsent(input: z.infer<typeof acceptConsentSchema>)
  // requireAuth()
  // Get IP from headers (x-forwarded-for)
  // Get User-Agent from headers
  // Get current consent version from SystemSettings
  // Upsert UserConsent record
  // Log audit event: ACCEPT_CONSENT

export async function hasValidConsent()
  // requireAuth()
  // Check if user has consent record
  // Check if consent version matches current system version
  // Return { valid: boolean, needsUpdate: boolean }

export async function getLegalContent()
  // Fetch termsContentHtml, privacyContentHtml, dataProcessingContentHtml
  // from SystemSettings
  // Return { terms, privacy, dataProcessing, version }

export async function updateLegalContent(input: { key: string; html: string })
  // requireAdmin()
  // Update SystemSettings key
  // Optionally bump consentVersion
  // Log audit event: UPDATE_LEGAL_CONTENT
```

#### 7.3 UI Components

**File:** `src/features/consent/ConsentBanner.tsx`
- Shown when `hasValidConsent()` returns `{ valid: false }`
- Full-page modal or banner that blocks interaction until consent given
- Checkboxes for terms, privacy, data processing (required), marketing (optional)
- Links to view full legal text
- Calls `acceptConsent()` on submit

**File:** `src/app/legal/terms/page.tsx`
- Public page rendering `termsContentHtml` from SystemSettings
- No auth required

**File:** `src/app/legal/privacy/page.tsx`
- Public page rendering `privacyContentHtml` from SystemSettings
- No auth required

**File:** `src/app/legal/data-processing/page.tsx`
- Public page rendering `dataProcessingContentHtml` from SystemSettings
- No auth required

**File:** `src/app/admin/settings/page.tsx` (modify)
- Add "Legal Content" section with TipTap editors for terms, privacy, DPA
- Uses existing `EmailEditor` component (rename or abstract to `RichTextEditor`)

**File:** `src/app/layout.tsx` or `src/components/layouts/AppLayout.tsx` (modify)
- Add `ConsentBanner` check for authenticated users
- Only show for logged-in users who haven't consented to current version

---

## Phase 2: User Personalization (C2, C3, C9)

### C2: User Goals/Targets

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** UserGoals model: target weight, daily calories, macro targets (protein/carbs/fat grams), water intake, daily steps, weekly workout minutes.

#### 2.1 Database Schema Changes

**File:** `prisma/schema.prisma`

```prisma
model UserGoals {
  id                   Int      @id @default(autoincrement())
  userId               Int      @unique
  currentWeightKg      Float?
  targetWeightKg       Float?
  heightCm             Float?
  dailyCaloriesKcal    Int?
  proteinGrams         Float?
  carbGrams            Float?
  fatGrams             Float?
  waterIntakeMl        Int?
  dailyStepsTarget     Int?
  weeklyWorkoutMinutes Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_goals")
  @@index([userId])
}
```

Add to User model:
```prisma
goals UserGoals?
```

#### 2.2 Server Actions

**File:** `src/app/actions/goals.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { auth } from "@/auth"

const userGoalsSchema = z.object({
  currentWeightKg: z.number().positive().optional().nullable(),
  targetWeightKg: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  dailyCaloriesKcal: z.number().int().positive().optional().nullable(),
  proteinGrams: z.number().positive().optional().nullable(),
  carbGrams: z.number().positive().optional().nullable(),
  fatGrams: z.number().positive().optional().nullable(),
  waterIntakeMl: z.number().int().positive().optional().nullable(),
  dailyStepsTarget: z.number().int().positive().optional().nullable(),
  weeklyWorkoutMinutes: z.number().int().positive().optional().nullable(),
})

export type UserGoalsInput = z.infer<typeof userGoalsSchema>

export async function getUserGoals(userId?: number)
  // requireAuth() or requireCoach() if accessing another user
  // Permission check: clients can only get their own
  // Upsert-style: return goals or null

export async function upsertUserGoals(input: UserGoalsInput)
  // requireAuth()
  // Validate with schema
  // prisma.userGoals.upsert() on userId
  // Return updated goals
```

#### 2.3 UI Components

**File:** `src/features/goals/UserGoalsForm.tsx`
- Form with fields for all goal targets
- Organized into cards: "Weight Goals", "Nutrition Goals", "Activity Goals"
- Uses existing Input, Label, Card components
- Calls `upsertUserGoals()` server action
- Pre-populated from `getUserGoals()`

**File:** `src/app/client/settings/page.tsx` (modify)
- Add "Goals & Targets" section
- Embed `UserGoalsForm`

**File:** `src/app/client/dashboard/page.tsx` (modify)
- Show goal progress indicators (current vs target weight, steps today vs target, etc.)
- Use data from `getUserGoals()` + latest Entry

**File:** `src/features/goals/GoalProgressCard.tsx`
- Reusable card showing progress toward a goal (e.g., steps: 7500/10000)
- Progress bar with percentage
- Used on client dashboard

---

### C3: User Preferences (Units, Date Format)

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** Weight unit (lbs/kg), measurement unit (inches/cm), date format. UK/metric users see wrong units.

#### 3.1 Database Schema Changes

**File:** `prisma/schema.prisma`

```prisma
model UserPreference {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  weightUnit      String   @default("lbs")    // "lbs" | "kg"
  measurementUnit String   @default("inches")  // "inches" | "cm"
  dateFormat      String   @default("MM/dd/yyyy") // "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd"

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_preferences")
  @@index([userId])
}
```

Add to User model:
```prisma
preferences UserPreference?
```

#### 3.2 Server Actions

**File:** `src/app/actions/preferences.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

const userPreferenceSchema = z.object({
  weightUnit: z.enum(["lbs", "kg"]).optional(),
  measurementUnit: z.enum(["inches", "cm"]).optional(),
  dateFormat: z.enum(["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]).optional(),
})

export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>

export async function getUserPreferences(userId?: number)
  // requireAuth()
  // Return preferences or defaults
  // Default: { weightUnit: "lbs", measurementUnit: "inches", dateFormat: "MM/dd/yyyy" }

export async function updateUserPreferences(input: UserPreferenceInput)
  // requireAuth()
  // Validate
  // Upsert preferences
  // Return updated preferences
```

#### 3.3 Utility Functions

**File:** `src/lib/unit-conversions.ts` (new - also covers M8)

```typescript
// Weight conversions
export function lbsToKg(lbs: number): number
  // return lbs * 0.453592

export function kgToLbs(kg: number): number
  // return kg / 0.453592

// Length conversions
export function inchesToCm(inches: number): number
  // return inches * 2.54

export function cmToInches(cm: number): number
  // return cm / 2.54

// Display helpers
export function formatWeight(value: number, unit: "lbs" | "kg"): string
  // If unit is kg and value is stored in lbs, convert first
  // Return formatted string with unit suffix

export function formatHeight(value: number, unit: "inches" | "cm"): string
  // Convert and format with unit

export function formatDate(date: Date, format: string): string
  // Use date-fns format() with the user's preferred format
```

**File:** `src/hooks/usePreferences.ts` (new)

```typescript
// Client-side hook for accessing user preferences
// Fetches preferences on mount
// Provides conversion helpers:
//   displayWeight(valueInLbs) -> formatted string in user's preferred unit
//   displayDate(date) -> formatted string in user's preferred format
//   displayHeight(valueInInches) -> formatted string in user's preferred unit
```

#### 3.4 UI Components

**File:** `src/features/settings/UserPreferencesForm.tsx`
- Select dropdowns for weight unit, measurement unit, date format
- Calls `updateUserPreferences()`
- Shows preview of how values will display

**File:** `src/app/client/settings/page.tsx` (modify)
- Add "Display Preferences" section
- Embed `UserPreferencesForm`

**Integration points** (modify throughout app):
- `src/features/entries/CheckInForm.tsx` - Display weight in preferred unit
- `src/features/entries/CheckInHistory.tsx` - Format dates and weights
- `src/features/entries/CheckInStats.tsx` - Format dates
- `src/app/client/dashboard/page.tsx` - All date/weight displays
- Coach views showing client data should also respect client preferences

---

### C9: 3-Level Check-in Frequency Override

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** SystemSettings default (7 days) -> per-cohort override -> per-user override. Impacts adherence calculations.

#### 9.1 Database Schema Changes

**File:** `prisma/schema.prisma`

Add to `Cohort` model:
```prisma
checkInFrequencyDays Int?  // Override system default
```

Add to `User` model:
```prisma
checkInFrequencyDays Int?  // Override cohort and system default
```

Add system setting key: `defaultCheckInFrequencyDays` (value: 7)

#### 9.2 Server Actions

**File:** `src/app/actions/check-in-frequency.ts`

```typescript
"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireAdmin, requireCoach } from "@/lib/auth"

export async function getEffectiveCheckInFrequency(userId: number): Promise<number>
  // 1. Check user-level override (User.checkInFrequencyDays)
  //    If set, return it
  // 2. Check cohort-level override (find user's active cohort, check Cohort.checkInFrequencyDays)
  //    If set, return it
  // 3. Fall back to system default (SystemSettings key "defaultCheckInFrequencyDays")
  //    Default: 7

export async function updateCohortCheckInFrequency(cohortId: number, days: number | null)
  // requireCoach()
  // Update Cohort.checkInFrequencyDays
  // null = clear override (use system default)

export async function updateUserCheckInFrequency(userId: number, days: number | null)
  // requireCoach()
  // Update User.checkInFrequencyDays
  // null = clear override (use cohort/system default)

export async function getCheckInFrequencyConfig(userId: number)
  // Returns all 3 levels:
  // { systemDefault: 7, cohortOverride: 5 | null, userOverride: 3 | null, effective: 3 }
```

#### 9.3 UI Components

**File:** `src/features/cohorts/CohortDetail.tsx` (modify)
- Add check-in frequency override field in cohort settings
- Input with clear button to remove override
- Shows "System default: X days" as placeholder

**File:** `src/features/users/UserDetail.tsx` or member detail (modify)
- Add check-in frequency override for individual user
- Shows effective frequency with source label (system/cohort/user)
- Coaches can set per-user overrides

**File:** `src/features/settings/SystemSettingsForm.tsx` (modify)
- Add `defaultCheckInFrequencyDays` field
- Label: "Default Check-in Frequency (days)"

#### 9.4 Integration Points

- Adherence calculations in `src/app/actions/coach-analytics.ts` must use `getEffectiveCheckInFrequency()`
- Attention score calculations must use effective frequency
- Missed check-in detection must use effective frequency

---

## Phase 3: Admin Configuration (C4, C5, C8)

### C4: Extended System Settings (50+ params)

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** 50+ params covering calorie limits, protein ranges, macro defaults, step categories, workout categories, body fat categories, adherence thresholds.

#### 4.1 Database Schema Changes

No schema changes needed. The existing `SystemSettings` key-value model supports arbitrary settings. We just need to add more keys.

#### 4.2 New Setting Keys

The following keys should be seeded/supported (matching CoachFit's `SystemSettings` model):

```typescript
// Coach management
"maxClientsPerCoach"          // Int, default: 50
"minClientsPerCoach"          // Int, default: 10

// Activity windows
"recentActivityDays"          // Int, default: 14
"lowEngagementEntries"        // Int, default: 7
"noActivityDays"              // Int, default: 14
"criticalNoActivityDays"      // Int, default: 30
"shortTermWindowDays"         // Int, default: 7
"longTermWindowDays"          // Int, default: 30

// Check-in
"defaultCheckInFrequencyDays" // Int, default: 7
"notificationTimeUtc"         // String, default: "09:00"

// Feature flags
"healthkitEnabled"            // Boolean, default: true
"iosIntegrationEnabled"       // Boolean, default: true
"showPersonalizedPlan"        // Boolean, default: true

// Admin
"adminOverrideEmail"          // String, optional

// Adherence scoring
"adherenceGreenMinimum"       // Int, default: 6
"adherenceAmberMinimum"       // Int, default: 3
"attentionMissedCheckinsPolicy" // String, default: "option_a"

// Body fat categories
"bodyFatLowPercent"           // Float, default: 12.5
"bodyFatMediumPercent"        // Float, default: 20.0
"bodyFatHighPercent"          // Float, default: 30.0
"bodyFatVeryHighPercent"      // Float, default: 37.5

// Nutrition
"minDailyCalories"            // Int, default: 1000
"maxDailyCalories"            // Int, default: 5000
"minProteinPerLb"             // Float, default: 0.4
"maxProteinPerLb"             // Float, default: 2.0
"defaultCarbsPercent"         // Float, default: 40.0
"defaultProteinPercent"       // Float, default: 30.0
"defaultFatPercent"           // Float, default: 30.0

// Step categories (thresholds)
"stepsNotMuch"                // Int, default: 5000
"stepsLight"                  // Int, default: 7500
"stepsModerate"               // Int, default: 10000
"stepsHeavy"                  // Int, default: 12500

// Workout categories (minutes thresholds)
"workoutNotMuch"              // Int, default: 75
"workoutLight"                // Int, default: 150
"workoutModerate"             // Int, default: 225
"workoutHeavy"                // Int, default: 300

// Legal content
"termsContentHtml"            // String, default: ""
"privacyContentHtml"          // String, default: ""
"dataProcessingContentHtml"   // String, default: ""
"consentVersion"              // String, default: "1.0.0"
```

#### 4.3 Server Actions

**File:** `src/app/actions/settings.ts` (modify)

- Expand `systemSettingsSchema` to include ALL new keys
- Group validation by category
- Keep the existing upsert pattern
- Add `getSystemSetting(key: string)` helper for individual key lookups
- Add `getSystemSettingsDefaults()` returning all defaults for seeding

```typescript
// Add helper for individual setting with typed default
export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await prisma.systemSettings.findUnique({ where: { key } })
  return setting ? (setting.value as T) : defaultValue
}
```

#### 4.4 UI Components

**File:** `src/features/settings/SystemSettingsForm.tsx` (major expansion)

Organize into tabbed sections using existing `Tabs` component:

1. **Coach Management** tab
   - maxClientsPerCoach, minClientsPerCoach

2. **Feature Flags** tab
   - healthkitEnabled, iosIntegrationEnabled, showPersonalizedPlan

3. **Nutrition Defaults** tab
   - defaultProteinPercent, defaultCarbsPercent, defaultFatPercent
   - minDailyCalories, maxDailyCalories
   - minProteinPerLb, maxProteinPerLb

4. **Activity Thresholds** tab
   - Steps categories (stepsNotMuch, stepsLight, stepsModerate, stepsHeavy)
   - Workout categories (workoutNotMuch, workoutLight, workoutModerate, workoutHeavy)

5. **Check-in & Engagement** tab
   - defaultCheckInFrequencyDays, notificationTimeUtc
   - recentActivityDays, lowEngagementEntries
   - noActivityDays, criticalNoActivityDays
   - shortTermWindowDays, longTermWindowDays

6. **Adherence Scoring** tab
   - adherenceGreenMinimum, adherenceAmberMinimum
   - attentionMissedCheckinsPolicy
   - Body fat categories

7. **Legal Content** tab (if not already covered by C7)
   - termsContentHtml, privacyContentHtml, dataProcessingContentHtml
   - consentVersion

Each tab is a Card with its own save button. All use the existing `updateSystemSettings()` pattern.

#### 4.5 Seed Script

**File:** `prisma/seed-settings.ts` (new)

Script to seed all default system settings values. Run with `npx tsx prisma/seed-settings.ts`.

---

### C5: Email Template Admin Editor with DB Storage

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** DB-stored templates with admin CRUD UI, token substitution preview, enable/disable per template, system vs custom flag.

#### 5.1 Database Schema Changes

**File:** `prisma/schema.prisma`

```prisma
model EmailTemplate {
  id              Int      @id @default(autoincrement())
  key             String   @unique        // e.g. "welcome_client"
  name            String                  // Human-readable name
  description     String?                 // What this template is for
  subjectTemplate String                  // Subject with {{tokens}}
  bodyTemplate    String   @db.Text       // HTML body with {{tokens}}
  textTemplate    String   @db.Text       // Plain text version
  availableTokens String[]               // List of valid tokens for this template
  enabled         Boolean  @default(true)
  isSystem        Boolean  @default(true) // System templates can't be deleted

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("email_templates")
  @@index([key])
  @@index([enabled])
}
```

#### 5.2 Migration Script

**File:** `prisma/seed-email-templates.ts`

Migrate all 14 existing hardcoded templates from `src/lib/email-templates.ts` into the database:

```typescript
// For each template in DEFAULT_TEMPLATES:
// Create EmailTemplate record with:
//   key: template key
//   name: Human-readable name derived from key
//   subjectTemplate, bodyTemplate, textTemplate from DEFAULT_TEMPLATES
//   availableTokens: Determine which tokens each template uses
//   enabled: true
//   isSystem: true
```

#### 5.3 Server Actions

**File:** `src/app/actions/email-templates.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit-log"

const updateTemplateSchema = z.object({
  id: z.number().int().positive(),
  subjectTemplate: z.string().min(1),
  bodyTemplate: z.string().min(1),
  textTemplate: z.string().min(1),
  enabled: z.boolean().optional(),
})

const createTemplateSchema = z.object({
  key: z.string().min(1).regex(/^[a-z_]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  subjectTemplate: z.string().min(1),
  bodyTemplate: z.string().min(1),
  textTemplate: z.string().min(1),
  availableTokens: z.array(z.string()),
})

export async function getEmailTemplates()
  // requireAdmin()
  // Return all templates ordered by name

export async function getEmailTemplateByKey(key: string)
  // Return template by key, or null

export async function updateEmailTemplate(input)
  // requireAdmin()
  // Validate input
  // Update template
  // Log audit event: UPDATE_EMAIL_TEMPLATE
  // Cannot change key or isSystem flag

export async function createEmailTemplate(input)
  // requireAdmin()
  // isSystem = false for admin-created templates
  // Log audit event: CREATE_EMAIL_TEMPLATE

export async function deleteEmailTemplate(id: number)
  // requireAdmin()
  // Cannot delete system templates (isSystem = true)
  // Log audit event: DELETE_EMAIL_TEMPLATE

export async function previewEmailTemplate(templateId: number)
  // requireAdmin()
  // Render template with mock data
  // Return { subject, html, text }
```

#### 5.4 Update Email Rendering

**File:** `src/lib/email-templates.ts` (modify)

Update `renderEmailTemplate()` to check DB first, fall back to hardcoded:

```typescript
export async function renderEmailTemplate(
  key: EmailTemplateKey,
  variables: EmailVariables
): Promise<RenderedEmail | null> {
  // 1. Try to find template in DB
  const dbTemplate = await prisma.emailTemplate.findUnique({
    where: { key },
  })

  if (dbTemplate && dbTemplate.enabled) {
    return {
      subject: substituteTokens(dbTemplate.subjectTemplate, variables, false),
      html: substituteTokens(dbTemplate.bodyTemplate, variables, true),
      text: substituteTokens(dbTemplate.textTemplate, variables, false),
    }
  }

  // 2. Fall back to hardcoded template
  const template = DEFAULT_TEMPLATES[key]
  if (!template) return null
  // ... existing logic
}
```

Note: This function becomes async. Update all callers in `src/lib/email.ts`.

#### 5.5 UI Pages

**File:** `src/app/admin/email-templates/page.tsx`
- List all email templates in a table
- Columns: Name, Key, Enabled (toggle), System (badge), Last Updated, Actions
- Actions: Edit, Preview, Delete (only non-system)

**File:** `src/app/admin/email-templates/[id]/page.tsx`
- Edit template form
- Uses existing `EmailEditor` component for bodyTemplate
- Subject field (plain text input with token insertion buttons)
- Plain text field (textarea)
- Available tokens displayed as clickable badges
- Live preview panel on the right side
- Toggle enabled/disabled
- Save button

**File:** `src/features/email-templates/EmailTemplateList.tsx`
- Table component for template list
- Enable/disable toggle per template
- Links to edit pages

**File:** `src/features/email-templates/EmailTemplateEditor.tsx`
- Full editor with:
  - Subject input
  - Body editor (TipTap via `EmailEditor`)
  - Plain text textarea
  - Token insertion buttons
  - Live preview (rendered with mock variables)
  - Save/cancel buttons

---

### C8: Cohort Types Enum + Custom Types

**Priority:** CRITICAL
**Source:** CoachFit
**Description:** 4 enum types (TIMED/ONGOING/CHALLENGE/CUSTOM) + admin-created CustomCohortType with label/description. Membership duration for ongoing cohorts.

#### 8.1 Database Schema Changes

**File:** `prisma/schema.prisma`

```prisma
enum CohortType {
  TIMED
  ONGOING
  CHALLENGE
  CUSTOM
}

model CustomCohortType {
  id          Int      @id @default(autoincrement())
  label       String   @unique
  description String?
  createdBy   Int

  creator User     @relation(fields: [createdBy], references: [id], onDelete: Restrict)
  cohorts Cohort[]

  createdAt DateTime @default(now())

  @@map("custom_cohort_types")
  @@index([createdBy])
  @@index([createdAt])
}
```

Add to `Cohort` model:
```prisma
type                   CohortType?
customCohortTypeId     Int?
customCohortType       CustomCohortType? @relation(fields: [customCohortTypeId], references: [id], onDelete: Restrict)
membershipDurationMonths Int?   // For ONGOING type cohorts
```

Add to `User` model:
```prisma
customCohortTypes CustomCohortType[]
```

#### 8.2 Server Actions

**File:** `src/app/actions/cohort-types.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit-log"

const createCustomTypeSchema = z.object({
  label: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
})

export async function getCustomCohortTypes()
  // Return all custom types ordered by label

export async function createCustomCohortType(input)
  // requireAdmin()
  // Create custom type with creator = current user
  // Log audit event: CREATE_CUSTOM_COHORT_TYPE

export async function deleteCustomCohortType(id: number)
  // requireAdmin()
  // Check no cohorts are using this type (onDelete: Restrict will throw)
  // Delete type
  // Log audit event: DELETE_CUSTOM_COHORT_TYPE
```

**File:** `src/app/actions/cohorts.ts` (modify)

Update `createCohortSchema` and `updateCohortSchema`:
```typescript
// Add to schemas:
type: z.nativeEnum(CohortType).optional(),
customCohortTypeId: z.number().int().positive().optional().nullable(),
membershipDurationMonths: z.number().int().positive().optional().nullable(),
```

Update `createCohort()` and `updateCohort()` to persist these fields.

#### 8.3 UI Components

**File:** `src/features/cohorts/CohortForm.tsx` (modify)
- Add "Cohort Type" select dropdown (TIMED, ONGOING, CHALLENGE, CUSTOM)
- When CUSTOM selected, show sub-select for custom types
- When ONGOING selected, show membershipDurationMonths input
- When TIMED selected, endDate remains required

**File:** `src/features/cohorts/CohortList.tsx` (modify)
- Display cohort type as a badge next to cohort name

**File:** `src/app/admin/settings/page.tsx` or new page `src/app/admin/cohort-types/page.tsx`
- CRUD for custom cohort types
- Table: Label, Description, Used By (count), Actions
- Add/edit/delete custom types
- Cannot delete if in use

---

## Phase 4: Medium Gaps (M1-M8)

### M1: Workout CRUD (Standalone)

**Priority:** MEDIUM
**Source:** PTP
**Description:** Standalone Workout model (separate from HealthKit workouts): NOT_STARTED/IN_PROGRESS/COMPLETED status, assigned to individual users, video URL, repeating patterns.

#### 1.1 Database Schema Changes

The `Workout` model already exists but needs enhancement:

```prisma
model Workout {
  id          Int           @id @default(autoincrement())
  userId      Int
  coachId     Int?          // ADD: which coach assigned it
  title       String
  description String?
  status      WorkoutStatus @default(NOT_STARTED)
  videoUrl    String?       // ADD: instruction/recording URL
  scheduledAt DateTime?     // ADD: when the workout is scheduled
  completedAt DateTime?     // ADD: when it was completed
  duration    Int?          // ADD: duration in minutes

  user  User  @relation("WorkoutUser", fields: [userId], references: [id], onDelete: Cascade)
  coach User? @relation("WorkoutCoach", fields: [coachId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("workouts")
  @@index([userId])
  @@index([coachId])
  @@index([status])
  @@index([scheduledAt])
}
```

Update User model relations:
```prisma
// Replace:
workouts Workout[]
// With:
workoutsAssigned  Workout[] @relation("WorkoutUser")
workoutsCreated   Workout[] @relation("WorkoutCoach")
```

#### 1.2 Server Actions

**File:** `src/app/actions/workouts.ts`

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireCoach } from "@/lib/auth"
import { auth } from "@/auth"

const createWorkoutSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  videoUrl: z.string().url().optional().nullable(),
  scheduledAt: z.string().optional(), // ISO date string
  duration: z.number().int().positive().optional(),
})

const updateWorkoutSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  videoUrl: z.string().url().optional().nullable(),
  status: z.nativeEnum(WorkoutStatus).optional(),
  scheduledAt: z.string().optional(),
  duration: z.number().int().positive().optional(),
})

export async function getWorkouts(params?: { userId?: number; status?: WorkoutStatus })
  // Coaches: can see all workouts they created or for their clients
  // Clients: can only see their own

export async function getWorkoutById(id: number)
  // Permission check: owner or assigned coach

export async function createWorkout(input)
  // requireCoach()
  // Set coachId to current user
  // Create workout assigned to userId

export async function updateWorkout(input)
  // Either coach (coachId) or client (userId) can update
  // Clients can only update status (mark complete)
  // If status changed to COMPLETED, set completedAt

export async function deleteWorkout(id: number)
  // requireCoach() - only coach can delete
```

#### 1.3 UI Components

**File:** `src/app/workouts/page.tsx` (coach view)
- List of all workouts created by this coach
- Filters: by client, by status
- Create workout button

**File:** `src/app/client/workouts/page.tsx` (client view)
- List of workouts assigned to this client
- Status toggle (NOT_STARTED -> IN_PROGRESS -> COMPLETED)
- Video URL link

**File:** `src/features/workouts/WorkoutForm.tsx`
- Create/edit workout form
- Client selector (dropdown of coach's clients)
- Title, description, video URL, scheduled date, duration
- Used in dialog

**File:** `src/features/workouts/WorkoutList.tsx`
- Table/card list of workouts
- Status badges with color coding
- Action buttons

**File:** `src/features/workouts/WorkoutCard.tsx`
- Individual workout card
- Status, video link, scheduled date

---

### M2: Billing Email

**Priority:** MEDIUM
**Source:** PTP
**Description:** Separate `billingEmail` field on User model. Invoices sent to billing email, not login email.

#### 2.1 Database Schema Changes

Add to `User` model:
```prisma
billingEmail String?  // Separate email for invoice delivery
```

#### 2.2 Server Actions

**File:** `src/app/actions/settings.ts` (modify)

Add `billingEmail` to `updateUserProfileSchema`:
```typescript
billingEmail: z.string().email().optional().nullable(),
```

**File:** `src/app/actions/invoices.ts` (modify)

Update email sending logic to use `billingEmail` when available:
```typescript
const emailTo = user.billingEmail || user.email
```

#### 2.3 UI Components

**File:** `src/features/settings/UserSettingsForm.tsx` (modify)
- Add "Billing Email" field
- Helper text: "Invoices will be sent to this address instead of your login email"
- Optional field, uses login email if blank

---

### M3: Body Fat Percentage

**Priority:** MEDIUM
**Source:** CoachFit
**Description:** `bodyFatPercentage` field on Entry model.

#### 3.1 Database Schema Changes

Add to `Entry` model:
```prisma
bodyFatPercentage Float?  // Body fat percentage
```

#### 3.2 Server Actions

**File:** `src/app/actions/entries.ts` (modify)

Add to `upsertEntrySchema`:
```typescript
bodyFatPercentage: z.number().min(1).max(60).optional().nullable(),
```

Add to the data preparation logic in `upsertEntry()`:
```typescript
if (validated.bodyFatPercentage !== undefined) {
  data.bodyFatPercentage = validated.bodyFatPercentage
  if (validated.bodyFatPercentage !== null) dataSources.bodyFatPercentage = "manual"
}
```

#### 3.3 UI Components

**File:** `src/features/entries/CheckInForm.tsx` (modify)
- Add "Body Fat %" input field in the health metrics section
- Number input with min=1, max=60, step=0.1

**File:** `src/features/entries/CheckInHistory.tsx` (modify)
- Display body fat percentage in history if available
- Use body fat category thresholds from SystemSettings for color coding

---

### M4: Fitness Wrapped / Year-in-Review

**Priority:** MEDIUM
**Source:** CoachFit
**Description:** Year-in-review: aggregate totals (calories, steps, workout mins, sleep), weight change, longest streak, top metrics, fun conversions.

#### 4.1 Database Schema Changes

None required. All data already exists in Entry, HealthKitWorkout, SleepRecord tables.

#### 4.2 Server Actions

**File:** `src/app/actions/fitness-wrapped.ts`

```typescript
"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { startOfYear, endOfYear } from "date-fns"

export interface FitnessWrappedData {
  year: number
  // Totals
  totalEntries: number
  totalSteps: number
  totalCalories: number
  totalWorkoutMinutes: number
  totalSleepHours: number
  // Weight journey
  startWeight: number | null
  endWeight: number | null
  weightChange: number | null
  // Streaks
  longestStreak: number
  // Averages
  avgDailySteps: number
  avgDailyCalories: number
  avgSleepHours: number
  // Fun conversions
  funConversions: {
    pizzaSlices: number       // totalCalories / 285
    moviesWatched: number     // totalSleepHours / 2
    marathons: number         // totalSteps * 0.0008 / 42.195 (km)
    flightsClimbed: number    // totalSteps / 2000 (approx)
    booksRead: number         // totalWorkoutMinutes / 300
  }
  // Top metrics
  bestStepsDay: { date: string; value: number } | null
  bestCaloriesDay: { date: string; value: number } | null
  mostActiveMonth: string | null
}

export async function getFitnessWrapped(year?: number): Promise<FitnessWrappedData>
  // requireAuth()
  // Default year = current year - 1
  // Query entries for the year
  // Query HealthKitWorkouts for the year
  // Query SleepRecords for the year
  // Calculate all aggregate metrics
  // Calculate fun conversions
  // Return FitnessWrappedData
```

#### 4.3 UI Components

**File:** `src/app/client/wrapped/page.tsx`
- Year selector (dropdown)
- Calls `getFitnessWrapped(year)`
- Renders `FitnessWrappedCarousel`

**File:** `src/features/wrapped/FitnessWrappedCarousel.tsx`
- Multi-slide carousel/card UI
- Slide 1: "Your Year in Numbers" (total entries, steps, calories)
- Slide 2: "Weight Journey" (start -> end weight, change)
- Slide 3: "Longest Streak" with streak count
- Slide 4: "Fun Facts" (pizza slices, marathons, etc.)
- Slide 5: "Best Days" (best steps day, best calories day)
- Animated transitions between slides
- Share button (screenshot or copy stats)

**File:** `src/features/wrapped/WrappedStatCard.tsx`
- Individual stat card with large number, label, and icon
- Supports animation (count-up effect)

---

### M5: Role Switcher

**Priority:** MEDIUM
**Source:** CoachFit
**Description:** RoleSwitcher component + RoleContext. Users with multiple roles can switch active view. Navigation adjusts per role.

#### 5.1 Analysis

Centurion already has a `ViewModeSwitcher` component that lets ADMINs switch between admin and coach views. However, CoachFit supports users having MULTIPLE roles (e.g., a user who is both COACH and CLIENT).

Centurion uses a single `role` enum field, not an array. To fully support role switching, we would need to change to an array of roles. However, this is a significant schema change.

**Recommended approach:** Extend the existing ViewModeSwitcher to support ADMIN -> admin/coach/client views, and let COACHes switch to client view if they are also a member of a cohort.

#### 5.2 Database Schema Changes

No schema changes needed. Use existing `role` field plus membership data:
- If role is ADMIN: can view as admin, coach, or client
- If role is COACH and has CohortMembership: can view as coach or client
- If role is CLIENT: no switching (single view)

#### 5.3 Modifications

**File:** `src/contexts/ViewModeContext.tsx` (modify)

```typescript
type ViewMode = "admin" | "coach" | "client"

// Update canSwitch logic:
// ADMIN can switch between all 3
// COACH with cohort membership can switch to client
// CLIENT cannot switch

// Update effectiveNavRole to map:
// "admin" -> ADMIN, "coach" -> COACH, "client" -> CLIENT
```

**File:** `src/components/layouts/ViewModeSwitcher.tsx` (modify)
- Add CLIENT option for ADMINs
- Add CLIENT option for COACHes who have cohort memberships
- Update icons and labels

**File:** `src/components/layouts/Sidebar.tsx` (modify)
- Use `effectiveNavRole` to determine which navigation items to show
- When in "client" mode, show client navigation regardless of actual role

---

### M6: Apple OAuth

**Priority:** MEDIUM
**Source:** CoachFit
**Description:** Apple sign-in provider alongside Google. Important for iOS users.

#### 6.1 Configuration

**File:** `src/auth.ts` (modify)

```typescript
import Apple from "next-auth/providers/apple"

// Add to providers array:
Apple({
  clientId: process.env.APPLE_CLIENT_ID!,
  clientSecret: process.env.APPLE_CLIENT_SECRET!,
}),
```

**Environment variables needed:**
- `APPLE_CLIENT_ID`
- `APPLE_CLIENT_SECRET`

#### 6.2 UI Changes

**File:** `src/app/login/page.tsx` (modify)
- Add "Continue with Apple" button above or below Google button
- Apple SVG icon
- Calls `signInWithApple()` action

**File:** `src/app/register/page.tsx` (modify)
- Add same Apple sign-in button

**File:** `src/app/actions/auth.ts` (modify)
- Add `signInWithApple()` server action:
```typescript
export async function signInWithApple() {
  await signIn("apple", { redirectTo: "/dashboard" })
}
```

#### 6.3 Apple Developer Setup Notes

Document in README:
1. Create App ID in Apple Developer Console with "Sign in with Apple" capability
2. Create Service ID (this is the clientId)
3. Generate client secret (JWT signed with private key)
4. Add redirect URLs: `https://yourdomain.com/api/auth/callback/apple`

---

### M7: Entry Height + BMI Calculation

**Priority:** MEDIUM
**Source:** CoachFit
**Description:** `heightInches` on Entry, BMI calculation from weight/height.

#### 7.1 Database Schema Changes

Add to `Entry` model:
```prisma
heightInches Float?  // Height in inches at time of entry
```

#### 7.2 Utility Functions

**File:** `src/lib/unit-conversions.ts` (extend from C3/M8)

```typescript
// BMI calculation
export function calculateBMI(weightLbs: number, heightInches: number): number {
  // BMI = (weight in lbs / (height in inches)^2) * 703
  return (weightLbs / (heightInches * heightInches)) * 703
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

// Convert stored weight (which may be in different units) to lbs for BMI calc
export function normalizeWeightToLbs(weight: number, unit: "lbs" | "kg"): number {
  return unit === "kg" ? kgToLbs(weight) : weight
}

export function normalizeHeightToInches(height: number, unit: "inches" | "cm"): number {
  return unit === "cm" ? cmToInches(height) : height
}
```

#### 7.3 Server Actions

**File:** `src/app/actions/entries.ts` (modify)

Add to `upsertEntrySchema`:
```typescript
heightInches: z.number().positive().optional().nullable(),
```

Add to data preparation in `upsertEntry()`:
```typescript
if (validated.heightInches !== undefined) {
  data.heightInches = validated.heightInches
}
```

#### 7.4 UI Components

**File:** `src/features/entries/CheckInForm.tsx` (modify)
- Add height input field (converts based on user preferences)
- Show calculated BMI when both weight and height are present

**File:** `src/features/entries/BMIDisplay.tsx` (new)
- Shows BMI value with category badge and color
- Takes weight and height as props
- Respects user's unit preferences for display

---

### M8: Unit Conversions

**Priority:** MEDIUM
**Source:** CoachFit
**Description:** Utility module for lbs<->kg, inches<->cm conversions.

Covered by C3 implementation. The `src/lib/unit-conversions.ts` file created in C3 covers all conversion needs. See C3 section 3.3 for full specification.

---

## Phase 5: Polish (L1-L6)

### L1: Appointment Video URL

**Priority:** LOW
**Source:** PTP
**Description:** `videoUrl` field on Appointment model for session recordings/instructions.

#### 1.1 Database Schema Changes

Add to `Appointment` model:
```prisma
videoUrl String?  // URL for session recording or instruction video
```

#### 1.2 Server Actions

**File:** `src/app/actions/appointments.ts` (modify)

Add to `createAppointmentSchema` and `updateAppointmentSchema`:
```typescript
videoUrl: z.string().url().optional().nullable(),
```

Add to create/update data objects.

#### 1.3 UI Components

**File:** `src/features/appointments/AppointmentForm.tsx` (modify)
- Add "Video URL" input field (optional)

**File:** `src/features/appointments/AppointmentDetail.tsx` (modify)
- Display video URL as clickable link if present
- Consider embed for known video providers (YouTube, Loom)

**File:** `src/features/appointments/AppointmentCard.tsx` (modify)
- Show video icon if videoUrl is set

---

### L2: Dynamic Forms (Contentful) - SKIPPED

**Priority:** LOW
**Source:** PTP
**Recommendation:** Skip. Centurion already has SurveyJS for dynamic questionnaires, which is more powerful than Contentful forms. The SurveyJS integration already supports custom questions per cohort via `CohortCheckInConfig.prompts` and `QuestionnaireBundle.questions`. No implementation needed.

---

### L3: Sentry Error Monitoring

**Priority:** LOW
**Source:** PTP

#### 3.1 Installation

```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Install `@sentry/nextjs`
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.ts` to wrap with Sentry
- Create `src/app/global-error.tsx`

#### 3.2 Configuration

**File:** `sentry.client.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

**Environment variables:**
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN` (for source maps)
- `SENTRY_ORG`
- `SENTRY_PROJECT`

#### 3.3 Error Boundary Integration

**File:** `src/components/ui/ErrorBoundary.tsx` (modify)
- Add Sentry.captureException() in the error handler
- The existing error boundary already exists, just add Sentry integration

---

### L4: Vercel Analytics + Speed Insights

**Priority:** LOW
**Source:** PTP

#### 4.1 Installation

```bash
npm install @vercel/analytics @vercel/speed-insights
```

#### 4.2 Integration

**File:** `src/app/layout.tsx` (modify)

```typescript
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Add inside the <body> tag:
<Analytics />
<SpeedInsights />
```

No additional configuration needed. Analytics and Speed Insights are automatically enabled when deployed to Vercel.

---

### L5: Health Check Endpoint

**Priority:** LOW
**Source:** PTP

#### 5.1 API Route

**File:** `src/app/api/health/route.ts`

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime(),
      database: "connected",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    )
  }
}
```

No authentication required (public endpoint for monitoring).

---

### L6: Fetch Retry with Exponential Backoff

**Priority:** LOW
**Source:** CoachFit

#### 6.1 Utility

**File:** `src/lib/fetch-with-retry.ts`

```typescript
interface FetchWithRetryOptions {
  retries?: number          // Default: 3
  initialDelay?: number     // Default: 1000ms
  maxDelay?: number         // Default: 10000ms
  backoffMultiplier?: number // Default: 2
  timeout?: number          // Default: 30000ms
  retryOnStatus?: number[]  // Default: [408, 429, 500, 502, 503, 504]
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit & FetchWithRetryOptions
): Promise<Response> {
  const {
    retries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    timeout = 30000,
    retryOnStatus = [408, 429, 500, 502, 503, 504],
    ...fetchOptions
  } = options || {}

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok || !retryOnStatus.includes(response.status)) {
        return response
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    if (attempt < retries) {
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      )
      // Add jitter: +/- 10%
      const jitter = delay * (0.9 + Math.random() * 0.2)
      await new Promise(resolve => setTimeout(resolve, jitter))
    }
  }

  throw lastError || new Error("Fetch failed after retries")
}
```

This can be used as a drop-in replacement for `fetch()` in any server action or API route where retry behavior is needed (e.g., calls to external APIs like Stripe, Google Calendar, Resend).

---

## Migration Execution Order

All schema changes should be applied in a single Prisma migration. Here is the complete list of changes:

### Prisma Schema Additions (Single Migration)

```prisma
// ============================================
// PHASE 1: Legal & Auth
// ============================================

model UserConsent {
  id              Int       @id @default(autoincrement())
  userId          Int       @unique
  termsAccepted   DateTime
  privacyAccepted DateTime
  dataProcessing  DateTime
  marketing       DateTime?
  version         String
  ipAddress       String?
  userAgent       String?
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  @@map("user_consents")
  @@index([userId])
  @@index([createdAt])
}

// ============================================
// PHASE 2: User Personalization
// ============================================

model UserGoals {
  id                   Int      @id @default(autoincrement())
  userId               Int      @unique
  currentWeightKg      Float?
  targetWeightKg       Float?
  heightCm             Float?
  dailyCaloriesKcal    Int?
  proteinGrams         Float?
  carbGrams            Float?
  fatGrams             Float?
  waterIntakeMl        Int?
  dailyStepsTarget     Int?
  weeklyWorkoutMinutes Int?
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  @@map("user_goals")
  @@index([userId])
}

model UserPreference {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  weightUnit      String   @default("lbs")
  measurementUnit String   @default("inches")
  dateFormat      String   @default("MM/dd/yyyy")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@map("user_preferences")
  @@index([userId])
}

// ============================================
// PHASE 3: Admin Configuration
// ============================================

model EmailTemplate {
  id              Int      @id @default(autoincrement())
  key             String   @unique
  name            String
  description     String?
  subjectTemplate String
  bodyTemplate    String   @db.Text
  textTemplate    String   @db.Text
  availableTokens String[]
  enabled         Boolean  @default(true)
  isSystem        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@map("email_templates")
  @@index([key])
  @@index([enabled])
}

enum CohortType {
  TIMED
  ONGOING
  CHALLENGE
  CUSTOM
}

model CustomCohortType {
  id          Int      @id @default(autoincrement())
  label       String   @unique
  description String?
  createdBy   Int
  creator     User     @relation(fields: [createdBy], references: [id], onDelete: Restrict)
  cohorts     Cohort[]
  createdAt   DateTime @default(now())
  @@map("custom_cohort_types")
  @@index([createdBy])
  @@index([createdAt])
}

// ============================================
// FIELD ADDITIONS TO EXISTING MODELS
// ============================================

// User model additions:
//   billingEmail          String?
//   checkInFrequencyDays  Int?
//   consent               UserConsent?
//   goals                 UserGoals?
//   preferences           UserPreference?
//   customCohortTypes     CustomCohortType[]
//   workoutsAssigned      Workout[] @relation("WorkoutUser")    (rename from workouts)
//   workoutsCreated       Workout[] @relation("WorkoutCoach")

// Entry model additions:
//   bodyFatPercentage Float?
//   heightInches      Float?

// Appointment model additions:
//   videoUrl String?

// Cohort model additions:
//   type                     CohortType?
//   customCohortTypeId       Int?
//   customCohortType         CustomCohortType? @relation(...)
//   membershipDurationMonths Int?
//   checkInFrequencyDays     Int?

// Workout model additions:
//   coachId     Int?
//   videoUrl    String?
//   scheduledAt DateTime?
//   completedAt DateTime?
//   duration    Int?
//   (update relations to named: "WorkoutUser" and "WorkoutCoach")
```

### Migration Command

```bash
npx prisma migrate dev --name "add_all_feature_gaps"
```

### Post-Migration Seeds

Run in order:
1. `npx tsx prisma/seed-settings.ts` - Seed all SystemSettings defaults
2. `npx tsx prisma/seed-email-templates.ts` - Migrate hardcoded email templates to DB

---

## File Summary

### New Files to Create

| File Path | Description |
|-----------|-------------|
| `src/app/actions/password-reset.ts` | Password reset server actions |
| `src/app/actions/gdpr.ts` | Account deletion + data export |
| `src/app/actions/consent.ts` | Consent management actions |
| `src/app/actions/goals.ts` | User goals CRUD |
| `src/app/actions/preferences.ts` | User preferences CRUD |
| `src/app/actions/check-in-frequency.ts` | 3-level frequency resolution |
| `src/app/actions/email-templates.ts` | Email template CRUD |
| `src/app/actions/cohort-types.ts` | Custom cohort type CRUD |
| `src/app/actions/workouts.ts` | Workout CRUD |
| `src/app/actions/fitness-wrapped.ts` | Year-in-review aggregation |
| `src/app/forgot-password/page.tsx` | Forgot password form |
| `src/app/reset-password/page.tsx` | Reset password form |
| `src/app/legal/terms/page.tsx` | Terms of service page |
| `src/app/legal/privacy/page.tsx` | Privacy policy page |
| `src/app/legal/data-processing/page.tsx` | DPA page |
| `src/app/admin/email-templates/page.tsx` | Email template list |
| `src/app/admin/email-templates/[id]/page.tsx` | Email template editor |
| `src/app/workouts/page.tsx` | Coach workout list |
| `src/app/client/workouts/page.tsx` | Client workout list |
| `src/app/client/wrapped/page.tsx` | Fitness Wrapped page |
| `src/app/api/health/route.ts` | Health check endpoint |
| `src/lib/unit-conversions.ts` | Unit conversion utilities |
| `src/lib/fetch-with-retry.ts` | Fetch with retry utility |
| `src/hooks/usePreferences.ts` | Client-side preferences hook |
| `src/features/settings/DataExportButton.tsx` | GDPR data export |
| `src/features/settings/DeleteAccountDialog.tsx` | GDPR account deletion |
| `src/features/settings/UserPreferencesForm.tsx` | Preferences form |
| `src/features/consent/ConsentBanner.tsx` | Consent collection UI |
| `src/features/goals/UserGoalsForm.tsx` | Goals form |
| `src/features/goals/GoalProgressCard.tsx` | Goal progress display |
| `src/features/email-templates/EmailTemplateList.tsx` | Template list table |
| `src/features/email-templates/EmailTemplateEditor.tsx` | Template editor |
| `src/features/workouts/WorkoutForm.tsx` | Workout create/edit |
| `src/features/workouts/WorkoutList.tsx` | Workout list |
| `src/features/workouts/WorkoutCard.tsx` | Workout card |
| `src/features/wrapped/FitnessWrappedCarousel.tsx` | Wrapped carousel |
| `src/features/wrapped/WrappedStatCard.tsx` | Wrapped stat card |
| `src/features/entries/BMIDisplay.tsx` | BMI display component |
| `prisma/seed-settings.ts` | System settings seeder |
| `prisma/seed-email-templates.ts` | Email template seeder |

### Existing Files to Modify

| File Path | Changes |
|-----------|---------|
| `prisma/schema.prisma` | All schema additions (see Migration section) |
| `src/auth.ts` | Add Apple OAuth provider |
| `src/lib/email-templates.ts` | Add resetUrl token, make renderEmailTemplate async, DB lookup |
| `src/lib/email.ts` | Update for async renderEmailTemplate |
| `src/app/login/page.tsx` | Add forgot password link, Apple sign-in button |
| `src/app/register/page.tsx` | Add Apple sign-in button |
| `src/app/actions/auth.ts` | Add signInWithApple() |
| `src/app/actions/settings.ts` | Expand schema, add getSystemSetting helper |
| `src/app/actions/entries.ts` | Add bodyFatPercentage, heightInches fields |
| `src/app/actions/cohorts.ts` | Add type, customCohortTypeId, membershipDurationMonths |
| `src/app/actions/appointments.ts` | Add videoUrl field |
| `src/app/actions/invoices.ts` | Use billingEmail when available |
| `src/app/admin/settings/page.tsx` | Add legal content editors, expanded settings |
| `src/app/client/settings/page.tsx` | Add goals, preferences, data export, delete account |
| `src/app/client/dashboard/page.tsx` | Add goal progress cards |
| `src/app/layout.tsx` | Add Vercel Analytics, Speed Insights, ConsentBanner |
| `src/contexts/ViewModeContext.tsx` | Add "client" view mode option |
| `src/components/layouts/ViewModeSwitcher.tsx` | Add client mode option |
| `src/components/layouts/Sidebar.tsx` | Respect effectiveNavRole for client mode |
| `src/components/ui/ErrorBoundary.tsx` | Add Sentry integration |
| `src/features/settings/SystemSettingsForm.tsx` | Major expansion with tabs |
| `src/features/cohorts/CohortForm.tsx` | Add type, custom type, membership duration |
| `src/features/cohorts/CohortList.tsx` | Display cohort type badge |
| `src/features/cohorts/CohortDetail.tsx` | Add check-in frequency override |
| `src/features/entries/CheckInForm.tsx` | Add body fat, height, BMI display |
| `src/features/entries/CheckInHistory.tsx` | Display body fat, format with preferences |
| `src/features/appointments/AppointmentForm.tsx` | Add videoUrl field |
| `src/features/appointments/AppointmentDetail.tsx` | Display videoUrl |
| `src/features/appointments/AppointmentCard.tsx` | Show video icon |
| `src/features/settings/UserSettingsForm.tsx` | Add billingEmail field |
| `src/features/users/UserDetail.tsx` | Add check-in frequency override |

### New npm Dependencies

| Package | Purpose |
|---------|---------|
| `@sentry/nextjs` | Error monitoring (L3) |
| `@vercel/analytics` | Usage analytics (L4) |
| `@vercel/speed-insights` | Performance monitoring (L4) |

### Environment Variables to Add

| Variable | Required | Purpose |
|----------|----------|---------|
| `APPLE_CLIENT_ID` | Optional | Apple OAuth (M6) |
| `APPLE_CLIENT_SECRET` | Optional | Apple OAuth (M6) |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry error tracking (L3) |
| `SENTRY_AUTH_TOKEN` | Optional | Sentry source maps (L3) |
| `SENTRY_ORG` | Optional | Sentry organization (L3) |
| `SENTRY_PROJECT` | Optional | Sentry project (L3) |

---

## Estimated Implementation Timeline

| Phase | Gaps | Estimated Effort | Cumulative |
|-------|------|-----------------|------------|
| Phase 1: Legal & Auth | C1, C6, C7 | 6-8 hours | 6-8 hours |
| Phase 2: User Personalization | C2, C3, C9 | 5-7 hours | 11-15 hours |
| Phase 3: Admin Configuration | C4, C5, C8 | 8-10 hours | 19-25 hours |
| Phase 4: Medium Gaps | M1-M8 | 10-14 hours | 29-39 hours |
| Phase 5: Polish | L1-L6 | 3-5 hours | 32-44 hours |

**Total estimated: 32-44 hours of implementation work**

---

## Implementation Notes for Agents

1. **All server actions follow the same pattern:** `"use server"` directive, Zod validation, auth guard, Prisma query, audit logging for sensitive operations.

2. **All UI components use existing shadcn/ui primitives:** Card, Button, Input, Label, Select, Dialog, AlertDialog, Table, Tabs, Badge, Skeleton.

3. **Date formatting:** Use `date-fns` `format()` function. The user's preferred format string can be passed directly to `format()`.

4. **The Prisma migration should be ONE migration** containing all new models and field additions. Run `npx prisma migrate dev --name "feature_parity_gaps"`.

5. **Email template migration to DB is additive.** The hardcoded templates remain as fallbacks. The `renderEmailTemplate` function tries DB first, falls back to code.

6. **Test each phase independently.** Each phase can be deployed separately without breaking existing functionality.

7. **Respect existing code style:** No semicolons at end of `import` statements (project uses them), 2-space indentation, double quotes for strings in TSX, template literals for multi-line.
