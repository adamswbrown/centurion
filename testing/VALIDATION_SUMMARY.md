# Validation Summary (Updated Scope)

**Date:** 2026-01-26
**Status:** 🚧 Planning Update (Scope aligned to consolidated implementation plan)

This summary reflects the **new consolidated plan** you provided and should be treated as the authoritative scope moving forward.

---

## Baselines (Authoritative)

- **PTP** (primary baseline):
  - User management
  - Admin flows
  - Appointments
  - Credits
  - Billing & payments
  - Overall product behaviour
- **CoachFit** (primary baseline):
  - Cohorts
  - Cohort analytics
  - Daily check-ins
  - HealthKit integration
  - Email system behaviour

**Where both exist:**
- **Logic + behaviour** → copy source system
- **UI + flow** → align to PTP

---

## Phased Scope (From Consolidated Plan)

### Phase 1 — User Management (PTP)
- Implement admin user management exactly as PTP.
- Admin user detail page: match PTP functionality, no simplification.

### Phase 2 — Appointment System (PTP)
- Booking flow, availability, admin controls, user views, data model.
- Match PTP behaviour one-for-one.

### Phase 4 — Credits & Calendar Integration (PTP)
- Bootcamp credit model (allocation, consumption, expiry, visibility).
- Combined calendar view (appointments + bootcamps) with color coding.

### Phase 5 — Cohorts & Engagement (CoachFit logic + PTP UI)
- Cohorts admin functionality + lifecycle.
- Cohort analytics (engagement, completion, participation).
- Daily check-ins fully replicated from CoachFit.

### Phase 7 — Weekly Questionnaire
- **Explicitly excluded** (handled separately).

### Phase 8 — Billing & Payments (PTP)
- Plans/subscriptions, credits linkage, purchase flows.
- Admin billing views + user billing management.
- Stripe integration aligned to PTP.

### Phase 9+ — Analytics, Integrations & Platform Support
- Analytics dashboards aligned to available data.
- HealthKit integration (CoachFit baseline).
- Email system using Resend with CoachFit behaviour.
- Testing suite covering all major flows.

---

## Non-Goals (For Now)
- UI polish
- Performance optimization
- Weekly questionnaire work

---

## Required Actions (Next)
- Build a detailed implementation plan for the above phases.
- Align existing code to this plan (resolve divergences vs spec).
- Update testing plan to reflect real scope (not earlier placeholder content).

