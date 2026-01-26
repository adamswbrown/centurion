# Centurion State

Last updated: 2026-01-26 08:51 GMT

## Project Summary
- Unified fitness platform combining Personal Trainer Planner (appointments, bootcamps, invoicing) and CoachFit (cohorts, health data).
- **Phase 6 (Invoicing & Payments) complete**. Ready for Phase 7: Check-In System.
- Interval timer PWA (standalone `/timer`) implementation in progress.

## What’s Implemented
- Member management aligned to spec naming (members, not clients): list, detail, create/edit/delete.
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
- Stripe integration: `src/lib/stripe.ts`
- Stripe webhook: `src/app/api/webhooks/stripe/route.ts`
- Calendar utilities: `src/lib/calendar.ts`
- Google Calendar: `src/lib/google-calendar.ts`
- Work log: `WORKLOG.md`
- Timer PWA:
  - `src/app/timer/page.tsx`
  - `src/app/timer/TimerSwRegister.tsx`
  - `src/app/timer/limitations.tsx`
  - `src/features/timer/TimerShell.tsx`
  - `src/features/timer/TimerEditor.tsx`
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

## Environment / Dependencies
- `google-auth-library` + `googleapis` for Calendar sync (lockfile updated).
- `stripe` for payment processing and webhook handling.
- `recharts` for revenue data visualization.
- React Query provider registered in `src/app/layout.tsx` via `src/app/providers.tsx`.
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (for production deployments).

## Open TODOs
- Consider adding global toast notifications for feedback (currently inline messages).
- Begin Phase 7: Daily Check-In System (cohort check-ins with configured prompts).
- Timer PWA: add interval editor UI + preset management; optional notification support.

## How to Run
- `npm run dev`

## Recent Commits
- `refactor: align members naming and routes`
- `feat: start appointments scheduling backbone`
- `feat: add appointments calendar and detail view`
- `chore: update lockfile after deps install`
- `feat: wire calendar selection and feedback`
