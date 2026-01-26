# Work Log

## TODO (as of 2026-01-25 13:39 GMT)
- Consider adding toast notifications for global feedback (currently inline messages).

## 2026-01-25 13:30 GMT
- Initialized work log.

## 2026-01-25 13:32 GMT
- Renamed member-facing UI/components from client terminology and aligned routes to `/members`.
- Updated member actions API naming (get/create/update/delete member) and wired UI to new exports.
- Adjusted navigation and middleware route lists for member naming.

## 2026-01-25 13:39 GMT
- Added appointment backbone (actions, hooks, calendar utils) following personal-trainer-planner patterns.
- Introduced Google Calendar integration module and React Query provider.
- Added initial appointments UI (create form + list page) and supporting UI textarea component.

## 2026-01-25 13:45 GMT
- Added appointments calendar (month/week) with event cards and navigation.
- Added appointment detail view with inline edits, status updates, and calendar sync/delete actions.
- Added conflict re-checks on appointment updates.

## 2026-01-25 14:05 GMT
- Ran npm install to update package-lock.json with Google Calendar dependencies.

## 2026-01-25 14:06 GMT
- Generated STATE.md snapshot of current project status.

## 2026-01-25 14:09 GMT
- Wired calendar date selection to prefill appointment form date + repeat weekdays.
- Added inline success/error feedback for appointment create/update/sync/delete flows.

## 2026-01-25 15:04 GMT
- Updated STATE.md with latest appointment calendar wiring and feedback changes.

## 2026-01-25 15:09 GMT
- Started Phase 4 bootcamps: added CRUD + attendee actions, hooks, and bootcamp pages.
- Implemented bootcamp calendar (month/week), list view, create form, and detail attendee management.
## 2026-01-25 16:20 GMT
- Completed Phase 4 polish: added capacity warnings in bootcamp detail UI.
- Created client registration flow with actions, hooks, and UI at `/client/bootcamps`.
- Clients can now browse upcoming bootcamps and self-register/unregister.
- Fixed TypeScript build errors (server action types, session.user.id conversions).
- Phase 4 (Bootcamps) fully complete.

## 2026-01-25 16:45 GMT
- Implemented Phase 5 Cohort System:
  - Created server actions with CRUD operations, member management, coach assignment.
  - Built React Query hooks for cohorts, members, and coaches.
  - Implemented UI components: CohortForm, CohortList, CoachAssignment, MemberManagement, CohortDetail.
  - Created cohort pages at `/cohorts` and `/cohorts/[id]`.
  - Inline editing for cohort details (name, description, dates).
  - Status transitions (ACTIVE → COMPLETED → ARCHIVED).
  - Multi-coach assignment per cohort.
  - Member management with status tracking (ACTIVE/PAUSED/INACTIVE).
  - Fixed TypeScript build errors (relation naming, nullable endDate handling).
  - Installed shadcn alert-dialog component.
  - Created useMembers hook for member selection.
- Phase 5 (Cohort System) fully complete.

## 2026-01-26 06:15 GMT
- Implemented Phase 6 Invoicing & Payments (following PTP patterns with Stripe integration):
  - Extended Prisma Invoice model with payment tracking fields (paymentStatus, stripePaymentUrl, paidAt).
  - Added PaymentStatus enum (UNPAID, PAID, OVERDUE, CANCELLED).
  - Installed Stripe SDK and created stripe.ts library with payment link creation and webhook verification.
  - Created invoice server actions: getInvoices, getInvoiceById, generateInvoice, createManualInvoice, createStripePaymentLink, updateInvoicePaymentStatus, deleteInvoice, getRevenueStats.
  - Built React Query hooks for invoices with proper cache invalidation.
  - Implemented UI components: InvoiceList (with status filtering), GenerateInvoiceDialog, InvoiceDetail (with inline status updates and payment link management), RevenueChart (monthly revenue visualization with Recharts).
  - Created billing pages at `/billing` and `/billing/[id]` with admin-only access.
  - Created Stripe webhook endpoint at `/api/webhooks/stripe` to handle payment events.
  - Fixed TypeScript build errors: Decimal to number conversions, discriminated union handling, Stripe API version update.
  - Regenerated Prisma client with new schema.
- Phase 6 (Invoicing & Payments) fully complete.

## 2026-01-26 08:32 GMT
- Plan recorded for standalone interval timer PWA rebuild (see steps below).
- Plan: 1) Map interval-timer behaviors to required features. 2) Define /timer PWA route + manifest + SW + local persistence. 3) Implement timer engine + editor UI + presets + offline. 4) Update WORKLOG/STATE with progress.

## 2026-01-26 08:33 GMT
- Added plan file: `plans/interval-timer-pwa.md`.

## 2026-01-26 08:36 GMT
- Updated interval timer PWA plan with sleep/background limits, wake lock, mute toggle, and mitigation notes.

## 2026-01-26 08:51 GMT
- Started standalone interval timer PWA implementation: manifest, service worker, /timer route, timer engine, presets, and UI shell.
- Added wake lock toggle, mute toggle, and limitations panel for PWA timer accuracy guidance.
- Implemented background resync logic for timer steps on visibility changes.

## 2026-01-26 08:56 GMT
- Added interval preset editor (create, duplicate, delete, edit steps) for timer PWA.
- Wired editor into timer shell and shared timer state.

## 2026-01-26 09:01 GMT
- Added preset import/export UI with JSON editor and file import/export for timer PWA.

## 2026-01-26 09:34 GMT
- Testing-only: ran local Postgres migration `init` against centurion_dev and generated Prisma Client. (No code changes.)

## 2026-01-26 09:36 GMT
- Added missing /client/dashboard page to resolve login redirect 404s for client users.

## 2026-01-26 09:52 GMT
- (Codex) Started client-facing Phase 3/5/6 plan + implementation. Plan saved to plans/phase3-5-6-client-pages.md.

## 2026-01-26 09:59 GMT
- (Codex) Implemented client-facing pages for Phases 3/5/6: /appointments/me calendar, /cohorts/me read-only, /invoices/me list+detail with print/pay.
- (Codex) Added /client/* redirects to /.../me routes and client-side invoice payment link action.

## 2026-01-26 10:14 GMT
- (Codex) Added placeholder client pages for /client/health and /client/settings to prevent 404s.
