### Features Complete
- User management/admin flows (CRUD, bulk, delete, audit logging)
- Combined calendar + credits system (backend, API, UI)
- Daily check-in system (CoachFit baseline): CRUD, compliance, streaks, UI, stats display


### Features Complete
- User management/admin flows (CRUD, bulk, delete, audit logging)
- Combined calendar + credits system (backend, API, UI)
- Daily check-in system (CoachFit baseline): CRUD, compliance, streaks, UI, stats display
- Cohort analytics: Backend and UI for compliance, streaks, participation (admin/coach dashboard)


- Admin UI polish: Toast notification support and error boundary coverage added (global feedback, resilience)

### Features Next Up
- Admin UI polish
- Reports
- Settings

### Features Next Up
- Cohort analytics (CoachFit baseline)
- Admin UI polish
- Reports
- Settings
# Centurion State

Last updated: 2026-01-26 11:35 GMT

## Project Summary
- Unified fitness platform combining Personal Trainer Planner (appointments, bootcamps, invoicing) and CoachFit (cohorts, health data).
- **Phase 7 (Daily Check-In System) and Phase 8 (Weekly Questionnaires) complete**. Ready for Phase 9: Health Data Tracking.
- Interval timer PWA (standalone `/timer`) implementation complete.

## What’s Implemented
- Member management aligned to spec naming (members, not clients): list, detail, create/edit/delete.
- (Copilot) Admin user management now supports user deletion (single and bulk), bulk actions (delete, role change), and audit logging for all admin actions.
- Appointment scheduling backbone:
  - Server actions with conflict detection and Google Calendar sync.
  - React Query hooks for create/update/delete/sync.
  - Calendar utilities for date filters and repeating dates.
- Appointments UI:
  - Create form + list view at `/appointments`.
  - Calendar view (month + week) with event cards.
  - Calendar selection pre-fills appointment date and repeat weekdays.
  - Detail/edit view at `/appointments/[id]` with status updates, inline edits, sync/delete actions.
  - Inline success/error feedback for create/update/sync/delete.
- Bootcamp system (Phase 4 ✅):
  - CRUD actions and attendee management with capacity checks.
  - Bootcamp hooks and pages.
  - Bootcamp calendar (month/week), list view, create form, and detail attendee management.
  - Capacity warnings in coach UI (at-capacity alerts, spot count indicators).
  - Client registration flow: `/client/bootcamps` page with browse/register/unregister functionality.
- Cohort system (Phase 5 ✅):
  - CRUD actions for cohorts with validation (name uniqueness, date validation).
  - Multi-coach assignment per cohort.
  - Member management with status tracking (ACTIVE/PAUSED/INACTIVE).
  - Status transitions (ACTIVE → COMPLETED → ARCHIVED).
  - Cohort list with status filtering.
  - Cohort detail page with inline editing for name, description, dates.
  - Coach assignment UI with add/remove functionality.
  - Member management UI with status changes and timestamps.
- Daily Check-In System (Phase 7 ✅):
  - Entry actions: getEntries, getEntryByDate, upsertEntry (following CoachFit patterns).
  - Check-in config actions: getCheckInConfig, updateCheckInConfig (cohort-specific prompts).
  - Check-in stats: getCheckInStats (streak calculation, compliance tracking).
  - React Query hooks for entries with cache invalidation.
  - CheckInForm component with weight, steps, calories, sleep quality, perceived stress, notes.
  - CheckInHistory component with table view of past entries.
  - Member check-in page at `/client/health` with form and history.
  - Upsert pattern for one entry per user per day (userId_date unique constraint).
- Weekly Questionnaires (Phase 8 ✅):
  - Questionnaire bundle actions: getQuestionnaireBundle, getQuestionnaireBundles, createQuestionnaireBundle, updateQuestionnaireBundle.
  - Response actions: getQuestionnaireResponse, upsertQuestionnaireResponse, getWeeklyResponses.
  - Week-based access control (current week calculation from cohort startDate).
  - Status locking: IN_PROGRESS → COMPLETED (cannot edit after submission).
  - Week locking: cannot access future weeks, cannot edit past weeks.
  - React Query hooks for questionnaires with cache invalidation.
  - QuestionnaireViewer component for members (placeholder for SurveyJS integration).
  - QuestionnaireResponseList component for coaches to view all responses.
  - Member questionnaire page at `/client/questionnaires/[cohortId]/[weekNumber]`.
  - Note: Full SurveyJS integration pending - current implementation shows structure.
- Invoicing & Payments (Phase 6 ✅):
  - Extended Invoice model with payment tracking (paymentStatus, stripePaymentUrl, paidAt).
  - PaymentStatus enum (UNPAID, PAID, OVERDUE, CANCELLED).
  - Stripe integration library with payment link creation and webhook verification.
  - Invoice actions: auto-generate from ATTENDED appointments, manual creation, CRUD operations, payment link creation, revenue stats.
  - Invoice hooks with React Query for data fetching and mutations.
  - Invoice UI: list with status filtering, generate dialog, detail with inline status updates.
  - Revenue chart showing monthly revenue with year selector (Recharts).
  - Stripe webhook endpoint at `/api/webhooks/stripe` for payment event handling.
  - Billing pages at `/billing` and `/billing/[id]` (admin-only access).
- Google Calendar integration module using service account credentials.
- Interval timer PWA (standalone):
  - `/timer` route with timer engine, presets, and UI shell.
  - Wake Lock toggle, mute toggle, and limitations guidance.
  - Service worker + manifest for installability.
  - Preset editor with step add/remove, duplicate, and save.

## Key Files
- Spec: `unified-platform-spec.md`
- Member actions: `src/app/actions/members.ts`
- Appointment actions: `src/app/actions/appointments.ts`
- Appointment hooks: `src/hooks/useAppointments.ts`
- Entry actions: `src/app/actions/entries.ts`
- Entry hooks: `src/hooks/useEntries.ts`
- Questionnaire actions: `src/app/actions/questionnaires.ts`
- Questionnaire hooks: `src/hooks/useQuestionnaires.ts`
- Appointment UI:
  - `src/app/appointments/page.tsx`
  - `src/app/appointments/[id]/page.tsx`
  - `src/features/appointments/AppointmentDashboard.tsx`
  - `src/features/appointments/AppointmentForm.tsx`
  - `src/features/appointments/AppointmentList.tsx`
  - `src/features/appointments/AppointmentCalendar.tsx`
  - `src/features/appointments/AppointmentCard.tsx`
  - `src/features/appointments/AppointmentDetail.tsx`
- Bootcamp actions: `src/app/actions/bootcamps.ts`, `src/app/actions/client-bootcamps.ts`
- Bootcamp hooks: `src/hooks/useBootcamps.ts`, `src/hooks/useClientBootcamps.ts`
- Bootcamp UI:
  - `src/app/bootcamps/page.tsx` (coach)
  - `src/app/bootcamps/[id]/page.tsx` (coach detail)
  - `src/app/client/bootcamps/page.tsx` (client registration)
  - `src/features/bootcamps/BootcampForm.tsx`
  - `src/features/bootcamps/BootcampList.tsx`
  - `src/features/bootcamps/BootcampCalendar.tsx`
  - `src/features/bootcamps/BootcampDetail.tsx` (with capacity warnings)
  - `src/features/bootcamps/BootcampRegistration.tsx` (client view)
- Cohort actions: `src/app/actions/cohorts.ts`
- Cohort hooks: `src/hooks/useCohorts.ts`, `src/hooks/useMembers.ts`
- Cohort UI:
  - `src/app/cohorts/page.tsx` (coach/admin)
  - `src/app/cohorts/[id]/page.tsx` (cohort detail)
  - `src/features/cohorts/CohortForm.tsx`
  - `src/features/cohorts/CohortList.tsx`
  - `src/features/cohorts/CohortDetail.tsx` (with inline editing)
  - `src/features/cohorts/CoachAssignment.tsx` (multi-coach management)
  - `src/features/cohorts/MemberManagement.tsx` (status tracking)
- Invoice actions: `src/app/actions/invoices.ts`
- Invoice hooks: `src/hooks/useInvoices.ts`
- Invoice UI:
  - `src/app/billing/page.tsx` (admin billing dashboard)
  - `src/app/billing/[id]/page.tsx` (invoice detail)
  - `src/features/invoices/InvoiceList.tsx` (with status filtering)
  - `src/features/invoices/GenerateInvoiceDialog.tsx`
  - `src/features/invoices/InvoiceDetail.tsx` (with payment link management)
  - `src/features/invoices/RevenueChart.tsx` (monthly revenue visualization)
- Entry UI:
  - `src/app/client/health/page.tsx` (member check-in page)
  - `src/features/entries/CheckInForm.tsx` (daily check-in form)
  - `src/features/entries/CheckInHistory.tsx` (past entries table)
- Questionnaire UI:
  - `src/app/client/questionnaires/[cohortId]/[weekNumber]/page.tsx` (member questionnaire page)
  - `src/features/questionnaires/QuestionnaireViewer.tsx` (questionnaire viewer with locking)
  - `src/features/questionnaires/QuestionnaireResponseList.tsx` (coach response view)
- Stripe integration: `src/lib/stripe.ts`
- Stripe webhook: `src/app/api/webhooks/stripe/route.ts`
- Calendar utilities: `src/lib/calendar.ts`
- Google Calendar: `src/lib/google-calendar.ts`
- Work log: `WORKLOG.md`
- Client-facing pages (PTP-style):
  - `/appointments/me` (calendar)
  - `/cohorts/me` (read-only memberships)
  - `/invoices/me` and `/invoices/me/[id]` (list/detail, print, pay)
  - `/client/appointments`, `/client/cohorts`, `/client/invoices` redirect to `/.../me`
  - `/client/health` and `/client/settings` placeholders added (coming soon)
- Timer PWA:
  - `src/app/timer/page.tsx`
  - `src/app/timer/TimerSwRegister.tsx`
  - `src/app/timer/limitations.tsx`
  - `src/features/timer/TimerShell.tsx`
  - `src/features/timer/TimerEditor.tsx`
  - `src/features/timer/TimerPresetImportExport.tsx`
  - `src/features/appointments/ClientAppointmentsCalendar.tsx`
  - `src/app/appointments/me/page.tsx`
  - `src/app/cohorts/me/page.tsx`
  - `src/app/invoices/me/page.tsx`
  - `src/app/invoices/me/[id]/page.tsx`
  - `src/app/client/appointments/page.tsx`
  - `src/app/client/cohorts/page.tsx`
  - `src/app/client/invoices/page.tsx`
  - `src/app/actions/client-appointments.ts`
  - `src/app/actions/client-cohorts.ts`
  - `src/app/actions/client-invoices.ts`
  - `src/hooks/useClientAppointments.ts`
  - `src/hooks/useClientCohorts.ts`
  - `src/hooks/useClientInvoices.ts`
  - `src/features/timer/useIntervalTimer.ts`
  - `src/features/timer/presets.ts`
  - `src/features/timer/types.ts`
  - `public/manifest.json`
  - `public/timer-sw.js`
  - `public/timer-icon-192.png`, `public/timer-icon-512.png`

## Data Model Notes
- Prisma Appointment model uses `startTime`, `endTime`, `fee`, `status`, optional `googleEventId`, `invoiceId`.
- Conflict checks enforced on create and update for overlapping sessions per member.
- Bootcamp attendee capacity enforced when adding attendees.
- Cohort model with `status` (ACTIVE/COMPLETED/ARCHIVED), optional `endDate`, multi-coach support.
- CohortMembership tracks member status (ACTIVE/PAUSED/INACTIVE) with `joinedAt`/`leftAt` timestamps.
- Invoice model with `paymentStatus` (UNPAID/PAID/OVERDUE/CANCELLED), `stripePaymentUrl`, `paidAt` timestamp.
- Invoices auto-generate from ATTENDED appointments, linking appointments via `invoiceId`.
- Entry model with `userId_date` unique constraint (one entry per user per day), JSON fields for `customResponses` and `dataSources`.
- QuestionnaireBundle model with `cohortId_weekNumber` unique constraint, `questions` JSON field for SurveyJS format.
- WeeklyQuestionnaireResponse model with `userId_bundleId` unique constraint, `responses` JSON, `status` enum (IN_PROGRESS/COMPLETED).
- CohortCheckInConfig model with `cohortId` unique, `prompts` JSON field for custom check-in prompts.

## Environment / Dependencies
- `google-auth-library` + `googleapis` for Calendar sync (lockfile updated).
- `stripe` for payment processing and webhook handling.
- `recharts` for revenue data visualization.
- React Query provider registered in `src/app/layout.tsx` via `src/app/providers.tsx`.
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (for production deployments).

## Open TODOs
- Consider adding global toast notifications for feedback (currently inline messages).
- Add SurveyJS integration for full questionnaire functionality (survey-core, survey-react-ui packages).
- Begin Phase 9: Health Data Tracking (HealthKit integration, metrics tracking).
- Add coach analytics views for member check-in data and questionnaire responses.

## How to Run
- `npm run dev`

## Recent Commits
- `refactor: align members naming and routes`
- `feat: start appointments scheduling backbone`
- `feat: add appointments calendar and detail view`
- `chore: update lockfile after deps install`
- `feat: wire calendar selection and feedback`
