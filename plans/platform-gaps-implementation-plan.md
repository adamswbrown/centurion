# Platform Gaps — Consolidated Implementation Plan

Date: 2026-01-26
Owner: Codex

## Baselines
- **PTP**: user management, admin flows, appointments, credits, billing & payments, overall behaviour.
- **CoachFit**: cohorts, cohort analytics, daily check-ins, HealthKit integration, email system behaviour.

Where both exist:
- Logic/behaviour → copy source system
- UI/flow → align to PTP

---

## Phase 1 — User Management (PTP)

### Scope
- Admin user list/search/detail pages (PTP parity)
- User CRUD API routes
- Role/permission visibility rules

### Deliverables
- `/admin/users` list + search
- `/admin/users/[id]` detail
- Actions/hooks matching PTP behaviours

---

## Phase 2 — Appointment System (PTP)

### Scope
- Booking flow, availability, admin controls, user views
- Match PTP one-for-one

### Deliverables
- Client views parity with PTP (calendar + detail)
- Admin control surface parity (filters, status)

---

## Phase 4 — Credits & Calendar Integration (PTP)

### Credits System
- Bootcamp credit model (allocation, consumption, expiry, visibility)

### Calendar Integration
- Combined calendar view (appointments + bootcamps)
- Color coding per type

---

## Phase 5 — Cohorts & Engagement (CoachFit logic, PTP UI)

### Cohorts
- CoachFit cohort lifecycle + admin functionality
- PTP-aligned UI

### Cohort Analytics
- Participation, completion, engagement metrics

### Daily Check-Ins
- CoachFit check-in logic and reporting

---

## Phase 7 — Weekly Questionnaire
- Explicitly excluded for now

---

## Phase 8 — Billing & Payments (PTP)

### Scope
- Plans/subscriptions
- Credits linkage
- Purchase flows
- Admin billing views
- User billing management

### Stripe
- Integrate Stripe per PTP behaviour

---

## Phase 9+ — Analytics & Integrations

### Analytics & Insights
- Usage, appointments, cohorts, credits, revenue

### HealthKit
- Match CoachFit ingestion + sync + permissions

### Email System
- Resend provider; CoachFit triggers/templates

---

## Testing Suite
- API, routes, auth, permissions
- Billing, credits, cohorts, analytics, booking flows
- UI testing focused on behaviour

---

## Immediate Next Steps
1. Audit current code against PTP user management and admin flows.
2. Design admin user management pages + actions.
3. Define credits model additions + calendar combined view.
4. Scaffold CoachFit-based daily check-ins + cohort analytics.

