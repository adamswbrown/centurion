# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Centurion is a unified fitness platform combining personal training management (from PTP) and health coaching (from CoachFit). Built with Next.js 15 (App Router), TypeScript, Prisma 6, PostgreSQL, and NextAuth v5. The platform supports three roles (ADMIN, COACH, CLIENT) and integrates Stripe payments, Google Calendar sync, HealthKit data ingestion, SurveyJS questionnaires, and Resend transactional emails.

**Key distinction from CoachFit**: Centurion uses **server actions** (`"use server"`) for all mutations instead of API routes. API routes exist only for external integrations (auth callbacks, webhooks, HealthKit endpoints, calendar API).

---

## Operating Philosophy

- **Parallel thinking, not sequential** — one response = one coherent system slice
- **Batch delivery > incremental drip** — frontend + backend + data + tests together
- **MVP first, refinement later** — ship the 80% solution, document the 20%
- **Momentum > perfection** — reduce scope, not quality, when stuck

---

## Common Commands

### Development
```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
```

### Database
```bash
npm run db:generate      # Generate Prisma Client (after schema changes)
npm run db:push          # Push schema to database (prototyping)
npm run db:migrate       # Run migrations (production)
npm run db:studio        # Open Prisma Studio GUI
```

### Testing
```bash
npm run test             # Run Vitest unit/integration tests
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode
```

---

## Architecture & Key Concepts

### Directory Structure
```
src/
├── app/                 # Next.js App Router
│   ├── actions/         # Server actions (20 files) — ALL mutations go here
│   ├── api/             # API routes (external integrations only)
│   │   ├── auth/        # NextAuth handlers
│   │   ├── calendar/    # Google Calendar API
│   │   ├── healthkit/   # HealthKit ingestion (pair, workouts, sleep, steps)
│   │   ├── webhooks/    # Stripe webhooks
│   │   └── admin/       # Admin API endpoints
│   ├── [routes]/        # Page routes
│   ├── layout.tsx       # Root layout
│   ├── providers.tsx    # React Query provider
│   └── page.tsx         # Landing page
├── components/          # React components
│   ├── admin/           # Admin-specific
│   ├── coach/           # Coach-specific
│   ├── layouts/         # AppLayout, Sidebar, MobileNav, ViewModeSwitcher
│   ├── providers/       # Provider components
│   ├── questionnaires/  # SurveyJS wrappers
│   └── ui/              # shadcn/ui components (16)
├── contexts/            # React contexts
│   └── ViewModeContext.tsx  # Admin/Coach view mode switching
├── features/            # Feature modules (15 features, 74 files)
│   ├── appointments/    # Appointment management
│   ├── bootcamps/       # Group training sessions
│   ├── calendar/        # Combined calendar views
│   ├── cohorts/         # Program cohort management
│   ├── credits/         # Credit system
│   ├── entries/         # Daily check-ins
│   ├── healthkit/       # HealthKit dashboard
│   ├── invoices/        # Billing and invoicing
│   ├── members/         # Member management
│   ├── questionnaires/  # Questionnaire builder + viewer
│   ├── reports/         # Analytics dashboards
│   ├── review-queue/    # Weekly coach review
│   ├── settings/        # System and user settings
│   ├── timer/           # Interval timer PWA
│   └── users/           # User management
├── hooks/               # Custom React Query hooks (17)
├── lib/                 # Shared utilities
│   ├── healthkit/       # Pairing code generation
│   ├── validations/     # Zod schemas
│   ├── auth.ts          # Auth helper functions
│   ├── calendar.ts      # Date/calendar utilities
│   ├── email.ts         # Resend client
│   ├── email-templates.ts  # 14 template types
│   ├── google-calendar.ts  # Google Calendar service account
│   ├── prisma.ts        # Prisma client singleton
│   ├── stripe.ts        # Stripe client
│   ├── surveyjs-config.ts  # SurveyJS theme
│   └── utils.ts         # General utilities
├── types/               # TypeScript type definitions
├── auth.ts              # NextAuth v5 configuration
└── middleware.ts         # Route protection middleware
```

### Authentication & Authorization

**NextAuth v5** with JWT sessions (30-day expiry).

**Providers**: Google OAuth + Email/Password (bcrypt).

**Three roles**: `ADMIN`, `COACH`, `CLIENT`

**Helper functions** (in `src/lib/auth.ts`):
- `requireAuth()` — redirects unauthenticated users to /login
- `requireRole(roles)` — requires specific role(s)
- `requireAdmin()` — admin-only shorthand
- `requireCoach()` — admin or coach shorthand

**Middleware** (`src/middleware.ts`):
- Public: `/`, `/login`, `/register`, `/api/auth`
- Admin-only: `/admin`, `/billing`
- Coach: `/dashboard`, `/members`, `/appointments`, `/bootcamps`, `/cohorts`, `/invoices`
- Client self-service: `/appointments/me`, `/cohorts/me`, `/invoices/me`
- Clients redirected from coach routes to `/client/dashboard`

**View Mode Switcher**: Admin users can toggle between Admin View and Coach View via `ViewModeContext`. Purely client-side, no auth/middleware changes. Persisted in localStorage (`centurion-view-mode`).

### Server Actions Pattern

All mutations use server actions in `src/app/actions/`. API routes exist only for external integrations.

**Standard pattern:**
```typescript
"use server"
import { requireCoach } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({ /* ... */ })

export async function createThing(data: z.infer<typeof schema>) {
  const session = await requireCoach()
  const parsed = schema.parse(data)
  // Prisma operation
  revalidatePath("/things")
  return result
}
```

**20 action files**: admin-users, appointments, auth, bootcamps, client-appointments, client-bootcamps, client-cohorts, client-invoices, coach-analytics, cohort-analytics, cohorts, credits, entries, invoices, members, questionnaires, reports, review-queue, settings.

### Data Model (21 Prisma Models)

**Auth**: User, Account, Session, VerificationToken, UserConsent

**Personal Training**: Appointment, Bootcamp, BootcampAttendee, Workout, Invoice

**Health Coaching**: Cohort, CohortMembership, CoachCohortMembership, CohortCheckInConfig, Entry, QuestionnaireBundle, WeeklyQuestionnaireResponse, CoachNote, WeeklyCoachResponse, AdminInsight

**HealthKit**: HealthKitWorkout, SleepRecord, PairingCode

**System**: CreditTransaction, SystemSettings, AuditLog

**Key enums**: Role (ADMIN/COACH/CLIENT), PaymentStatus (UNPAID/PAID/OVERDUE/CANCELLED), CohortStatus (ACTIVE/COMPLETED/ARCHIVED), MembershipStatus (ACTIVE/PAUSED/INACTIVE), WorkoutStatus (NOT_STARTED/IN_PROGRESS/COMPLETED)

### Frontend Architecture

**State management**: React Query (`@tanstack/react-query`) for all server state. Custom hooks in `src/hooks/` wrap server actions with caching, optimistic updates, and cache invalidation.

**UI**: shadcn/ui components (Radix primitives + Tailwind CSS 4). Icons from `lucide-react`. Charts from `recharts`.

**Forms**: `react-hook-form` + `@hookform/resolvers` + Zod validation schemas.

**Server vs Client Components**: Default to Server Components for pages. Use `"use client"` for interactive forms, charts, components with browser APIs.

### Integrations

**Stripe** (`src/lib/stripe.ts`): Payment Link generation for invoices. Webhook at `/api/webhooks/stripe`. API version `2025-12-15.clover`.

**Google Calendar** (`src/lib/google-calendar.ts`): Service account with JWT. Single and batch event operations (max 10). Timezone-aware. Returns Google Event ID for bidirectional sync.

**SurveyJS** (`src/lib/surveyjs-config.ts`): Open-source v2.5.6. JSON-based questionnaires stored in DB. 6-week transformation templates. Custom theme matching Tailwind.

**HealthKit** (`src/lib/healthkit/`, `/api/healthkit/*`): iOS pairing via 6-char codes (24h expiry). Workout, sleep, step ingestion. Auto-populates Entry records. Batch upload support with deduplication.

**Resend** (`src/lib/email.ts`): 14 email template types. Test user suppression. Graceful degradation without API key.

---

## Testing

### Unit/Integration (Vitest)
- **Config**: `vitest.config.ts` (jsdom environment, globals enabled)
- **Setup**: `vitest.setup.ts` (mock auto-reset)
- **Mocks**: `src/__tests__/mocks/` (prisma, auth, google-calendar, email, stripe)
- **Utilities**: `src/__tests__/utils/` (factory functions, test helpers)
- **Tests**: `src/__tests__/actions/` (appointments 23, cohorts 32, invoices 27, review-queue 21), `src/__tests__/lib/` (calendar 39, utils 9), `src/__tests__/components/` (button 25, card 23, ErrorBoundary 14), `src/__tests__/hooks/` (useAppointments 13)
- **Total**: 237 passing tests across 11 test files

### E2E (Playwright)
- **Config**: `playwright.config.ts` (Chrome, WebKit, Mobile Chrome, Mobile Safari)
- **Tests**: `e2e/` (auth, appointments, cohorts, invoices, review-queue)

### Mock Pattern
```typescript
// All mocks auto-reset between tests via vitest.setup.ts
vi.mock("@/lib/prisma")
vi.mock("@/auth")
vi.mock("next/cache")
vi.mock("next/navigation")
```

---

## Environment Variables

### Required
```
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_URL             # http://localhost:3000
NEXTAUTH_SECRET          # openssl rand -base64 32
```

### OAuth
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### Optional
```
RESEND_API_KEY           # Email sending
EMAIL_FROM               # From address
STRIPE_SECRET_KEY        # Payment processing
STRIPE_WEBHOOK_SECRET    # Webhook verification
GOOGLE_CALENDAR_ID       # Calendar sync
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
TIME_ZONE                # Default: America/New_York
```

---

## Security Baseline

- **Input validation**: Zod schemas on all server actions
- **SQL injection**: Prisma parameterized queries
- **XSS**: React automatic escaping
- **Auth**: JWT sessions with role-based middleware
- **Passwords**: bcrypt (10 rounds)
- **Webhooks**: Stripe signature verification
- **Audit**: HIPAA-compliant audit logging
- **Test users**: Email suppression via `isTestUser` flag
- **Secrets**: Environment variables only, never hardcoded

---

## Route Structure

### Coach/Admin Routes
- `/dashboard` — Coach dashboard with attention scores
- `/appointments` — Appointment management + calendar
- `/bootcamps` — Bootcamp management
- `/cohorts` — Cohort management
- `/members` — Member management
- `/billing` — Invoice management (admin-only)
- `/reports` — Analytics dashboards
- `/coach/review-queue` — Weekly client reviews
- `/settings` — User profile settings
- `/admin/settings` — System settings
- `/admin/users` — User management
- `/admin/questionnaires` — Questionnaire builder
- `/admin/healthkit` — HealthKit dashboard

### Client Routes
- `/client/dashboard` — Client overview
- `/client/health` — Daily check-in
- `/client/bootcamps` — Browse/register bootcamps
- `/client/questionnaires/[cohortId]/[weekNumber]` — Weekly questionnaire
- `/appointments/me` — Personal appointment calendar
- `/cohorts/me` — Cohort memberships
- `/invoices/me` — Invoice list and payment

### Standalone
- `/timer` — Interval timer PWA

---

## Project Documentation

- **AUDIT.md** — Cross-platform feature audit (CoachFit + PTP vs Centurion). 23 gaps identified with IDs (C1-C9, M1-M8, L1-L6).
- **STATE.md** — Current project state, implemented features, key files, open TODOs.
- **WORKLOG.md** — Chronological development log.
- **unified-platform-spec.md** — Original platform specification.
- **testing/TEST_PLAN.md** — Test plan and coverage details.

---

## Key Patterns

### Adding a New Feature
1. Schema change in `prisma/schema.prisma` → `npm run db:migrate` → `npm run db:generate`
2. Server action in `src/app/actions/[feature].ts` with Zod validation + role auth
3. React Query hook in `src/hooks/use[Feature].ts`
4. Feature components in `src/features/[feature]/`
5. Page route in `src/app/[route]/page.tsx`
6. Tests in `src/__tests__/actions/[feature].test.ts`
7. Update navigation in Sidebar + MobileNav if needed

### Naming Conventions
- Server actions: `create[Thing]`, `update[Thing]`, `delete[Thing]`, `get[Thing]s`
- Hooks: `use[Feature]` returning `{ data, isLoading, create, update, delete }`
- Feature components: `[Feature]List`, `[Feature]Detail`, `[Feature]Form`
- Pages: Server components that import feature components

### Entry Upsert Pattern
One entry per user per day enforced by `userId_date` unique constraint. All check-in operations use Prisma `upsert`.

### Appointment Conflict Detection
Overlap algorithm: `aStart < bEnd && aEnd > bStart`. Checked on both create and update.

---

## Known Gaps (from Cross-Platform Audit)

9 critical gaps remain. See `AUDIT.md` for full details and implementation recommendations. Key gaps:
- C1: Password reset flow
- C2: User goals/targets
- C3: User preferences (units, date format)
- C4: Extended system settings (50+ params)
- C5: Email template admin editor
- C6: GDPR account deletion + data export
- C7: Consent management
- C8: Cohort types enum + custom types
- C9: 3-level check-in frequency override

---

## When Stuck

1. Reduce scope (smaller vertical slice)
2. Check existing patterns in this doc and similar server actions
3. Ship the 80% solution
4. Document the remaining 20% in STATE.md
5. Move forward
