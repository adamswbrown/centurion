# Cohort & Session Rework — Gap Analysis

## Decision Log

- **Appointment model**: KEEP. May be useful for future 1-on-1 sessions. UI visibility controlled by feature configuration (hidden by default).

---

## Level 1: New Group Session System (Schema + Code)

### Appointments → Sessions/Classes

The current `Appointment` model is built as a 1-to-1 coach-client relationship. The target is a 1-to-many class — like the TeamUp data shows: a "HIIT" or "CORE" class with `max_occupancy` of 10-15, run by an instructor, that clients browse and register for.

**Decision**: Keep `Appointment` intact but hidden behind a feature flag. Build the new `Session` system alongside it.

**What exists (keep, hide behind config):**
- `Appointment` has a single `userId` (one client) + `coachId`
- All appointment server actions, UI, hooks
- These stay in the codebase but are not surfaced in navigation/routes unless the `features.appointments.enabled` config is set to `true`

**What's needed (new):**
- A `ClassType` model (e.g. "HIIT", "CORE") with color, description, default capacity
- A `Session` model — a scheduled instance of a ClassType, with `coachId`, `startTime`, `endTime`, `maxOccupancy`, venue/location
- A `SessionRegistration` join table — many clients per session
- Registration open/close windows, late cancellation cutoff (TeamUp has `registrations_open_at`, `registrations_close_at`, `late_cancels_after`)
- Waitlist support (`waiting_count`, `is_full` from TeamUp data)
- Credits consumed on session registration

**Feature flag scope:**
- Navigation items for `/appointments` and `/appointments/me` hidden when `features.appointments.enabled = false`
- Coach dashboard widgets for 1-on-1 appointments hidden
- Client calendar excludes appointments
- The `Session` system is the default/primary scheduling model

**Impact:** New schema models alongside existing. New server actions, UI, and hooks for sessions. Appointment code stays but is gated.

---

## Level 2: Bootcamp → Cohort Consolidation (Schema Cleanup)

### Bootcamp model is redundant

Two separate models partially cover the same ground:

| Your Vision | Current `Bootcamp` model | Current `Cohort` model |
|---|---|---|
| Multi-week program (6/8/custom) | Has start/end time | Has start/end date, status, type |
| Weekly questionnaires | None | `QuestionnaireBundle` per week exists |
| Health data tracking prompts | None | `CohortCheckInConfig` + `Entry` exists |
| Multiple coaches | None | `CoachCohortMembership` exists |
| One cohort per user | No constraint | No constraint (needs enforcement) |
| Coach weekly feedback | None | `WeeklyCoachResponse` + `CoachNote` exists |
| Configurable check-in cadence | None | `checkInFrequencyDays` exists |
| Cohort types | None | `CohortType` enum + `CustomCohortType` exists |

The `Cohort` model already does ~80% of what's needed. The `Bootcamp` model is the wrong abstraction — it's a simple event with attendees, no weekly structure.

**What's needed:**
- Delete `Bootcamp` and `BootcampAttendee` models and all related code (actions, UI, hooks)
- Add enforcement so a user can only be in one active cohort at a time
- Add "week number locked after completion" enforcement at the action level (schema constraint exists via `@@unique([userId, bundleId])`, but no mutation guard after `COMPLETED` status)
- Build a client-facing cohort UI: (a) enter health data regularly, (b) answer the week's questionnaire at week's end
- Coach review workflow data model already exists via `WeeklyCoachResponse`

**Impact:** Schema deletion (Bootcamp/BootcampAttendee), remove bootcamp UI, build client cohort experience. Backend models largely in place.

---

## Level 3: Credit ↔ Membership Tiers (New Feature)

### Credits Tied to Membership Type

From pricing tiers:
- **Kickstarter** (6-week challenge): 5 SGPT sessions/week, £297 all-in
- **Committed** (6-month): 5 SGPT sessions/week, £109/month
- **Totally Committed** (12-month): 5 SGPT sessions/week, £99/month

**What exists:**
- `User.credits` (single integer balance)
- `User.creditsExpiry` (single expiry date)
- `CreditTransaction` (audit log of credit changes)
- Credits currently consumed by bootcamp registration (1 per bootcamp) — this consumption target changes to sessions

**What's needed:**
- A `MembershipPlan` model (name, duration, credits-per-week, price, features like "HR Monitor included")
- A `UserMembership` model (user, plan, start date, end date, status, payment reference)
- Automated weekly credit allocation based on active membership
- Credits consumed when registering for a `Session`, not bootcamps
- Credit expiry logic (weekly credits that don't roll over? Or cumulative?) — needs decision
- The current flat `credits` integer on User can remain as the balance; allocation/consumption flow changes

**Impact:** New schema models, allocation logic (cron/webhook), rework of credit consumption target.

---

## Level 4: UI Build-Out

### Client Session Browser
- Browse upcoming sessions by type (HIIT, CORE, etc.)
- See availability, register/unregister
- Credit balance display, cost per session
- Calendar view of registered sessions
- Late cancellation rules

### Client Cohort Dashboard
- Current week indicator
- Prompt to enter health data (link to existing check-in flow)
- Weekly questionnaire access (only current week, locked after submission)
- View coach feedback

### Coach Session Management
- Create/edit class types
- Schedule sessions (recurring patterns like "every weekday at 6:30am")
- View registrations per session
- Mark attendance

### Coach Cohort Dashboard
- Already partially exists (weekly review queue, coach notes)
- Needs the "direct clients to enter health data" nudge mechanism

---

## Level 5: Feature Configuration System

### Show/Hide Platform Capabilities

**What's needed:**
- A configuration mechanism (could use existing `SystemSettings` model) to toggle feature visibility
- Initial flags:
  - `features.appointments.enabled` (default: `false`) — 1-on-1 appointment UI
  - `features.sessions.enabled` (default: `true`) — group session/class UI
  - `features.cohorts.enabled` (default: `true`) — cohort program UI
- Navigation, routes, and dashboard widgets conditionally render based on these flags
- Coach and client views both respect the same flags

**Impact:** Light schema work (may just use `SystemSettings`), moderate UI work to wrap existing components in feature gates.

---

## Summary: Change Severity

| Level | Area | Schema Change | Code Change | Effort |
|---|---|---|---|---|
| **1 (Critical)** | New Group Session system | New: `ClassType`, `Session`, `SessionRegistration` | New actions, UI, hooks (Appointment code stays, hidden) | Heavy |
| **2 (Significant)** | Bootcamp → Cohort consolidation | Remove: `Bootcamp`, `BootcampAttendee`. Add unique constraint | Remove bootcamp code, build client cohort UX | Medium |
| **3 (Significant)** | Membership + Credit rework | New: `MembershipPlan`, `UserMembership` | Credit allocation logic, consumption flow change | Medium |
| **4 (UI)** | Client & Coach dashboards | None | New pages and components | Medium-Heavy |
| **5 (Light)** | Feature configuration | Uses existing `SystemSettings` | Feature gate wrappers in nav/routes | Light |
