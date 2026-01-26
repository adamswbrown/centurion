# UI & App Gap Audit (vs Unified Spec)

Date: 2026-01-26
Owner: Codex

## High-Level Route/UI Gaps (404s / missing pages)
- `/admin/users` admin user management UI missing.
- `/reports` and `/settings` referenced in navigation but missing.
- `/client/health` and `/client/settings` are placeholders only.

## Phase 2 – Core Auth & User Management
Missing vs spec:
- Admin user management pages (list/detail/search).
- User search (real-time).
- User CRUD API routes.
- Admin user detail pages.

## Phase 3 – Appointment System
Implemented:
- CRUD actions, conflict detection, recurring support, calendar views, detail pages.
- Client calendar at `/appointments/me`.
Missing / incomplete vs spec:
- Client appointment detail view.

## Phase 4 – Bootcamps
Implemented:
- Coach CRUD + calendar + attendee management.
- Client registration at `/client/bootcamps`.
Missing vs spec:
- Credit system (optional).
- Combined calendar view with appointments.

## Phase 5 – Cohorts
Implemented (coach/admin):
- Cohort CRUD + coach assignment + member management UI.
Missing vs spec:
- Client cohort view exists but no client coaching flows yet.
- Cohort analytics.

## Phase 6 – Daily Check-In System
Missing vs spec:
- Entry CRUD routes, check-in form, history view, charts, reminders.

## Phase 7 – Weekly Questionnaires
Missing vs spec:
- Questionnaire builder UI, completion UI, response analytics, coach review.

## Phase 8 – Billing & Payments
Partially implemented:
- Invoice actions + admin billing pages; Stripe link creation; client invoices list/detail/print/pay.
Missing vs spec:
- Email invoice sending (Resend).
- CSV export for accounting.

## Phase 9+ (Calendar Integration, Analytics, HealthKit, Email, Testing, Polish)
Missing vs spec:
- Bidirectional Google Calendar sync.
- Analytics & Insights dashboards.
- HealthKit integration.
- Email system beyond auth.
- Testing coverage.
- Production polish items.

## Documentation Consistency Issues
- `STATE.md` claims Phase 6 complete and Phase 7 next; codebase does not include Phase 6/7 features.

## Next Planning Actions
- Decide priority order for Phase 2 admin user management vs Phase 6/7 health coaching.
- Reconcile `STATE.md` + `WORKLOG.md` to match actual implementation.
- Create roadmap tasks for missing client appointment detail view and admin user pages.
