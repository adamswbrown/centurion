# Agent Context Pack: Centurion Fitness Platform

**Purpose:** This document provides autonomous coding agents with everything needed to implement new features without re-inventing existing code or breaking established patterns. Read this BEFORE writing any code.

**Related PRDs:**
- [centurion-platform.md](centurion-platform.md) -- full platform PRD
- [session-cohort-architecture-rework.md](session-cohort-architecture-rework.md) -- session/membership rework spec

**IMPORTANT**
Start by evaluating the current codebase in its current form to ensure that previous agents that have worked on this codebase haven't left mis- or partially completed work.

---

## Table of Contents

1. [Code Conventions](#1-code-conventions)
2. [Existing File Inventory](#2-existing-file-inventory)
3. [Prisma Schema (Current)](#3-prisma-schema-current)
4. [Pattern Reference: Server Actions](#4-pattern-reference-server-actions)
5. [Pattern Reference: React Query Hooks](#5-pattern-reference-react-query-hooks)
6. [Pattern Reference: Pages](#6-pattern-reference-pages)
7. [Pattern Reference: Feature Components](#7-pattern-reference-feature-components)
8. [Pattern Reference: Lib Utilities](#8-pattern-reference-lib-utilities)
9. [Pattern Reference: API Routes](#9-pattern-reference-api-routes)
10. [Navigation & Middleware](#10-navigation--middleware)
11. [Do-Not-Touch List](#11-do-not-touch-list)
12. [Import Aliases & Dependencies](#12-import-aliases--dependencies)
13. [Testing Patterns](#13-testing-patterns)
14. [Common Pitfalls](#14-common-pitfalls)

---

## 1. Code Conventions

### General

- **TypeScript strict mode** -- no `any` in new code (some legacy `any` exists in entries.ts)
- **Integer auto-increment IDs** -- not CUIDs, not UUIDs
- **`"use server"` directive** on every server action file
- **`"use client"` directive** on every component with hooks, state, or browser APIs
- **No try-catch in server actions** -- let errors propagate (Zod throws, Prisma throws, auth redirects)
- **No console.log in production code** -- use `console.warn`/`console.error` for warnings/errors only
- **No default exports** except for page components and API routes
- **Named exports** for all components, hooks, actions, and utilities
- **Date handling**: `date-fns` for all date operations. Never use raw `Date` string manipulation.

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Server action file | `src/app/actions/[domain].ts` | `sessions.ts` |
| Server action function | `create[Thing]`, `get[Thing]s`, `update[Thing]`, `delete[Thing]` | `createSession`, `getSessions` |
| Hook file | `src/hooks/use[Domain].ts` | `useSessions.ts` |
| Hook export | `use[Domain]`, `useCreate[Thing]`, `useUpdate[Thing]`, `useDelete[Thing]` | `useSessions`, `useCreateSession` |
| Feature component file | `src/features/[domain]/[Component].tsx` | `SessionList.tsx` |
| Feature component | `[Domain][Purpose]` | `SessionList`, `SessionDetail`, `SessionForm` |
| Page file | `src/app/[route]/page.tsx` | `src/app/sessions/page.tsx` |
| Page component | `[Route]Page` | `SessionsPage` (default export) |
| Query key | `["domain"]` or `["domain", params]` | `["sessions"]`, `["session", id]` |
| Zod schema | `create[Thing]Schema`, `update[Thing]Schema` | `createSessionSchema` |
| Type export | `Create[Thing]Input`, `Update[Thing]Input` | `CreateSessionInput` |

### File Structure for a New Feature

```
src/
  app/
    actions/[domain].ts           -- Server actions with Zod validation
    [route]/page.tsx              -- Server Component page
    [route]/[id]/page.tsx         -- Detail page (if needed)
  hooks/use[Domain].ts            -- React Query hooks
  features/[domain]/
    [Domain]List.tsx              -- List component
    [Domain]Detail.tsx            -- Detail component
    [Domain]Form.tsx              -- Create/edit form
```

---

## 2. Existing File Inventory

### Server Actions (src/app/actions/) -- DO NOT DUPLICATE

| File | Exported Functions | Notes |
|------|-------------------|-------|
| `admin-users.ts` | `getUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, `bulkDeleteUsers`, `bulkUpdateRole` | Admin-only |
| `appointments.ts` | `createAppointment`, `getAppointments`, `getAppointmentById`, `updateAppointment`, `deleteAppointment`, `syncAppointmentToGoogleCalendar`, `batchSyncAppointments` | Conflict detection included |
| `auth.ts` | `loginWithCredentials`, `registerUser` | |
| `bootcamps.ts` | `createBootcamp`, `getBootcamps`, `getBootcampById`, `updateBootcamp`, `deleteBootcamp`, `addAttendee`, `removeAttendee` | **LEGACY -- will be removed** |
| `client-appointments.ts` | `getMyAppointments`, `getMyAppointmentById`, `cancelMyAppointment` | Client self-service |
| `client-bootcamps.ts` | `getAvailableBootcamps`, `joinBootcamp`, `leaveBootcamp` | **LEGACY -- will be removed** |
| `client-cohorts.ts` | `getMyCohorts`, `getMyCohortById` | Client self-service |
| `client-invoices.ts` | `getMyInvoices`, `getMyInvoiceById` | Client self-service |
| `coach-analytics.ts` | `calculateAttentionScore`, `getCoachInsights`, `getMemberCheckInData`, `getCoachCohortMembers`, `getCoachMembersOverview` | Attention score algorithm |
| `cohort-analytics.ts` | `getCohortComplianceStats`, `getCohortParticipation` | |
| `cohorts.ts` | `createCohort`, `getCohorts`, `getCohortById`, `updateCohort`, `deleteCohort`, `addMember`, `removeMember`, `updateMemberStatus`, `addCoach`, `removeCoach` | Full CRUD + member/coach mgmt |
| `credits.ts` | `allocateCredits`, `getCreditsHistory`, `getCreditsSummary` | |
| `entries.ts` | `getEntries`, `getEntryByDate`, `upsertEntry`, `getCheckInStats`, `deleteEntry` | Upsert pattern (1/user/day) |
| `invoices.ts` | `createInvoice`, `getInvoices`, `getInvoiceById`, `updateInvoiceStatus`, `generateInvoicesForMonth`, `createPaymentLinkForInvoice`, `getRevenueStats` | |
| `members.ts` | `getMembers`, `getMemberById` | Read-only member list |
| `questionnaires.ts` | `getQuestionnaireBundle`, `getQuestionnaireBundles`, `createQuestionnaireBundle`, `updateQuestionnaireBundle`, `getQuestionnaireResponse`, `upsertQuestionnaireResponse`, `getWeeklyResponses`, `getAllQuestionnaires` | SurveyJS JSON format |
| `reports.ts` | `getOverviewStats`, `getMemberEngagementData`, `getCohortAnalytics`, `getRevenueAnalytics`, `getComplianceData` | |
| `review-queue.ts` | `getReviewQueueData`, `saveCoachResponse`, `getWeeklyCoachResponse` | |
| `settings.ts` | `getSystemSettings`, `updateSystemSettings`, `getSystemSetting`, `getUserSettings`, `updateUserProfile` | Key-value JSON pattern |

### Hooks (src/hooks/) -- DO NOT DUPLICATE

| File | Exported Hooks |
|------|---------------|
| `useAppointments.ts` | `useAppointments`, `useCreateAppointment`, `useUpdateAppointment`, `useDeleteAppointment`, `useSyncAppointment` |
| `useBootcamps.ts` | `useBootcamps`, `useBootcamp`, `useCreateBootcamp`, `useUpdateBootcamp`, `useDeleteBootcamp`, `useAddAttendee`, `useRemoveAttendee` |
| `useClientAppointments.ts` | `useMyAppointments`, `useCancelMyAppointment` |
| `useClientBootcamps.ts` | `useAvailableBootcamps`, `useJoinBootcamp`, `useLeaveBootcamp` |
| `useClientCohorts.ts` | `useMyCohorts` |
| `useClientInvoices.ts` | `useMyInvoices` |
| `useCohorts.ts` | `useCohorts`, `useCohort`, `useCreateCohort`, `useUpdateCohort`, `useDeleteCohort` |
| `useEntries.ts` | `useEntries`, `useEntryByDate`, `useUpsertEntry`, `useDeleteEntry` |
| `useInvoices.ts` | `useInvoices`, `useInvoice`, `useCreateInvoice`, `useUpdateInvoiceStatus`, `useCreatePaymentLink`, `useRevenueStats` |
| `useMembers.ts` | `useMembers`, `useMember` |
| `useQuestionnaires.ts` | `useQuestionnaireBundle`, `useQuestionnaireBundles`, `useCreateQuestionnaireBundle`, `useUpdateQuestionnaireBundle`, `useQuestionnaireResponse`, `useUpsertQuestionnaireResponse`, `useWeeklyResponses`, `useAllQuestionnaires` |
| `useReports.ts` | `useOverviewStats`, `useMemberEngagement`, `useCohortAnalytics`, `useRevenueAnalytics`, `useComplianceData` |
| `useReviewQueue.ts` | `useReviewQueueData`, `useSaveCoachResponse`, `useWeeklyCoachResponse` |

### Lib Utilities (src/lib/) -- REUSE THESE

| File | Exports | When to Use |
|------|---------|-------------|
| `auth.ts` | `getSession`, `getCurrentUser`, `requireAuth`, `requireRole`, `requireAdmin`, `requireCoach` | Every server action and page |
| `prisma.ts` | `prisma` (singleton) | Every database operation |
| `stripe.ts` | `stripe`, `createPaymentLink`, `verifyWebhookSignature` | Payment operations |
| `email.ts` | `sendTransactionalEmail`, `sendSystemEmail` | All outbound emails |
| `email-templates.ts` | `EMAIL_TEMPLATE_KEYS`, `renderEmailTemplate`, type exports | Email content |
| `audit-log.ts` | `logAuditEvent` | Admin/sensitive operations |
| `calendar.ts` | `combineDateAndTime`, `extractTimeString`, `getRepeatingDates`, `getWeekday`, date filter helpers | Date/time operations |
| `google-calendar.ts` | `addEventToGoogleCalendar`, `addMultipleEventsToGoogleCalendar`, `updateGoogleCalendarEvent`, `deleteGoogleCalendarEvent` | Calendar sync |
| `surveyjs-config.ts` | SurveyJS theme config | Questionnaire rendering |
| `utils.ts` | `cn` (className merge) | All components |
| `healthkit/pairing.ts` | Pairing code generation | HealthKit endpoints |

### Feature Components (src/features/) -- Existing directories

```
appointments/     -- AppointmentDashboard, AppointmentForm, AppointmentList, AppointmentCalendar, AppointmentCard, AppointmentDetail, ClientAppointmentsCalendar
bootcamps/        -- BootcampForm, BootcampList, BootcampCalendar, BootcampDetail, BootcampRegistration  [LEGACY]
calendar/         -- Combined calendar views
cohorts/          -- CohortForm, CohortList, CohortDetail, CoachAssignment, MemberManagement
credits/          -- CreditAllocationForm, CreditBalanceWidget, CreditHistoryTable
entries/          -- CheckInForm, CheckInHistory
healthkit/        -- HealthKit dashboard components
invoices/         -- InvoiceList, GenerateInvoiceDialog, InvoiceDetail, RevenueChart
members/          -- Member management components
questionnaires/   -- QuestionnaireViewer, QuestionnaireResponseList
reports/          -- ReportsDashboard, OverviewCards, MemberEngagementChart, CohortAnalytics, RevenueAnalytics, ComplianceReport, ExportButton
review-queue/     -- ReviewQueueDashboard
settings/         -- SystemSettingsForm, UserSettingsForm
timer/            -- TimerShell, TimerEditor, TimerPresetImportExport, useIntervalTimer
users/            -- UserTable, UserSearchForm, DeleteUserButton, UserDetailPanel
```

### UI Components (src/components/ui/) -- shadcn/ui primitives

Available: `badge`, `button`, `card`, `dialog`, `input`, `label`, `select`, `skeleton`, `table`, `tabs`, `textarea`, `tooltip`, `alert-dialog`, `dropdown-menu`, `separator`, `switch`

Import like: `import { Button } from "@/components/ui/button"`

---

## 3. Prisma Schema (Current)

The full schema lives at `prisma/schema.prisma`. Here's a summary of every model and its key fields:

### Auth
- **User**: id, email, billingEmail?, password?, name?, image?, emailVerified, role (ADMIN/COACH/CLIENT), credits, creditsExpiry?, isTestUser, checkInFrequencyDays?
- **Account**: id, userId, type, provider, providerAccountId (OAuth)
- **Session**: id, sessionToken, userId, expires
- **VerificationToken**: identifier, token, expires
- **UserConsent**: id, userId (unique), termsAccepted, privacyAccepted, dataProcessing, marketing?, version, ipAddress?, userAgent?

### Personal Training
- **Appointment**: id, userId, coachId, startTime, endTime, fee (Decimal), status (ATTENDED/NOT_ATTENDED), notes?, videoUrl?, googleEventId?, invoiceId?, title?
- **Bootcamp**: id, name, startTime, endTime, location?, capacity?, description? **[LEGACY -- to be removed]**
- **BootcampAttendee**: id, bootcampId, userId (unique pair) **[LEGACY]**
- **Workout**: id, userId, coachId?, title, description?, videoUrl?, status (NOT_STARTED/IN_PROGRESS/COMPLETED), scheduledAt?, completedAt?, duration?
- **Invoice**: id, userId, month (Date), totalAmount (Decimal), emailSent, emailSentAt?, paymentStatus (UNPAID/PAID/OVERDUE/CANCELLED), stripePaymentUrl?, paidAt?

### Health Coaching
- **Cohort**: id, name, description?, startDate, endDate?, status (ACTIVE/COMPLETED/ARCHIVED), checkInFrequencyDays?, type (TIMED/ONGOING/CHALLENGE/CUSTOM)?, customCohortTypeId?, membershipDurationMonths?
- **CohortMembership**: id, cohortId, userId (unique pair), status (ACTIVE/PAUSED/INACTIVE), joinedAt, leftAt?
- **CoachCohortMembership**: id, cohortId, coachId (unique pair)
- **Entry**: id, userId, date (unique [userId,date]), weight?, bodyFatPercentage?, heightInches?, steps?, calories?, sleepQuality? (1-10), perceivedStress? (1-10), notes?, customResponses (Json)?, dataSources (Json)?
- **QuestionnaireBundle**: id, cohortId, weekNumber (unique [cohortId,weekNumber]), questions (Json), isActive
- **WeeklyQuestionnaireResponse**: id, userId, bundleId (unique [userId,bundleId]), weekNumber, responses (Json), status (IN_PROGRESS/COMPLETED)
- **CohortCheckInConfig**: id, cohortId (unique), prompts (Json)
- **CoachNote**: id, userId (client), coachId, weekNumber, notes
- **WeeklyCoachResponse**: id, coachId, clientId, weekStart (unique [coachId,clientId,weekStart]), loomUrl?, note?
- **AdminInsight**: id, cohortId?, title, description, priority (LOW/MEDIUM/HIGH/URGENT), status (ACTIVE/RESOLVED/DISMISSED)

### HealthKit
- **HealthKitWorkout**: id, userId, workoutType, startTime, endTime, duration (seconds), calories?, distance?, heartRate (Json)?, metadata (Json)?
- **SleepRecord**: id, userId, startTime, endTime, totalSleep (minutes), inBedTime (minutes), deepSleep?, remSleep?, coreSleep?, sourceDevice?
- **PairingCode**: id, code (unique), userId, createdBy, expiresAt, usedAt?

### System
- **CreditTransaction**: id, userId, amount (pos=add, neg=deduct), reason, expiresAt?, createdById
- **SystemSettings**: id, key (unique), value (Json)
- **AuditLog**: id, userId?, action, target?, metadata (Json)?

### User Personalization
- **UserGoals**: id, userId (unique), currentWeightKg?, targetWeightKg?, heightCm?, dailyCaloriesKcal?, proteinGrams?, carbGrams?, fatGrams?, waterIntakeMl?, dailyStepsTarget?, weeklyWorkoutMinutes?
- **UserPreference**: id, userId (unique), weightUnit ("lbs"/"kg"), measurementUnit ("inches"/"cm"), dateFormat ("MM/dd/yyyy" etc.)
- **EmailTemplate**: id, key (unique), name, description?, subjectTemplate, bodyTemplate (Text), textTemplate (Text), availableTokens (String[]), enabled, isSystem
- **CustomCohortType**: id, label (unique), description?, createdBy

### Key Relationships to Know
- User has many: appointments (as client + coach), bootcampAttendees, workouts, invoices, cohortMemberships, coachCohorts, entries, questionnaireResponses, healthKitWorkouts, sleepRecords, creditTransactions
- Cohort has many: members (CohortMembership), coaches (CoachCohortMembership), bundles (QuestionnaireBundle), one config (CohortCheckInConfig)
- Invoice has many: appointments (linked via invoiceId)
- Appointment belongs to: user (client), coach, optional invoice

---

## 4. Pattern Reference: Server Actions

Every server action follows this exact pattern:

```typescript
"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"  // or requireAdmin, requireAuth
import { revalidatePath } from "next/cache"

// 1. Zod schema at top of file
const createThingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.nativeEnum(SomeEnum).optional(),
})

// 2. Export the input type
export type CreateThingInput = z.infer<typeof createThingSchema>

// 3. Query function (no mutation, no revalidation)
export async function getThings(params?: { status?: string }) {
  await requireCoach()  // Auth check FIRST

  return prisma.thing.findMany({
    where: params?.status ? { status: params.status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
}

// 4. Mutation function
export async function createThing(input: CreateThingInput) {
  const session = await requireCoach()  // Auth check FIRST

  const data = createThingSchema.parse(input)  // Validate
  const coachId = Number.parseInt(session.id, 10)

  const thing = await prisma.thing.create({
    data: {
      ...data,
      coachId,
    },
  })

  // Optional: send email
  await sendSystemEmail({
    templateKey: EMAIL_TEMPLATE_KEYS.THING_CREATED,
    to: "user@example.com",
    variables: { thingName: thing.name },
    isTestUser: false,
  })

  // Optional: audit log
  await logAuditEvent({
    action: "CREATE_THING",
    actorId: coachId,
    targetId: thing.id,
    targetType: "Thing",
  })

  revalidatePath("/things")  // Cache invalidation LAST
  return thing
}
```

### Key Rules:
- `requireCoach()` returns `{ id: string, name: string, email: string, role: Role }` -- `id` is a **string**, convert with `Number.parseInt(session.id, 10)`
- `requireAuth()` returns the same shape for any authenticated user
- No try-catch -- let errors propagate to the client
- `revalidatePath` at end of mutations only
- Zod `.parse()` throws on invalid input (not `.safeParse()` in most actions -- `settings.ts` is the exception using `.safeParse()`)
- Prisma types: use `@prisma/client` enums directly, `Decimal` for money, `Json` for flexible fields

---

## 5. Pattern Reference: React Query Hooks

Every hook file follows this exact pattern:

```typescript
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getThings,
  createThing,
  updateThing,
  deleteThing,
  type CreateThingInput,
  type UpdateThingInput,
} from "@/app/actions/[domain]"

// Query hook -- wraps a get function
export function useThings(params?: { status?: string }) {
  return useQuery({
    queryKey: ["things", params],
    queryFn: () => getThings(params),
  })
}

// Single-item query hook
export function useThing(id: number) {
  return useQuery({
    queryKey: ["thing", id],
    queryFn: () => getThingById(id),
    enabled: !!id,  // Don't fetch if no id
  })
}

// Mutation hook -- wraps a create/update/delete
export function useCreateThing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateThingInput) => createThing(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["things"] })
    },
  })
}

export function useDeleteThing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteThing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["things"] })
    },
  })
}
```

### Key Rules:
- Query keys: `["plural-domain"]` for lists, `["singular-domain", id]` for single items
- `onSuccess` invalidates the list query key
- For detail mutations, also invalidate `["singular", id]`
- No `onError` callbacks -- errors propagate to component via `mutation.error`
- No `staleTime` or `cacheTime` unless specifically needed (coach-analytics uses `staleTime: 5 * 60 * 1000`)
- Import types alongside functions from actions

---

## 6. Pattern Reference: Pages

Pages are **Server Components** (no `"use client"`). They handle auth, then render Client Components.

```typescript
// src/app/[route]/page.tsx
import { auth } from "@/auth"
import { requireCoach } from "@/lib/auth"
import { AppLayout } from "@/components/layouts/AppLayout"
import { ThingList } from "@/features/things/ThingList"
import { ThingForm } from "@/features/things/ThingForm"

export default async function ThingsPage() {
  await requireCoach()            // Auth gate
  const session = await auth()    // Get session for layout

  if (!session) return null       // TypeScript guard

  return (
    <AppLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Things</h1>
            <p className="text-muted-foreground">
              Manage your things
            </p>
          </div>
          {session.user.role === "ADMIN" && <ThingForm />}
        </div>

        <ThingList />
      </div>
    </AppLayout>
  )
}
```

### Key Rules:
- `AppLayout` wraps all pages. Pass `session` prop.
- Auth check with `requireCoach()` / `requireAdmin()` / `requireAuth()` at top
- Conditional rendering based on `session.user.role`
- Page header: `h1` + `p.text-muted-foreground` in a flex container
- `space-y-6` for vertical spacing

---

## 7. Pattern Reference: Feature Components

Client Components live in `src/features/[domain]/`. They use hooks for data.

```typescript
// src/features/things/ThingList.tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useThings } from "@/hooks/useThings"

const statusColors = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
}

export function ThingList() {
  const [filter, setFilter] = useState<string>("ALL")
  const { data: things, isLoading } = useThings(
    filter !== "ALL" ? { status: filter } : undefined
  )

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!things || things.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No things found. Create one to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      {/* Card grid/list */}
    </div>
  )
}
```

### Key Rules:
- `"use client"` at top
- Use shadcn/ui components (`Card`, `Badge`, `Button`, `Dialog`, `Select`, etc.)
- Use Tailwind classes, never inline styles
- Loading state: simple `<div>Loading...</div>` or `<Skeleton />`
- Empty state: centered text with `text-muted-foreground`
- Colors: use Tailwind semantic colors (emerald for active, blue for complete, gray for archived)
- `format` from `date-fns` for date display
- `Link` from `next/link` for navigation

---

## 8. Pattern Reference: Lib Utilities

### Auth Helper (src/lib/auth.ts)

```typescript
// Returns: { id: string, name: string, email: string, role: Role, image?: string }
const user = await requireAuth()     // Any authenticated user
const user = await requireCoach()    // ADMIN or COACH
const user = await requireAdmin()    // ADMIN only
const user = await requireRole(["ADMIN", "COACH"])  // Custom role list

// id is a STRING -- convert for Prisma:
const userId = Number.parseInt(user.id, 10)
```

### Audit Logging (src/lib/audit-log.ts)

```typescript
await logAuditEvent({
  action: "CREATE_SESSION",       // VERB_NOUN format
  actorId: userId,                // number
  targetId: session.id,           // optional number
  targetType: "Session",          // optional string
  details: { name: "HIIT" },     // optional any
})
```

### Email (src/lib/email.ts)

```typescript
await sendSystemEmail({
  templateKey: EMAIL_TEMPLATE_KEYS.COHORT_INVITE,
  to: user.email,
  variables: { userName: user.name, cohortName: "Spring 2026" },
  isTestUser: user.isTestUser,
})
```

### Stripe (src/lib/stripe.ts)

```typescript
// Existing -- for invoice payment links:
const result = await createPaymentLink({
  amount: 2500,  // cents
  description: "Invoice #123",
  metadata: { invoiceId: "123" },
})
// result: { success: true, url: string, id: string } | { success: false, error: string }

// Webhook verification:
const event = verifyWebhookSignature(body, signature, secret)
```

**Important**: The existing Stripe webhook (`src/app/api/webhooks/stripe/route.ts`) handles `checkout.session.completed` and `payment_intent.succeeded`/`payment_intent.payment_failed` with `invoiceId` in metadata. New membership webhooks must distinguish via `metadata.type === "membership"`.

---

## 9. Pattern Reference: API Routes

API routes exist ONLY for external integrations. Pattern:

```typescript
// src/app/api/[domain]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()  // or req.text() for webhooks

    // Validation / auth check

    // Business logic

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 }
    )
  }
}
```

### Existing API routes (do not duplicate):
- `/api/auth/[...nextauth]` -- Auth.js handlers
- `/api/webhooks/stripe` -- Stripe webhook (handles invoice payments)
- `/api/healthkit/pair` -- iOS pairing
- `/api/healthkit/workouts` -- Workout ingestion
- `/api/healthkit/sleep` -- Sleep ingestion
- `/api/healthkit/steps` -- Step ingestion
- `/api/admin/questionnaires` -- Questionnaire admin endpoints

---

## 10. Navigation & Middleware

### Sidebar Navigation (src/components/layouts/Sidebar.tsx)

Navigation is defined as a static object with three role arrays:

```typescript
const navigation = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    // ... more items
  ],
  COACH: [ /* similar */ ],
  CLIENT: [ /* similar */ ],
}
```

To add a new nav item: add to the relevant role array(s) in both `Sidebar.tsx` and `MobileNav.tsx`.

Icons: import from `lucide-react`.

### View Mode Switcher

Admin users can toggle between Admin/Coach views. The `effectiveNavRole` from `useViewMode()` determines which nav array to show. This is purely client-side.

### Middleware (src/middleware.ts)

Route protection:
- `publicRoutes`: `/`, `/login`, `/register`, `/api/auth`
- `adminRoutes`: `/admin`, `/billing`
- `coachRoutes`: `/dashboard`, `/members`, `/appointments`, `/bootcamps`, `/cohorts`, `/invoices`
- Client self-service routes (`/appointments/me`, `/cohorts/me`, `/invoices/me`) are excluded from coach-only check

To add new routes: add them to the appropriate array in middleware.ts.

---

## 11. Do-Not-Touch List

These files are stable and should NOT be modified unless the PRD explicitly says so:

| File | Reason |
|------|--------|
| `src/auth.ts` | Auth.js v5 config -- changing breaks auth |
| `src/app/layout.tsx` | Root layout -- stable |
| `src/app/providers.tsx` | QueryClient provider -- stable |
| `src/lib/prisma.ts` | Singleton -- never changes |
| `src/lib/auth.ts` | Auth helpers -- add new helpers alongside, don't modify |
| `src/lib/utils.ts` | `cn()` utility -- stable |
| `vitest.config.ts` | Test config -- stable |
| `playwright.config.ts` | E2E config -- stable |
| `src/__tests__/mocks/*` | Test mocks -- only add new mocks, don't modify existing |
| All existing test files | Don't modify existing tests -- add new ones |

---

## 12. Import Aliases & Dependencies

### Path Aliases (from tsconfig.json)

```
@/ = src/
```

All imports use this alias:
```typescript
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { useThings } from "@/hooks/useThings"
import { createThing } from "@/app/actions/things"
```

### Key Dependencies (already installed)

| Package | Version | Use |
|---------|---------|-----|
| `next` | 15.x | Framework |
| `react` / `react-dom` | 19.x | UI |
| `@prisma/client` | 6.x | Database |
| `@tanstack/react-query` | 5.x | State management |
| `react-hook-form` | 7.x | Forms |
| `@hookform/resolvers` | 3.x | Zod form resolver |
| `zod` | 3.x | Validation |
| `date-fns` | 4.x | Date utilities |
| `stripe` | latest | Payments |
| `resend` | latest | Email |
| `bcryptjs` | 2.x | Password hashing |
| `recharts` | 2.x | Charts |
| `lucide-react` | latest | Icons |
| `survey-core` + `survey-react-ui` | 2.5.6 | Questionnaires |
| `next-auth` | 5.x (beta) | Authentication |

### Do NOT Install
- State management libraries (Redux, Zustand, Jotai) -- we use React Query
- CSS-in-JS (styled-components, Emotion) -- we use Tailwind
- Alternative form libraries -- we use react-hook-form
- Alternative date libraries (moment, luxon) -- we use date-fns
- Alternative icon sets -- we use lucide-react

---

## 13. Testing Patterns

### Unit Test Pattern

```typescript
// src/__tests__/actions/[domain].test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prismaMock } from "../mocks/prisma"
import { mockSession } from "../mocks/auth"

// Mock modules
vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("next/cache")
vi.mock("next/navigation")

describe("createThing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession({ id: "1", role: "COACH", name: "Test Coach", email: "coach@test.com" })
  })

  it("should create a thing", async () => {
    prismaMock.thing.create.mockResolvedValue({ id: 1, name: "Test" })

    const result = await createThing({ name: "Test" })

    expect(prismaMock.thing.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Test" }),
    })
    expect(result.id).toBe(1)
  })
})
```

### Existing Test Mocks (src/__tests__/mocks/)
- `prisma.ts` -- Mocked Prisma client
- `auth.ts` -- `mockSession()` helper
- `google-calendar.ts` -- Mocked calendar operations
- `email.ts` -- Mocked email sending
- `stripe.ts` -- Mocked Stripe client

### Test Utilities (src/__tests__/utils/)
- `test-data.ts` -- Factory functions for creating test objects
- `test-helpers.ts` -- `mockDate`, `flushPromises`, `waitFor`

---

## 14. Common Pitfalls

### 1. Auth session.id is a string
```typescript
// WRONG:
await prisma.user.findUnique({ where: { id: session.id } })

// RIGHT:
await prisma.user.findUnique({ where: { id: Number.parseInt(session.id, 10) } })
```

### 2. Prisma Decimal fields
```typescript
// Decimal fields (fee, totalAmount, prices) are Prisma.Decimal objects, not numbers
// When creating: pass a number, Prisma converts automatically
// When reading: use .toNumber() or parseFloat() if needed for calculations
```

### 3. Don't use revalidatePath in queries
```typescript
// WRONG -- revalidatePath in a read function:
export async function getThings() {
  const things = await prisma.thing.findMany()
  revalidatePath("/things")  // NO!
  return things
}
```

### 4. Don't add "use server" to lib files
Only action files get `"use server"`. Lib utilities are imported into actions but are NOT server actions themselves.

### 5. Webhook metadata routing
The existing Stripe webhook checks `metadata.invoiceId`. New membership webhooks must use `metadata.type === "membership"` to distinguish from invoice payments. Do NOT break the existing invoice flow.

### 6. Don't modify existing migrations
Add new Prisma migrations, never edit existing ones. Run `npm run db:migrate` to create new migrations.

### 7. AppLayout is required
Every page must be wrapped in `<AppLayout session={session}>`. This provides the sidebar, mobile nav, and view mode context.

### 8. Feature flags are UI-level
Feature flags (from SystemSettings) control navigation and component visibility. They do NOT gate middleware or server actions. The server actions should still work even if the flag is off -- the UI just won't show the entry point.
