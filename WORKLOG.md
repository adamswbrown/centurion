

## [In Progress]
- HealthKit integration planning

## 2026-01-26 17:00 GMT - Reports Dashboard & Review Queue Implementation
### Reports Dashboard (Task 1)
- Created comprehensive reports server actions (`src/app/actions/reports.ts`) with multi-domain analytics:
  - Dashboard overview with growth metrics
  - Member engagement reports (check-ins, activity trends, status distribution)
  - Cohort analytics (performance, engagement rates)
  - Revenue reports (monthly breakdown, top clients, invoice status)
  - Compliance reports (questionnaire completion rates)
  - Export functionality (CSV and JSON formats)
- Created React Query hooks (`src/hooks/useReports.ts`) with 5-minute stale time
- Built UI components (`src/features/reports/`):
  - OverviewCards: Summary metrics with growth indicators
  - MemberEngagementChart: Check-in trends with Recharts visualization
  - CohortAnalytics: Cohort performance table and engagement chart
  - RevenueAnalytics: Monthly revenue chart, invoice status, top clients
  - ComplianceReport: Questionnaire completion by week and cohort
  - ExportButton: CSV/JSON download for individual reports
  - ReportsDashboard: Tabbed interface with role-based access
- Updated `/reports` page with full dashboard implementation
- Role-based access: Admin sees all data, Coach sees cohort-filtered data

### Coach Notes & Review Queue (Task 2)
- Added WeeklyCoachResponse model to Prisma schema with unique constraint
- Created review queue server actions (`src/app/actions/review-queue.ts`):
  - getWeeklySummaries: Client list with weekly stats and attention scores
  - getWeeklyResponse/saveWeeklyResponse: Coach feedback CRUD
  - getReviewQueueSummary: Summary counts by priority
  - getCoachCohorts: Cohort filter options
- Created email draft utility (`src/lib/email-draft.ts`) for weekly feedback
- Created React Query hooks (`src/hooks/useReviewQueue.ts`)
- Built ReviewQueueDashboard (`src/features/review-queue/ReviewQueueDashboard.tsx`):
  - Week navigation (previous/next/current)
  - Cohort and priority filters
  - Client table with attention score badges
  - Expandable review panel with stats and feedback form
  - Loom URL and note input with save functionality
  - Email draft copy button
- Created `/coach/review-queue` page with requireCoach() protection
- Added Tabs component (`src/components/ui/tabs.tsx`) using Radix UI

### Dependencies Added
- @radix-ui/react-tabs for tab navigation

### Build Verified
- All 31 routes compile successfully
- TypeScript types validated

## 2026-01-26 16:10 GMT
- Completed admin user management accessibility polish:
  - Added ARIA labels to all checkboxes (select all, row selection)
  - Added aria-label to bulk role select dropdown
  - Added role="alert" and aria-live="assertive" to error messages
  - Added role="search" and type="search" to user search form
  - Added aria-label to search and clear buttons
  - Added aria-busy to loading buttons in delete dialog
- Implemented Settings Pages:
  - Created src/app/actions/settings.ts with server actions for system and user settings
  - Created /admin/settings page with SystemSettingsForm for admin configuration
  - Updated /settings page with UserSettingsForm for user profile management
  - Settings include: maxClientsPerCoach, healthkitEnabled, iosIntegrationEnabled, macro percentages
  - User settings include: name, email, password change, credits display
  - All forms have proper ARIA labels, error handling, and accessibility
- Build verified: All 30 routes compile successfully

## [Done]
- User management/admin flows: Complete (CRUD, bulk, delete, audit logging)
- Combined calendar + credits system: Complete (backend, API, UI)
- Daily check-in system (CoachFit baseline):
  - Confirmed Entry model, CRUD actions, and UI match CoachFit/PTP baseline
  - Implemented CheckInStats component for streak/compliance display
  - Integrated CheckInStats UI into client dashboard above check-in form, fetching stats from /api/clients/[id]/weekly-summary
  - Users now see streak, compliance %, and total check-ins at a glance
- Cohort analytics:
  - Backend action for check-in compliance, streaks, participation (src/app/actions/cohort-analytics.ts)
  - CohortAnalytics UI component integrated in cohort detail view for admin/coach (src/features/cohorts/CohortAnalytics.tsx)

## [Done]
- User management/admin flows: Complete (CRUD, bulk, delete, audit logging)
- Combined calendar + credits system: Complete (backend, API, UI)
- Daily check-in system (CoachFit baseline):
  - Confirmed Entry model, CRUD actions, and UI match CoachFit/PTP baseline
  - Implemented CheckInStats component for streak/compliance display
  - Added CheckInStats to client health page above form/history


## TODO (as of 2026-01-26)

# Work Log

## TODO (as of 2026-01-25 13:39 GMT)

## 2026-01-25 13:30 GMT

## 2026-01-25 13:32 GMT
## 2026-01-26 13:30 GMT
  - Added credits consumption/refund logic to bootcamp attendee actions (decrement on register, refund if removed before start).
  - Added optional credits expiry field to User model.
  - Created unified API endpoint and React Query hook for fetching both appointments and bootcamps for calendar views.
  - Added new UnifiedCalendar component to display both event types with color coding and filtering support.

## 2026-01-25 13:45 GMT
## 2026-01-25 14:05 GMT
- Ran npm install to update package-lock.json with Google Calendar dependencies.
## 2026-01-25 14:09 GMT
- Wired calendar date selection to prefill appointment form date + repeat weekdays.
- Added inline success/error feedback for appointment create/update/sync/delete flows.

## 2026-01-25 15:04 GMT
- Updated STATE.md with latest appointment calendar wiring and feedback changes.

## 2026-01-25 15:09 GMT
## 2026-01-26: Remediation Progress
 - Added Invoice, Payment, and Revenue models to Prisma schema for financial tracking and reporting. Ran migration and updated Prisma client.
 - Implemented real revenue aggregation in getMonthlyRevenueCSV (csv-export.ts): queries paid invoices, groups by month, formats as CSV, UK tax year logic.
 - Polished ExportCSVDialog UI: accessibility (ARIA labels, keyboard navigation), error handling, mobile responsiveness, and edge case handling.

## 2026-01-26: Test Coverage Added
- Created CoachFit/tests/credits-calendar.spec.ts for unit/integration tests of credits logic and calendar sync.
- Tests cover: credits consumption, refund, expiry, and calendar event sync (success/failure cases).
- Next: Expand test coverage for edge cases and failure modes; continue with check-in and analytics tests.
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

## 2026-01-26 11:30 GMT
- Implemented Phase 7 & 8: Daily Check-In System and Weekly Questionnaires (following CoachFit patterns):
  - Created server actions for entries (getEntries, getEntryByDate, upsertEntry, getCheckInConfig, updateCheckInConfig, getCheckInStats).
  - Created server actions for questionnaires (getQuestionnaireBundle, getQuestionnaireBundles, createQuestionnaireBundle, updateQuestionnaireBundle, getQuestionnaireResponse, upsertQuestionnaireResponse, getWeeklyResponses).
  - Implemented React Query hooks for entries and questionnaires with proper cache invalidation.
  - Created UI components: CheckInForm, CheckInHistory for daily check-ins.
  - Created UI components: QuestionnaireViewer, QuestionnaireResponseList for weekly questionnaires.
  - Updated /client/health page with check-in form and history.
  - Created /client/questionnaires/[cohortId]/[weekNumber] page for member questionnaire completion.
  - Fixed TypeScript build errors: session.user.id type conversions, Prisma relation names, unique constraint ordering.
  - Note: Full SurveyJS integration pending - current questionnaire components show placeholder structure.
- Phase 7 (Daily Check-In System) and Phase 8 (Weekly Questionnaires) core functionality complete.

## 2026-01-26 12:00 GMT
- Comprehensive testing validation and fixes:
  - Fixed middleware: Added /cohorts to coach routes, /billing to admin routes for proper access control.
  - Fixed navigation: Removed broken links (/admin/users, /reports, /settings) from Sidebar and MobileNav.
  - Updated admin navigation: "Invoices" → "Billing", coaches use "/invoices/me".
  - Removed unused icon imports (FileText, Settings, UserCog) from navigation components.
  - Created comprehensive test data seed script (testing/seed-test-data.ts) with 7 users, 3 cohorts, 14 days check-ins, questionnaires, appointments, bootcamps, invoices.
  - Created testing documentation: TEST_PLAN.md (comprehensive), QUICK_TEST.md (smoke test), TESTING_INSTRUCTIONS.md (user guide), README.md.
  - Verified TypeScript build passes after all changes.
- Testing infrastructure complete and ready for UI validation.

## 2026-01-26 12:30 GMT
- Implemented CoachFit baseline questionnaire templates:
  - Ported all 6 weeks of production questionnaire templates from CoachFit to Centurion.
  - Created src/lib/default-questionnaire-templates.ts with complete SurveyJS JSON templates.
  - Each week includes: wins, challenges, training days, steps compliance, calorie adherence, nutrition help, behavior goals.
  - Week 1 focuses on goal setting, weeks 2-6 include behavior goal review, week 4 has monthly reflection, week 6 has program completion questions.
  - Added utility functions: getTemplateForWeek(weekNumber) and getAvailableWeeks().
  - Updated seed script (testing/seed-test-data.ts) to import and use proper baseline templates instead of placeholders.
  - Updated questionnaire responses in seed data to match actual CoachFit template structure with realistic client responses.
  - Fixed TypeScript return type inference issue in getTemplateForWeek function.
  - Verified build passes with all template changes.
- CoachFit baseline questionnaires fully implemented and integrated into test data.

## 2026-01-26 11:16 GMT
- (Codex) Updated testing/VALIDATION_SUMMARY.md to reflect the consolidated implementation scope (PTP + CoachFit baselines).
- (Codex) Preparing implementation plan for platform gaps per updated scope.

## 2026-01-26 11:26 GMT
- (Codex) Implemented Phase 1 admin user management routes (/admin/users, /admin/users/[id]) with search and detail editing.


## 2026-01-26 13:00 GMT
- (Copilot) Implemented admin user deletion (single and bulk), bulk actions (delete, role change), and auto-logging:
  - Added deleteAdminUser and bulkAdminUserAction server actions with audit logging for all admin user management actions.
  - Updated UserTable UI to support row selection, bulk delete, and bulk role change with confirmation and feedback.
  - Added DeleteUserButton component for single user deletion with confirmation dialog.
  - All admin user management actions now log to the AuditLog model for traceability.

## 2026-01-26 13:45 GMT
- (Claude) Completed missing functionality implementation across three major areas:
  - **Phase 1 - SurveyJS Integration**: Implemented dynamic questionnaire rendering using open-source SurveyJS v2.5.6.
    - Created src/lib/surveyjs-config.ts with custom theme matching Centurion design system.
    - Created src/components/questionnaires/SurveyContainer.tsx wrapper component with event handling.
    - Updated QuestionnaireViewer.tsx to replace placeholder with actual survey rendering.
    - Supports read-only mode for completed questionnaires, auto-save detection, and theme customization.
    - Build verified: /client/questionnaires/[cohortId]/[weekNumber] route compiles successfully.
  - **Phase 2 - Admin User Management**: Completed admin user management UI (already partially implemented).
    - Added "Users" navigation link to Sidebar and MobileNav with UserCog icon.
    - Fixed type errors in audit logging (session.id string to number conversion).
    - Fixed ErrorBoundary client component directive.
    - Verified /admin/users and /admin/users/[id] routes compile and are protected with requireAdmin().
  - **Phase 3 - Coach Analytics & Insights**: Implemented attention score algorithm and coach dashboard.
    - Created src/app/actions/coach-analytics.ts with attention score calculation (Check-ins 40%, Questionnaires 30%, Sentiment 30%).
    - Created src/hooks/useCoachAnalytics.ts with React Query hooks (5-min stale time, 10-min auto-refresh).
    - Created src/components/coach/AttentionScoreCard.tsx for visual score display with color-coded priorities.
    - Created src/components/coach/CoachDashboard.tsx with member prioritization and summary statistics.
    - Created src/components/coach/MemberCheckInList.tsx for detailed check-in history.
    - Created src/components/coach/WeeklyQuestionnaireReport.tsx for completion tracking.
    - Integrated CoachDashboard into /dashboard page (conditional render for COACH role).
    - All server actions protected with requireCoach(), automatic data scoping to coach's cohorts.
- All work tagged as Claude implementation, verified build passes for all 29 routes.
