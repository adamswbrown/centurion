# PRD: Centurion Fitness Platform

**Status:** Active
**Date:** 2026-01-27
**Author:** Adam Brown
**Repository:** https://github.com/adamswbrown/centurion

---

## 1. Overview

Centurion is a unified fitness platform combining personal training management and health coaching into a single application. It merges the scheduling/billing infrastructure of Personal Trainer Planner (PTP) with the cohort management, health tracking, and analytics capabilities of CoachFit.

### Vision

A single platform where fitness businesses can manage their entire operation: schedule group sessions, sell memberships via Stripe, track client health data, run coaching programs, and handle billing -- all with role-based access for admins, coaches, and clients.

### Target Users

| Role | Description |
|------|-------------|
| **Admin** | Gym owner/manager. Full system access. Manages users, settings, memberships, billing, analytics. |
| **Coach** | Personal trainer or group instructor. Manages sessions, reviews client health data, writes notes. |
| **Client** | Gym member. Books sessions, logs daily health metrics, completes questionnaires, manages membership. |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.7+ |
| UI | shadcn/ui + Radix UI + Tailwind CSS 4.1+ |
| Icons | Lucide React |
| Charts | Recharts |
| Database | PostgreSQL 15+ |
| ORM | Prisma 6.3+ |
| Authentication | Auth.js v5 (NextAuth) |
| State Management | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Payments | Stripe (Subscriptions + Checkout) |
| Email | Resend |
| Calendar Sync | Google Calendar API (service account) |
| Questionnaires | SurveyJS (open-source v2.5.6) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Hosting | Vercel |
| Database Hosting | Railway |

### Architecture Principles

1. **Server Actions for all mutations** -- API routes exist only for external integrations (auth callbacks, webhooks, HealthKit endpoints)
2. **Feature-based directory structure** -- `src/features/[feature]/` for UI, `src/app/actions/` for backend
3. **React Query for all server state** -- custom hooks in `src/hooks/` wrap server actions
4. **Integer auto-increment IDs** -- not CUIDs
5. **Zod validation on all inputs** -- server-side enforcement
6. **Role-based middleware** -- route protection at the edge

---

## 3. Authentication & Authorization

### Providers
- Google OAuth
- Email/Password (bcrypt, 10 rounds)

### Session
- JWT-based, 30-day expiry via Auth.js v5

### Roles

| Role | Access |
|------|--------|
| ADMIN | Full platform access. Can switch to Coach View via ViewModeSwitcher. |
| COACH | Dashboard, members, appointments, sessions, cohorts, invoices, reports, review queue. |
| CLIENT | Personal dashboard, health check-in, questionnaires, session booking, membership management, appointments, invoices. |

### Route Protection

- **Public**: `/`, `/login`, `/register`, `/api/auth`
- **Admin-only**: `/admin/*`, `/billing`
- **Coach/Admin**: `/dashboard`, `/members`, `/appointments`, `/sessions`, `/cohorts`, `/invoices`, `/reports`, `/coach/review-queue`
- **Client self-service**: `/client/*`, `/appointments/me`, `/cohorts/me`, `/invoices/me`

### View Mode Switcher
Admin users can toggle between Admin View and Coach View via `ViewModeContext`. Client-side only (localStorage `centurion-view-mode`), no auth/middleware changes.

---

## 4. Feature Modules

### 4.1 Session Booking System

> Defined in detail in [PRD: Session & Cohort Architecture Rework](session-cohort-architecture-rework.md)

Replaces the legacy Bootcamp system. Introduces class-based group sessions with membership-controlled booking.

**Key concepts:**
- **ClassType** -- categorizes sessions (e.g., HIIT, CORE). Configurable capacity, duration, color.
- **Session** -- a scheduled class instance. Can be standalone or linked to a Cohort. Has coach, time, capacity, location.
- **SessionRegistration** -- client booking with status (REGISTERED, WAITLISTED, CANCELLED, LATE_CANCELLED, ATTENDED, NO_SHOW).
- **Waitlist** -- FIFO auto-promotion when a spot opens.
- **Late cancellation** -- configurable cutoff hours per plan. Late cancels forfeit the session.
- **Recurring generation** -- create batches of sessions from a weekly pattern.

**UI:**
- Coach: ClassTypeManager, SessionScheduler, SessionCalendar, SessionDetail, SessionList
- Client: Session browser with availability, booking/cancel, usage bar, calendar view

### 4.2 Membership & Billing System

> Defined in detail in [PRD: Session & Cohort Architecture Rework](session-cohort-architecture-rework.md)

Three membership plan types, all integrated with Stripe:

| Type | Billing | Booking Limit | Stripe Object |
|------|---------|--------------|---------------|
| **RECURRING** | Monthly subscription | Weekly session limit (e.g., 6/week) | Stripe Subscription |
| **PACK** | One-time purchase | Fixed session count (e.g., 10 sessions) | Stripe Checkout (one-time) |
| **PREPAID** | One-time purchase | Time-limited access (e.g., 56 days) | Stripe Checkout (one-time) |

**Key concepts:**
- **MembershipPlan** -- admin-created plan with type, pricing, session limits, Stripe Product/Price
- **UserMembership** -- user's active enrollment. Tracks status, sessions remaining, Stripe subscription ID.
- **MembershipClassTypeAllowance** -- optional restriction on which class types a plan covers (none = all)
- **Stripe webhooks** -- 6 events handled to create/update/cancel memberships automatically
- **Admin assignment** -- admins can assign plans without payment (bypass Stripe)
- **Pause/Resume/Cancel** -- full lifecycle management synced to Stripe for recurring plans

**UI:**
- Admin: MembershipPlanManager, MembershipAssigner, UserMembershipDetail
- Client: Plan browser, Stripe Checkout redirect, membership dashboard with usage visualization

### 4.3 Cohort Programs

Multi-week coaching programs with health tracking and questionnaires.

**Key concepts:**
- **Cohort** -- a named program with start/end dates, status (ACTIVE/COMPLETED/ARCHIVED)
- **CohortMembership** -- client enrollment with status (ACTIVE/PAUSED/INACTIVE)
- **CoachCohortMembership** -- multi-coach assignment per cohort
- **CohortCheckInConfig** -- per-cohort custom check-in prompts
- **Sessions linked to cohorts** -- sessions can optionally belong to a cohort (new, from Session rework)

**Cohort absorbs Bootcamp** -- the legacy Bootcamp model is merged into Cohort + Session. One unified group model.

**UI:**
- Coach/Admin: CohortForm, CohortList, CohortDetail with inline editing, CoachAssignment, MemberManagement
- Client: Cohort membership list at `/cohorts/me`

### 4.4 Appointment Scheduling

1-on-1 personal training sessions. Hidden by default behind feature flag (`features.appointments.enabled`).

**Key concepts:**
- **Appointment** -- scheduled with client, fee, attendance status, Google Calendar sync
- **Conflict detection** -- overlap algorithm: `aStart < bEnd && aEnd > bStart`
- **Recurring appointments** -- weekly pattern generation
- **Google Calendar sync** -- service account JWT, single and batch operations (max 10)
- **Invoice linking** -- appointments linked to invoices for billing

**UI:**
- Coach: AppointmentDashboard, AppointmentForm, AppointmentCalendar (month/week), AppointmentDetail
- Client: ClientAppointmentsCalendar at `/appointments/me`, detail view with 24h cancel

### 4.5 Daily Health Check-Ins

Clients log daily health metrics, tracked over time with streaks and compliance scores.

**Key concepts:**
- **Entry** -- one per user per day (userId_date unique constraint), upsert pattern
- **Fields**: weight, steps, calories, sleep quality (1-10), perceived stress (1-10), notes, custom responses (JSON), data sources (JSON)
- **HealthKit auto-population** -- steps from walking/running workouts, sleep quality from SleepRecord
- **Check-in stats** -- streak calculation, compliance percentage, total entries
- **Custom prompts** -- per-cohort configurable via CohortCheckInConfig

**UI:**
- Client: CheckInForm with all fields + HealthKit preview, CheckInHistory table at `/client/health`
- Coach: Member check-in data in dashboard drill-down

### 4.6 Weekly Questionnaires

SurveyJS-powered questionnaires administered per cohort week.

**Key concepts:**
- **QuestionnaireBundle** -- JSON questions in SurveyJS format, per cohort per week
- **WeeklyQuestionnaireResponse** -- client answers with status (IN_PROGRESS/COMPLETED)
- **Week locking** -- cannot access future weeks, cannot edit past completed weeks
- **6-week templates** -- pre-built CoachFit baseline questionnaires
- **Questionnaire Builder** -- admin UI with drag/drop question reordering, TipTap rich text editor

**UI:**
- Admin: Questionnaire builder at `/admin/questionnaires`
- Client: Survey rendering at `/client/questionnaires/[cohortId]/[weekNumber]`
- Coach: QuestionnaireResponseList, WeeklyQuestionnaireReport with completion tracking

### 4.7 Coach Analytics & Review Queue

Tools for coaches to monitor and prioritize client attention.

**Key concepts:**
- **Attention score** -- 0-100 score: check-ins (40%), questionnaires (30%), sentiment (30%)
- **Priority tiers** -- red (needs attention), amber (monitor), green (on track)
- **Review queue** -- weekly dashboard at `/coach/review-queue` with week navigation, priority/cohort filtering
- **Coach notes** -- per client per week text notes
- **Coach video responses** -- Loom URL storage via WeeklyCoachResponse model
- **Email draft generation** -- copy-to-clipboard formatted feedback

**UI:**
- CoachDashboard with member prioritization and summary stats at `/dashboard`
- ReviewQueueDashboard with expandable review panels, stats, feedback form

### 4.8 Invoicing & Payments

Invoice generation from attended appointments with Stripe payment links.

**Key concepts:**
- **Invoice** -- auto-generated from ATTENDED appointments, or manually created
- **PaymentStatus** -- UNPAID, PAID, OVERDUE, CANCELLED
- **Stripe payment links** -- generated per invoice for client self-pay
- **Stripe webhooks** -- payment event handling at `/api/webhooks/stripe`
- **Revenue reporting** -- monthly aggregation, UK tax year calculation
- **Export** -- CSV + JSON for accounting

**UI:**
- Admin: InvoiceList with status filtering, GenerateInvoiceDialog, InvoiceDetail, RevenueChart at `/billing`
- Client: Invoice list and detail with pay button at `/invoices/me`

### 4.9 HealthKit Integration

iOS device pairing and automatic health data ingestion.

**Key concepts:**
- **PairingCode** -- 6-character code with 24-hour expiry for iOS app connection
- **HealthKitWorkout** -- workout type, duration, calories, distance, heart rate
- **SleepRecord** -- total sleep, in-bed time, deep/REM/core sleep stages
- **Step ingestion** -- updates Entry model directly
- **Data source tracking** -- JSON field on Entry records origin (manual vs healthkit)
- **Batch upload** -- with deduplication

**API routes:**
- `/api/healthkit/pair` -- device pairing
- `/api/healthkit/workouts` -- workout ingestion
- `/api/healthkit/sleep` -- sleep record ingestion
- `/api/healthkit/steps` -- step count ingestion

**UI:**
- Admin: HealthKit dashboard at `/admin/healthkit` with pairing code manager and data explorer

### 4.10 Reports & Analytics

Multi-domain reporting with export capabilities.

**Key concepts:**
- **Report domains**: Members, Cohorts, Revenue (admin-only), Compliance
- **Dashboard overview** -- growth metrics and trend indicators
- **Role-based scoping** -- admin sees all, coach sees assigned cohort data
- **Export** -- CSV and JSON for all report types
- **Visualizations** -- area charts, pie charts, bar charts via Recharts

**UI:**
- Tabbed dashboard at `/reports` with OverviewCards, MemberEngagementChart, CohortAnalytics, RevenueAnalytics, ComplianceReport, ExportButton

### 4.11 Email System

Transactional emails via Resend with 14 template types.

**Key concepts:**
- **14 template types**: welcome, appointment confirmation/cancellation, invoice notification/payment, cohort invitation, check-in reminder, coach note received, weekly summary, and more
- **Test user suppression** -- emails not sent for `isTestUser` accounts
- **Graceful degradation** -- works without API key (logs instead of sending)

### 4.12 User Management

Admin tools for managing platform users.

**Key concepts:**
- **CRUD** -- create, read, update, delete users
- **Bulk actions** -- bulk delete, bulk role change
- **Search and filtering** -- real-time user search
- **Audit logging** -- all admin actions logged
- **Credit management** -- CreditTransaction model with allocate/deduct, history, balance tracking, expiry dates
- **User detail page** -- at `/admin/users/[id]` with credit management integration

### 4.13 System Settings

Configurable platform parameters stored in SystemSettings (key-value JSON).

**Current settings categories:**
- Coach management (max/min clients per coach)
- Activity windows (recent activity days, engagement thresholds)
- Check-in (default frequency, notification time)
- Feature flags (HealthKit, iOS integration, personalized plans, appointments, sessions, cohorts)
- Adherence scoring (green/amber thresholds, missed check-in policy)
- Body fat categories (low/medium/high/very high thresholds)
- Nutrition (calorie limits, protein ranges, macro defaults)
- Step categories (not much/light/moderate/heavy thresholds)
- Workout categories (minute thresholds)
- Legal content (terms, privacy, DPA HTML, consent version)

**UI:**
- Admin: SystemSettingsForm at `/admin/settings`
- User: UserSettingsForm at `/settings` (name, email, billing email, password)

### 4.14 Interval Timer (PWA)

Standalone workout timer at `/timer` with service worker for installability.

**Features:**
- Customizable interval presets with step editor
- Wake Lock toggle to prevent screen sleep
- Mute toggle for audio cues
- Import/export presets
- Installable as PWA

### 4.15 Google Calendar Integration

Bidirectional sync for appointments.

**Key concepts:**
- Service account with JWT authentication
- Automatic event creation on appointment create
- Batch sync support (max 10 at a time)
- Timezone-aware operations
- Returns Google Event ID for bidirectional tracking

---

## 5. Data Model

### Current Models (21)

| Category | Models |
|----------|--------|
| Auth | User, Account, Session, VerificationToken, UserConsent |
| Personal Training | Appointment, Bootcamp (legacy -- to be removed), BootcampAttendee (legacy), Workout, Invoice |
| Health Coaching | Cohort, CohortMembership, CoachCohortMembership, CohortCheckInConfig, Entry, QuestionnaireBundle, WeeklyQuestionnaireResponse, CoachNote, WeeklyCoachResponse, AdminInsight |
| HealthKit | HealthKitWorkout, SleepRecord, PairingCode |
| System | CreditTransaction, SystemSettings, AuditLog |

### New Models (from Session & Cohort Rework)

| Model | Purpose |
|-------|---------|
| ClassType | Session categorization (HIIT, CORE, etc.) |
| Session | Scheduled class instance |
| SessionRegistration | Client booking with status |
| MembershipPlan | Purchasable membership tier (3 types) |
| MembershipClassTypeAllowance | Class type restrictions per plan |
| UserMembership | User's active plan enrollment |

### Removed Models (from Session & Cohort Rework)

- Bootcamp -- absorbed into Cohort + Session
- BootcampAttendee -- replaced by SessionRegistration

### Key Enums

| Enum | Values |
|------|--------|
| Role | ADMIN, COACH, CLIENT |
| AttendanceStatus | ATTENDED, NOT_ATTENDED |
| CohortStatus | ACTIVE, COMPLETED, ARCHIVED |
| MembershipStatus | ACTIVE, PAUSED, INACTIVE |
| PaymentStatus | UNPAID, PAID, OVERDUE, CANCELLED |
| WorkoutStatus | NOT_STARTED, IN_PROGRESS, COMPLETED |
| ResponseStatus | IN_PROGRESS, COMPLETED |
| SessionStatus | SCHEDULED, CANCELLED, COMPLETED |
| RegistrationStatus | REGISTERED, WAITLISTED, CANCELLED, LATE_CANCELLED, ATTENDED, NO_SHOW |
| MembershipTierStatus | ACTIVE, PAUSED, EXPIRED, CANCELLED |
| MembershipPlanType | RECURRING, PACK, PREPAID |

---

## 6. Server Actions

All mutations use server actions in `src/app/actions/`. API routes exist only for external integrations.

### Existing (20 action files)

| File | Domain |
|------|--------|
| `admin-users.ts` | Admin user CRUD, bulk actions |
| `appointments.ts` | Appointment CRUD, conflict detection, calendar sync |
| `auth.ts` | Authentication helpers |
| `bootcamps.ts` | Legacy bootcamp CRUD (to be removed) |
| `client-appointments.ts` | Client appointment views |
| `client-bootcamps.ts` | Client bootcamp registration (to be removed) |
| `client-cohorts.ts` | Client cohort views |
| `client-invoices.ts` | Client invoice views |
| `coach-analytics.ts` | Attention scores, member insights |
| `cohort-analytics.ts` | Cohort compliance, participation |
| `cohorts.ts` | Cohort CRUD, membership, coach assignment |
| `credits.ts` | Credit allocation, history, summary |
| `entries.ts` | Daily check-in CRUD, stats |
| `invoices.ts` | Invoice CRUD, generation, payment links, revenue |
| `members.ts` | Member listing and management |
| `questionnaires.ts` | Questionnaire bundles, responses |
| `reports.ts` | Report data aggregation |
| `review-queue.ts` | Coach review queue, notes, responses |
| `settings.ts` | System settings, user profile |

### New (from Session & Cohort Rework)

| File | Domain |
|------|--------|
| `class-types.ts` | ClassType CRUD |
| `sessions.ts` | Session CRUD, recurring generation |
| `session-registration.ts` | Booking, cancellation, waitlist, usage |
| `memberships.ts` | Plan CRUD, assign, purchase, pause/cancel |
| `stripe-billing.ts` | Stripe checkout, webhook handlers |

---

## 7. React Query Hooks

Custom hooks in `src/hooks/` wrap server actions with caching, optimistic updates, and cache invalidation.

### Existing (17 hooks)

useAppointments, useBootcamps (to be removed), useClientAppointments, useClientBootcamps (to be removed), useClientCohorts, useClientInvoices, useCohorts, useEntries, useInvoices, useMembers, useQuestionnaires, useReports, useReviewQueue

### New (from Session & Cohort Rework)

useSessions, useClassTypes, useSessionRegistration, useMemberships

---

## 8. Route Structure

### Coach/Admin Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Coach dashboard with attention scores |
| `/appointments` | Appointment management + calendar |
| `/sessions` | Session management + calendar (NEW) |
| `/cohorts` | Cohort management |
| `/members` | Member management |
| `/billing` | Invoice management (admin-only) |
| `/reports` | Analytics dashboards |
| `/coach/review-queue` | Weekly client reviews |
| `/settings` | User profile settings |
| `/admin/settings` | System settings |
| `/admin/users` | User management |
| `/admin/users/[id]` | User detail with credits |
| `/admin/questionnaires` | Questionnaire builder |
| `/admin/healthkit` | HealthKit dashboard |
| `/admin/memberships` | Membership plan management (NEW) |

### Client Routes

| Route | Purpose |
|-------|---------|
| `/client/dashboard` | Client overview |
| `/client/health` | Daily check-in form + history |
| `/client/sessions` | Session browser + booking (NEW) |
| `/client/sessions/calendar` | Registered sessions calendar (NEW) |
| `/client/membership` | Membership dashboard (NEW) |
| `/client/membership/plans` | Plan browser + purchase (NEW) |
| `/client/questionnaires/[cohortId]/[weekNumber]` | Weekly questionnaire |
| `/appointments/me` | Personal appointment calendar |
| `/cohorts/me` | Cohort memberships |
| `/invoices/me` | Invoice list + payment |

### Standalone

| Route | Purpose |
|-------|---------|
| `/timer` | Interval timer PWA |

---

## 9. Integrations

### Stripe

- **Existing**: Payment Link generation for invoices, webhook at `/api/webhooks/stripe`, API version `2025-12-15.clover`
- **New (from Rework)**: Subscription management for recurring memberships, one-time Checkout for packs/prepaid, 6 new webhook events, Product/Price auto-creation for plans

### Google Calendar

- Service account JWT authentication
- Single and batch event operations (max 10)
- Timezone-aware
- Returns Google Event ID for bidirectional sync

### Resend Email

- 14 email template types
- Test user suppression via `isTestUser` flag
- Graceful degradation without API key

### HealthKit (iOS)

- 6-character pairing codes (24-hour expiry)
- Workout, sleep, step ingestion endpoints
- Auto-populates Entry records
- Batch upload with deduplication

### SurveyJS

- Open-source v2.5.6
- JSON-based questionnaires stored in DB
- 6-week transformation templates
- Custom theme matching Tailwind

---

## 10. Feature Flags

Feature visibility controlled via SystemSettings:

| Key | Default | Effect |
|-----|---------|--------|
| `features.appointments.enabled` | `false` | Hides 1-on-1 appointment UI |
| `features.sessions.enabled` | `true` | Shows group session booking |
| `features.cohorts.enabled` | `true` | Shows cohort programs |
| `healthkitEnabled` | `true` | HealthKit integration |
| `iosIntegrationEnabled` | `true` | iOS app features |
| `showPersonalizedPlan` | `true` | Personalized plan display |

Feature flags are UI-level (navigation/components), not auth-level.

---

## 11. Security

| Concern | Implementation |
|---------|---------------|
| Input validation | Zod schemas on all server actions |
| SQL injection | Prisma parameterized queries |
| XSS | React automatic escaping |
| Authentication | JWT sessions with role-based middleware |
| Passwords | bcrypt (10 rounds) |
| Webhooks | Stripe signature verification |
| Audit trail | HIPAA-compliant audit logging |
| Test users | Email suppression via `isTestUser` flag |
| Secrets | Environment variables only, never hardcoded |

---

## 12. Testing

### Unit/Integration (Vitest)

- 237 passing tests across 11 test files
- Mock system for Prisma, Auth, Google Calendar, Email, Stripe
- Factory functions for test data generation
- Server action tests: appointments (23), cohorts (32), invoices (27), review-queue (21)
- Library tests: calendar (39), utils (9)
- Component tests: Button (25), Card (23), ErrorBoundary (14)
- Hook tests: useAppointments (13)

### E2E (Playwright)

- Browsers: Chrome, WebKit, Mobile Chrome, Mobile Safari
- Test suites: auth, appointments, cohorts, invoices, review-queue

---

## 13. Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | JWT secret |

### OAuth

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |

### Optional

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Email sending |
| `EMAIL_FROM` | From address |
| `STRIPE_SECRET_KEY` | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `GOOGLE_CALENDAR_ID` | Calendar sync |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Calendar service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Calendar auth |
| `TIME_ZONE` | Default: America/New_York |

---

## 14. Implementation Status

### Completed Features (~65)

- Authentication (Google OAuth + Email/Password, JWT sessions, 3-tier RBAC)
- User management (CRUD, bulk actions, search, audit logging, credits)
- Appointment scheduling (CRUD, conflict detection, recurring, Google Calendar sync, client view)
- Bootcamp system (CRUD, attendees, capacity enforcement, credit consumption, client registration)
- Cohort programs (CRUD, multi-coach, member management, status transitions, check-in config)
- Daily health check-ins (upsert, streaks, compliance, custom prompts, HealthKit auto-population)
- Weekly questionnaires (SurveyJS builder, 6-week templates, response tracking, week locking)
- Invoicing (auto-generation, Stripe payment links, payment status, revenue reporting, CSV/JSON export)
- Coach analytics (attention scores, priority queue, member insights)
- Review queue (weekly reviews, coach notes, video responses, email drafts)
- Reports (members, cohorts, revenue, compliance, export)
- HealthKit integration (pairing, workouts, sleep, steps, admin dashboard)
- Email system (14 templates, test suppression, graceful degradation)
- System settings (50+ configurable parameters)
- User settings (profile, billing email, password)
- Role switcher (admin view mode toggle)
- Interval timer PWA
- Error boundaries and loading skeletons
- 237 passing tests

### Pending: Session & Cohort Rework

> See [PRD: Session & Cohort Architecture Rework](session-cohort-architecture-rework.md) for full specification.

15-step implementation plan covering schema changes, server actions, Stripe billing, hooks, coach/admin/client UI, bootcamp migration, navigation updates, and feature flags.

### Known Gaps (from Cross-Platform Audit)

9 critical gaps remaining from the CoachFit + PTP audit:

| ID | Gap | Source |
|----|-----|--------|
| C1 | Password reset flow (email token) | PTP |
| C2 | User goals/targets (weight, calories, macros, steps) | CoachFit |
| C3 | User preferences (weight unit, date format) | CoachFit |
| C4 | Extended system settings (50+ params) | CoachFit -- **DONE** |
| C5 | Email template admin editor | CoachFit |
| C6 | GDPR account deletion + data export | CoachFit |
| C7 | Consent management (terms, privacy, DPA) | CoachFit |
| C8 | Cohort types enum + custom types | CoachFit |
| C9 | 3-level check-in frequency override | CoachFit |

8 medium gaps:

| ID | Gap | Source |
|----|-----|--------|
| M1 | Workout CRUD (standalone) | PTP |
| M2 | Billing email field | PTP -- **DONE** |
| M3 | Body fat percentage in entries | CoachFit |
| M4 | Fitness Wrapped / Year-in-Review | CoachFit |
| M5 | Role switcher | CoachFit -- **DONE** |
| M6 | Apple OAuth | CoachFit |
| M7 | Entry height + BMI | CoachFit |
| M8 | Unit conversions | CoachFit |

6 low gaps: appointment video URL, dynamic forms, Sentry, Vercel Analytics, health check endpoint, fetch retry.

> Full details in [AUDIT.md](../AUDIT.md).

---

## 15. TeamUp Data Integration

The platform ingests reference data from TeamUp (existing gym management system):

- **6 coaches** with session history
- **2 class types** (HIIT: 25min/10 capacity, CORE: 25min/15 capacity)
- **10 membership plans** mapped to 3 Centurion types (2 Recurring, 7 Pack, 1 Prepaid)
- **45 weekly session slots** (36 HIIT + 9 CORE, Mon-Sat)
- **Venue**: Hitsona Bangor, UNIT 54 3 BALLOO DRIVE, BANGOR, Down, BT19 7QY, GB

> See [testing/memberships-overview.md](../testing/memberships-overview.md) for membership mapping details.

---

## 16. Deployment

### Infrastructure

| Component | Provider |
|-----------|----------|
| Web hosting | Vercel |
| Database | Railway (PostgreSQL) |
| Payments | Stripe |
| Email | Resend |
| Calendar | Google Calendar API |

### Deployment Checklist

- Vercel: connect GitHub repo, configure build, add env vars, custom domain
- Railway: provision PostgreSQL, copy connection string, run migrations, configure backups
- Stripe: configure webhooks endpoint, add API keys
- Resend: configure domain, add API key
- Post-deploy: smoke tests, OAuth flows, email delivery, webhook verification, error monitoring

---

## 17. Success Criteria

### Technical

- 100% TypeScript coverage (no `any` types in application code)
- 80%+ test coverage
- < 2s page load time
- < 100ms API response time
- Zero TypeScript build errors
- Lighthouse score > 90

### Functional

- All 3 user roles can complete their core workflows
- Stripe billing works end-to-end (subscribe, pay, webhook activates membership)
- Session booking enforces membership limits correctly
- Health data flows from HealthKit to coach dashboard
- Questionnaires render and submit without errors
- Google Calendar stays in sync with appointments
- All transactional emails deliver

---

## 18. Related Documents

| Document | Purpose |
|----------|---------|
| [Session & Cohort Architecture Rework PRD](session-cohort-architecture-rework.md) | Detailed spec for session booking, memberships, Stripe billing, bootcamp migration |
| [AUDIT.md](../AUDIT.md) | Cross-platform feature audit (CoachFit + PTP vs Centurion) |
| [STATE.md](../STATE.md) | Current implementation state and open TODOs |
| [WORKLOG.md](../WORKLOG.md) | Chronological development log |
| [unified-platform-spec.md](../unified-platform-spec.md) | Original platform specification |
| [testing/TEST_PLAN.md](../testing/TEST_PLAN.md) | Test plan and coverage details |
