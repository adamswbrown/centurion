# PRD: Session & Cohort Architecture Rework

**Status:** Approved
**Date:** 2026-01-27
**Author:** Adam Brown
**Platform:** Centurion Fitness Platform

---

## 1. Overview

This PRD defines the architecture for replacing Centurion's Bootcamp system with a unified **Session + Cohort** model, introducing **membership-based booking** with three plan types, and integrating **Stripe billing** for subscriptions and one-time purchases.

### Problem Statement

Centurion currently has two overlapping group concepts — Bootcamp and Cohort — that serve similar purposes with different implementations. The platform also lacks a membership/subscription system, requiring manual credit management for session access. There is no Stripe integration for recurring billing.

### Solution

1. **Sessions** — Bookable group classes led by coaches. Clients book based on membership tier limits. Calendar-based with cancellation rules and waitlist. Can optionally belong to a cohort.
2. **Cohorts** — The unified group model (absorbs current Bootcamp). Optional fixed-week programs with health tracking + questionnaires. May have linked sessions.
3. **Memberships** — Three plan types (Recurring, Pack, Prepaid) with Stripe-integrated billing that control session booking access.

**Key insight**: Bootcamp and Cohort are the same concept. Bootcamp is merged INTO Cohort — one model for all group programs.

---

## 2. Goals and Success Criteria

### Goals

| Goal | Metric |
|------|--------|
| Unify group models | Single Cohort model replaces Bootcamp + Cohort |
| Enable self-service membership purchases | Clients can buy plans via Stripe Checkout |
| Support 3 membership types | Recurring (subscriptions), Pack (session bundles), Prepaid (time-limited) |
| Automate booking enforcement | Session limits enforced by membership type without manual intervention |
| Provide waitlist management | Auto-promote first waitlisted client when a spot opens |
| Enable Stripe recurring billing | Monthly subscriptions with pause/resume/cancel lifecycle |

### Success Criteria

- Zero Bootcamp references remain in codebase
- All 3 membership types enforce booking limits correctly
- Stripe webhooks create/update/cancel memberships automatically
- Coaches see all clients (cohort members + session attendees) on dashboard
- Late cancellation rules enforced per plan configuration
- `npm run build` passes with no type errors

---

## 3. User Stories

### Client

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| C-1 | As a client, I want to browse available sessions by class type and date | Session list with filters, availability indicator (X/Y spots or "Waitlist") |
| C-2 | As a client, I want to book a session within my membership limits | Booking succeeds if within weekly limit (recurring), sessions remaining (pack), or date range (prepaid) |
| C-3 | As a client, I want to join a waitlist when a session is full | Auto-added to waitlist with position; auto-promoted when spot opens |
| C-4 | As a client, I want to cancel a booking with clear rules | Before cutoff: free cancel. After cutoff: late-cancel (counts toward limit / no refund) |
| C-5 | As a client, I want to see my session usage | Usage bar showing weekly used/limit (recurring), remaining/total (pack), or days left (prepaid) |
| C-6 | As a client, I want to purchase a membership plan via Stripe | Browse plans, click Subscribe/Buy, redirect to Stripe Checkout, membership activated on payment |
| C-7 | As a client, I want to view my membership details and history | Current plan summary, usage, billing date/remaining sessions/days left, purchase history |
| C-8 | As a client, I want to cancel my membership | Cancel at period end (recurring) or immediately (pack/prepaid) |

### Coach

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| CO-1 | As a coach, I want to create sessions (single or recurring) | Create form with class type, date/time, capacity, optional cohort link. Recurring pattern generator. |
| CO-2 | As a coach, I want to manage class types | CRUD for class types with name, color, default capacity, duration |
| CO-3 | As a coach, I want to view session registrations and mark attendance | Session detail with registered list, waitlist, attendance marking (ATTENDED/NO_SHOW) |
| CO-4 | As a coach, I want to cancel a session | Sets status to CANCELLED, notifies all registered clients |
| CO-5 | As a coach, I want to see all my clients (cohort + session) | Dashboard shows union of cohort members and session attendees |

### Admin

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| A-1 | As an admin, I want to create membership plans (all 3 types) | Form adapts fields per type. Auto-creates Stripe Product + Price. |
| A-2 | As an admin, I want to assign a membership to a user without payment | Bypass Stripe, directly create UserMembership |
| A-3 | As an admin, I want to pause/resume/cancel memberships | Syncs to Stripe for recurring plans |
| A-4 | As an admin, I want to control feature visibility via flags | Toggle appointments, sessions, cohorts visibility in navigation |

---

## 4. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session scheduling | Class types for categorization + ad-hoc creation | Recurring generation optional for flexibility |
| Booking limits | Membership-type-aware | Weekly limits (recurring), session count (packs), time-limited access (prepaid) |
| Membership types | All three: Recurring, Pack, Prepaid | Matches existing TeamUp membership structure (10 plans mapped) |
| Payments | Stripe integrated | Subscriptions for recurring, Checkout for packs/prepaid. Full lifecycle in Centurion. |
| Cancellation | Late-cancel cutoff (configurable hours) | Slot/count forfeited if late |
| Waitlist | FIFO auto-promote | First waitlisted gets promoted when someone cancels |
| Session-Cohort link | Optional | Sessions can be standalone or linked to a cohort |
| Bootcamp migration | Merge into Cohort | Single unified group model |
| Coach-client relationship | Dynamic, auto-derived | From session bookings and cohort memberships (no explicit coachId on User) |

---

## 5. Data Model

### New Enums

```
SessionStatus:       SCHEDULED | CANCELLED | COMPLETED
RegistrationStatus:  REGISTERED | WAITLISTED | CANCELLED | LATE_CANCELLED | ATTENDED | NO_SHOW
MembershipTierStatus: ACTIVE | PAUSED | EXPIRED | CANCELLED
MembershipPlanType:  RECURRING | PACK | PREPAID
```

### New Models

#### ClassType
Categorizes sessions (e.g., HIIT, CORE, SGPT).

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| name | String | e.g., "HIIT", "CORE" |
| description | String? | Optional description |
| color | String? | Hex color for calendar UI |
| defaultCapacity | Int | Default max occupancy (default: 12) |
| defaultDurationMins | Int | Default duration in minutes (default: 60) |
| isActive | Boolean | Soft delete flag (default: true) |

#### Session
A scheduled class instance.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| classTypeId | Int? | FK to ClassType (null = ad-hoc) |
| cohortId | Int? | FK to Cohort (null = standalone) |
| coachId | Int | FK to User (coach) |
| title | String | Display name |
| startTime | DateTime | Start time |
| endTime | DateTime | End time |
| maxOccupancy | Int | Capacity limit |
| location | String? | Venue |
| notes | String? | Coach notes |
| status | SessionStatus | Default: SCHEDULED |
| googleEventId | String? | Google Calendar sync |

Indexes: coachId, cohortId, startTime, status, classTypeId

#### SessionRegistration
Client booking for a session.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| sessionId | Int | FK to Session (cascade delete) |
| userId | Int | FK to User |
| status | RegistrationStatus | Default: REGISTERED |
| waitlistPosition | Int? | Queue order (WAITLISTED only) |
| registeredAt | DateTime | Booking time |
| cancelledAt | DateTime? | Cancellation time |
| promotedFromWaitlistAt | DateTime? | Waitlist promotion time |

Unique constraint: [sessionId, userId]

#### MembershipPlan
Defines a purchasable membership tier.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| name | String | Plan display name |
| description | String? | Plan description |
| type | MembershipPlanType | RECURRING, PACK, or PREPAID |
| sessionsPerWeek | Int? | RECURRING: weekly session limit |
| commitmentMonths | Int? | RECURRING: minimum commitment |
| monthlyPrice | Decimal? | RECURRING: monthly charge |
| totalSessions | Int? | PACK: total sessions in bundle |
| packPrice | Decimal? | PACK: one-time price |
| durationDays | Int? | PREPAID: access period in days |
| prepaidPrice | Decimal? | PREPAID: one-time price |
| lateCancelCutoffHours | Int | Hours before session for late cancel (default: 2) |
| allowRepeatPurchase | Boolean | Can buy again (default: true) |
| purchasableByClient | Boolean | Client self-purchase or admin-only (default: true) |
| isActive | Boolean | Soft delete (default: true) |
| penaltySystemEnabled | Boolean | Penalty tracking (default: false) |
| stripeProductId | String? | Stripe Product ID |
| stripePriceId | String? | Stripe Price ID |

#### MembershipClassTypeAllowance
Controls which class types a plan grants access to.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| membershipPlanId | Int | FK to MembershipPlan |
| classTypeId | Int | FK to ClassType |

Unique constraint: [membershipPlanId, classTypeId]. No allowances = all class types allowed.

#### UserMembership
A user's active enrollment in a plan.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| userId | Int | FK to User |
| planId | Int | FK to MembershipPlan |
| startDate | DateTime | Membership start |
| endDate | DateTime? | Null if ongoing recurring |
| status | MembershipTierStatus | Default: ACTIVE |
| sessionsRemaining | Int? | PACK: decremented on booking |
| stripeSubscriptionId | String? | RECURRING: Stripe Subscription ID |
| stripeCheckoutSessionId | String? | PACK/PREPAID: Stripe Checkout ID |

### Modified Models

**Cohort**: Add `sessions Session[]` relation (sessions linked to cohort).

**User**: Add `coachSessions Session[]`, `sessionRegs SessionRegistration[]`, `memberships UserMembership[]` relations.

### Removed Models

- **Bootcamp** — absorbed into Cohort + Session
- **BootcampAttendee** — replaced by SessionRegistration

---

## 6. Booking Logic

### Registration Flow (`registerForSession`)

1. Find user's active membership (any type)
2. Verify class type is allowed by membership (via MembershipClassTypeAllowance; no allowances = all types permitted)
3. **RECURRING**: Count REGISTERED + LATE_CANCELLED sessions this week (Mon-Sun). Reject if count >= sessionsPerWeek.
4. **PACK**: Check sessionsRemaining > 0. Reject if zero.
5. **PREPAID**: Check current date is within startDate..endDate. Reject if outside range.
6. If session full: add as WAITLISTED with queue position
7. Else: add as REGISTERED (if PACK: decrement sessionsRemaining)

### Cancellation Flow (`cancelRegistration`)

1. Check late-cancel cutoff (lateCancelCutoffHours before session startTime)
2. **Within cutoff (late cancel)**:
   - Status = LATE_CANCELLED
   - RECURRING: counts toward weekly limit
   - PACK: session NOT refunded (sessionsRemaining not incremented)
3. **Outside cutoff (free cancel)**:
   - Status = CANCELLED
   - RECURRING: doesn't count toward limit
   - PACK: sessionsRemaining incremented back
4. If anyone WAITLISTED: auto-promote first in queue to REGISTERED

### Session Usage Response (`getSessionUsage`)

| Membership Type | Response Shape |
|----------------|---------------|
| RECURRING | `{ type: "recurring", used, limit, remaining }` (weekly) |
| PACK | `{ type: "pack", sessionsRemaining, totalSessions }` |
| PREPAID | `{ type: "prepaid", daysRemaining, endDate }` |

---

## 7. Stripe Billing Integration

### Membership-to-Stripe Mapping

| Plan Type | Stripe Mode | Stripe Object | Payment Flow |
|-----------|-------------|---------------|-------------|
| RECURRING | `subscription` | Subscription + recurring Price | Client -> Checkout -> Subscription created -> webhook activates membership |
| PACK | `payment` | One-time Checkout Session | Client -> Checkout -> Payment completed -> webhook creates membership with sessionsRemaining |
| PREPAID | `payment` | One-time Checkout Session | Client -> Checkout -> Payment completed -> webhook creates membership with endDate |

### Webhook Events

| Event | Handler |
|-------|---------|
| `checkout.session.completed` | Create UserMembership (PACK/PREPAID) |
| `customer.subscription.created` | Create UserMembership for RECURRING with ACTIVE status |
| `customer.subscription.updated` | Sync status changes (pause -> PAUSED, resume -> ACTIVE) |
| `customer.subscription.deleted` | Set UserMembership to CANCELLED, set endDate |
| `invoice.paid` | Confirm continued access for RECURRING, log payment |
| `invoice.payment_failed` | Grace period logic; after N failures -> PAUSED + email notification |

### Metadata Convention

All Checkout Sessions include metadata to distinguish from existing invoice payment links:

```json
{
  "type": "membership",
  "planId": "123",
  "userId": "456",
  "planType": "RECURRING|PACK|PREPAID"
}
```

### New Stripe Functions (in `src/lib/stripe.ts`)

- `createMembershipCheckoutSession(plan, user)` — creates Checkout in correct mode
- `createStripeProduct(plan)` — creates Stripe Product for a MembershipPlan
- `createStripePrice(plan)` — creates recurring or one-time Price
- `pauseSubscription(subscriptionId)` / `resumeSubscription(subscriptionId)`
- `cancelSubscription(subscriptionId, atPeriodEnd)`
- `getSubscription(subscriptionId)`

---

## 8. Server Actions

### New Files

| File | Functions |
|------|-----------|
| `src/app/actions/class-types.ts` | `getClassTypes`, `createClassType`, `updateClassType`, `deleteClassType` |
| `src/app/actions/sessions.ts` | `getSessions`, `getSessionById`, `createSession`, `updateSession`, `cancelSession`, `generateRecurringSessions`, `getCohortSessions` |
| `src/app/actions/session-registration.ts` | `registerForSession`, `cancelRegistration`, `getMyRegistrations`, `getSessionUsage` |
| `src/app/actions/memberships.ts` | `getMembershipPlans`, `getMembershipPlanById`, `createMembershipPlan`, `updateMembershipPlan`, `deactivateMembershipPlan`, `assignMembership`, `purchaseMembership`, `pauseMembership`, `resumeMembership`, `cancelMembership`, `getUserActiveMembership`, `getUserMembershipHistory` |
| `src/app/actions/stripe-billing.ts` | `createStripeCheckoutSession`, `handleSubscriptionCreated`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `handleCheckoutCompleted`, `handleInvoicePaid`, `handleInvoicePaymentFailed` |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/api/webhooks/stripe/route.ts` | Add handlers for 6 new subscription/checkout webhook events. Distinguish membership vs invoice via `metadata.type`. |
| `src/app/actions/settings.ts` | Add feature flag defaults (`features.appointments.enabled`, `features.sessions.enabled`, `features.cohorts.enabled`), add `defaultLateCancelCutoffHours` setting. |

---

## 9. React Query Hooks

| File | Hooks |
|------|-------|
| `src/hooks/useSessions.ts` | `useSessions(params?)`, `useSession(id)`, `useCreateSession()`, `useCancelSession()` |
| `src/hooks/useClassTypes.ts` | `useClassTypes()`, `useCreateClassType()` |
| `src/hooks/useSessionRegistration.ts` | `useRegister()`, `useCancelRegistration()`, `useMyRegistrations()`, `useWeeklyUsage()` |
| `src/hooks/useMemberships.ts` | `useMembershipPlans(type?)`, `useUserMembership(userId)`, `useUserMembershipHistory(userId)`, `usePurchaseMembership()`, `useAssignMembership()`, `usePauseMembership()`, `useCancelMembership()`, `useSessionUsage(userId)` |

---

## 10. UI Components

### Coach Side (`src/features/sessions/`)

| Component | Purpose |
|-----------|---------|
| `ClassTypeManager.tsx` | CRUD for class types (name, color, capacity, duration). Admin/coach only. |
| `SessionScheduler.tsx` | Create sessions: pick class type or ad-hoc, link to cohort, set date/time/capacity/coach. Recurring pattern generation. |
| `SessionCalendar.tsx` | Calendar view (week/day). Color-coded by class type. Click for detail. |
| `SessionDetail.tsx` | Registered list, waitlist, attendance marking, cancel session. |
| `SessionList.tsx` | Table/list with filters (date, type, coach, cohort). |

### Admin Side (`src/features/memberships/`)

| Component | Purpose |
|-----------|---------|
| `MembershipPlanManager.tsx` | Admin CRUD for plans (all 3 types). Form adapts per type. Stripe sync status. |
| `MembershipPlanCard.tsx` | Client-facing plan card. Price, type badge, features. |
| `MembershipAssigner.tsx` | Admin tool to assign plan to user (bypass payment). |
| `UserMembershipDetail.tsx` | User's active membership with usage stats. Admin pause/cancel. |
| `SessionUsageBar.tsx` | Visual usage component (adapts per membership type). |

### Client Pages

| Route | Purpose |
|-------|---------|
| `/client/sessions` | Browse upcoming sessions, book/cancel, weekly usage bar |
| `/client/sessions/calendar` | Calendar view of registered sessions |
| `/client/membership` | Current plan summary, usage, change/cancel actions, history |
| `/client/membership/plans` | Plan browser grouped by type, compare features, purchase via Stripe |

### Navigation Changes

- Replace "Bootcamps" with "Sessions" in coach/admin nav
- Replace "My Bootcamps" with "My Sessions" in client nav
- Add "My Membership" route for clients
- Gate "Appointments" behind `features.appointments.enabled`
- Gate "Sessions" behind `features.sessions.enabled`
- Gate "Cohorts" behind `features.cohorts.enabled`

---

## 11. Bootcamp Migration

### Mapping

| Bootcamp Feature | New Home |
|-----------------|----------|
| Scheduled event with time/location/capacity | `Session` model |
| Group container with attendees | `Cohort` (if program-based) or standalone `Session` |
| Attendee registration | `SessionRegistration` model |
| Credit consumption on register | Replaced by membership-based session limits |
| Capacity enforcement | `Session.maxOccupancy` + registration count |

### Data Migration Steps

1. For each existing Bootcamp with attendees: create Session + SessionRegistration records
2. Drop `Bootcamp` and `BootcampAttendee` tables

### Files to Delete

- `src/app/actions/bootcamps.ts`
- `src/app/actions/client-bootcamps.ts`
- `src/features/bootcamps/` (entire directory)
- `src/app/bootcamps/` (route)
- `src/app/client/bootcamps/` (route)
- `src/hooks/useBootcamps.ts`
- Related test files in `src/__tests__/`

### References to Remove

- Sidebar navigation (bootcamp entries)
- Middleware route rules
- `getUnifiedEvents()` — rewrite to return sessions instead of bootcamps

---

## 12. Coach-Client Relationship

No explicit `coachId` on User. Coaches see clients dynamically from two sources:

1. **Cohort members** — via `CoachCohortMembership` -> `CohortMembership`
2. **Session attendees** — via `SessionRegistration` where `session.coachId = currentCoach` -> distinct userIds

This means a client who books a session with Coach A automatically appears on Coach A's dashboard. The `getCoachMembersOverview` function unions both sources.

---

## 13. Feature Flags

Using existing `SystemSettings` model:

| Key | Default | Effect |
|-----|---------|--------|
| `features.appointments.enabled` | `false` | Hides 1-on-1 appointment UI from nav/routes |
| `features.sessions.enabled` | `true` | Shows group session booking system |
| `features.cohorts.enabled` | `true` | Shows cohort programs |

Feature flags are UI-level (navigation/route components), not auth-level. Middleware remains permissive.

---

## 14. TeamUp Seed Data Mapping

### Instructors (6 coaches)

| Name | Sessions Led | Notes |
|------|-------------|-------|
| Gav Cunningham | 760 (660 HIIT, 100 CORE) | Primary coach |
| Rory Stephens | 310 (208 HIIT, 102 CORE) | |
| Clare Cuming | 103 (78 HIIT, 25 CORE) | |
| Josh Bunting | 6 (4 HIIT, 2 CORE) | Substitute |
| Conor Bates | 0 | Not in session data |
| Jacki Montgomery | 0 | Not in session data |

### Class Types (2 types)

| Class | Duration | Capacity | Description |
|-------|----------|----------|-------------|
| HIIT | 25 min | 10 | 25-minute coach-led small group sessions |
| CORE | 25 min | 15 | Core strength training |

### Membership Plans (10 plans from TeamUp)

| Name | Type | Key Fields |
|------|------|------------|
| 2025 6 Months x 3 | RECURRING | sessionsPerWeek: 6, commitmentMonths: 6, penalty: true |
| Daily Nutrition Accountability | RECURRING | No sessions (coaching-only), no repeat purchase |
| 1 Session Pass | PACK | 1 session, GBP 9.99 |
| 3 Personal Training Sessions | PACK | 3 sessions, GBP 110.00 |
| 5 Personal Training Sessions | PACK | 5 sessions, GBP 150.00 |
| 10 Personal Training Sessions | PACK | 10 sessions, GBP 275.00 |
| Intro Personal Training | PACK | 1 session, GBP 30.00, no repeat |
| Sports Massage | PACK | 1 session, GBP 40.00 |
| 3 Pack Sports Massages | PACK | 3 sessions, GBP 110.00 |
| 8 WEEK CHALLENGE | PREPAID | 56 days, GBP 250.00, admin-only assignment |

### Recurring Schedule (26-week, Jan-Jun 2026)

**HIIT** — 36 weekly slots (Mon-Sat):
- Mon: 06:30, 07:00, 09:30, 10:05, 12:30, 17:30, 18:05, 19:05
- Tue: 06:30, 07:00, 10:05, 12:30, 17:30, 18:05
- Wed: 06:30, 07:00, 09:30, 10:05, 12:30, 17:00, 17:30, 18:35
- Thu: 06:30, 07:00, 09:30, 10:05, 12:30, 17:30
- Fri: 06:30, 07:00, 09:30, 10:05, 12:30, 17:30
- Sat: 08:45, 09:45, 10:45

**CORE** — 9 weekly slots:
- Mon: 10:35, 18:35
- Tue: 10:30, 18:35
- Wed: 07:30, 18:05
- Thu: 10:30
- Sat: 09:15, 10:15

Venue: "Hitsona Bangor" at UNIT 54 3 BALLOO DRIVE, BANGOR, Down, BT19 7QY, GB

---

## 15. Implementation Order

| Step | What | Dependencies |
|------|------|-------------|
| 1 | Schema: add enums, ClassType, Session, SessionRegistration, MembershipPlan, MembershipClassTypeAllowance, UserMembership. Add Cohort.sessions relation. | None |
| 2 | Schema: remove Bootcamp, BootcampAttendee (data migration first) | Step 1 |
| 3 | Server actions: class-types.ts, sessions.ts | Step 1 |
| 4 | Server actions: memberships.ts (CRUD, assign, purchase) | Step 1 |
| 5 | Stripe billing: stripe-billing.ts + expand stripe.ts + webhook handlers | Step 4 |
| 6 | Server actions: session-registration.ts (booking logic for all 3 membership types) | Steps 3+4 |
| 7 | Hooks: useSessions, useClassTypes, useSessionRegistration, useMemberships | Step 6 |
| 8 | Coach UI: ClassTypeManager, SessionScheduler, SessionCalendar, SessionDetail, SessionList | Step 7 |
| 9 | Admin UI: MembershipPlanManager, MembershipAssigner, UserMembershipDetail | Step 7 |
| 10 | Client UI: session browser, booking, calendar, usage bar | Step 7 |
| 11 | Client UI: membership page, plan browser, Stripe checkout flow | Step 7 |
| 12 | Navigation + middleware: replace bootcamp refs, add session/membership routes, feature flags | Steps 8-11 |
| 13 | Delete bootcamp files, clean references | Step 12 |
| 14 | Coach dashboard: add Sessions tab, update members overview for session-based client discovery | Step 8 |
| 15 | Feature flags in SystemSettings + admin settings UI | Step 12 |

---

## 16. Data Model Diagram

```
MembershipPlan (3 types)
|-- RECURRING: monthly billing, weekly session limits, commitment period
|   \-- Stripe Subscription (recurring Price)
|-- PACK: one-time purchase, N sessions to use anytime
|   \-- Stripe Checkout (one-time Price)
\-- PREPAID: one-time purchase, time-limited access
    \-- Stripe Checkout (one-time Price)

MembershipPlan --> MembershipClassTypeAllowance --> ClassType
\-- Controls which class types a plan grants access to (none = all)

UserMembership (user enrolled in a plan)
|-- RECURRING: stripeSubscriptionId, weekly session count enforced
|-- PACK: sessionsRemaining decremented on booking, refunded on early cancel
\-- PREPAID: endDate enforced, access expires automatically

ClassType (HIIT, CORE, SGPT)
\-- Session (scheduled instance)
    |-- optionally belongs to Cohort
    |-- coached by User (coach)
    \-- SessionRegistration (client booking)
        |-- REGISTERED / WAITLISTED / CANCELLED / LATE_CANCELLED
        \-- limit enforced by membership type (weekly / count / date)

Cohort (program container -- absorbs Bootcamp concept)
|-- members (CohortMembership)
|-- coaches (CoachCohortMembership)
|-- sessions (Session[]) -- scheduled classes for this cohort
|-- questionnaires (QuestionnaireBundle[])
|-- check-in config (CohortCheckInConfig)
\-- health data tracked via Entry (per user, per day, no cohort FK needed)
```

---

## 17. Verification Checklist

1. `npm run build` passes with no type errors
2. Schema migration applies cleanly
3. Coach can create class types and schedule sessions (single + recurring)
4. Sessions can be standalone or linked to a cohort
5. RECURRING membership: client can book within weekly limit, join waitlist when full
6. PACK membership: sessionsRemaining decrements on booking, rejects at 0
7. PREPAID membership: booking within date range works, rejects after expiry
8. Late cancellation enforced (within cutoff = counts toward limit / no refund; outside = free cancel / refund)
9. Waitlist auto-promotes on cancellation
10. Admin can create all 3 plan types with Stripe Product/Price auto-creation
11. Client can self-purchase via Stripe Checkout (redirect + webhook activation)
12. Stripe webhooks correctly create/update/cancel UserMembership records
13. Admin can assign memberships without payment (bypass Stripe)
14. Admin can pause/resume/cancel memberships (syncs to Stripe for RECURRING)
15. Cohorts still work independently for health tracking + questionnaires
16. Health data entry works for non-cohort clients
17. Coach dashboard shows all clients (cohort members + session attendees)
18. Navigation respects feature flags
19. No bootcamp references remain in codebase
20. Class type restrictions work (plans can be limited to specific class types)
