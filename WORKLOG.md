## 2026-01-28 — Session/Cohort Decoupling UI Refactor Complete

Completed the full session/cohort decoupling refactor:

**Bug Fix:**
- Fixed critical ordering bug in `registerForSession()` where cohort access check referenced `userId` and `classSession` before they were defined (moved check after auth + session fetch)
- Added null classTypeId bypass (sessions without a class type are open to all)

**UI Refactor:**
- Removed unused `cohorts` prop from `SessionForm.tsx`
- Created `SessionAccessManager` component for admin cohort detail page (checkbox list of class types)
- Created `cohort-session-access.ts` server actions (`getCohortSessionAccess`, `setCohortSessionAccess`)
- Created `useCohortSessionAccess.ts` React Query hook
- Wired `SessionAccessManager` into `CohortDetail.tsx`

**Data Migration:**
- Created `scripts/backfill-cohort-session-access.ts` to populate join table from historical `ClassSession.cohortId` data

**Testing:**
- Updated `sessions.test.ts`: Fixed cohortId filter test to use CohortSessionAccess mock, removed cohortId from create/update/recurring tests
- Updated `session-registration.test.ts`: Added 3 new cohort access tests (no cohort membership, no access, null classTypeId bypass)
- Added `cohortSessionAccess` model to Prisma mock
- All 1632 tests passing, build clean
# 2026-01-28

## Session & Cohort Decoupling Architecture Refactor

- Refactored Prisma schema to decouple sessions from cohorts, making sessions global and introducing CohortSessionAccess join table for cohort-based visibility.
- Applied safe migration and verified schema with `prisma migrate dev`.
- Updated all session queries to use global sessions and filter by cohort visibility using CohortSessionAccess.
- Refactored registration logic to check both cohort access (via CohortSessionAccess) and membership entitlement, ensuring independence.
- Updated business logic to remove all cohort-session coupling.
- Next: update UI and backfill join table for legacy data.
# 2026-01-27

## Role Switcher Implementation

Implemented admin/coach view mode switcher (from CoachFit's RoleContext pattern).

### Changes
- **Created `src/contexts/ViewModeContext.tsx`**: React Context providing `viewMode` (admin/coach), `effectiveNavRole`, `canSwitch`, and `setViewMode`. Persists selection in localStorage under `centurion-view-mode`. Only ADMIN users can switch.
- **Created `src/components/layouts/ViewModeSwitcher.tsx`**: Select dropdown with Shield/Users icons for "Admin View" / "Coach View". Only renders when `canSwitch` is true.
- **Modified `src/components/layouts/AppLayout.tsx`**: Wrapped layout in `ViewModeProvider` passing `session.user.role`.
- **Modified `src/components/layouts/Sidebar.tsx`**: Uses `effectiveNavRole` from context for nav item selection. Renders `ViewModeSwitcher` below heading.
- **Modified `src/components/layouts/MobileNav.tsx`**: Same changes as Sidebar.

### Coach Analytics Admin-Awareness
- Updated `getCoachInsights()` and `getCoachCohortMembers()` in `coach-analytics.ts`: admin sees all active cohorts, coach sees only assigned cohorts.
- Dashboard shows CoachDashboard for both admin and coach roles.

### Member Detail Tabbed Interface
- Rewrote `src/features/members/MemberDetail.tsx` with tabbed interface (Overview, Check-Ins, Questionnaires, Appointments).
- Added questionnaire response viewer dialog with human-readable labels.

### Seed Data Enhancement
- Expanded check-in entries from 14 days/2 clients to 42+ days/4 clients with realistic patterns (88 entries total).

### Build Verification
- `npm run build` passes successfully with no errors.

---

# 2026-01-27
## Cross-Platform Feature Audit: CoachFit + PTP vs Centurion

Ran comprehensive 3-way audit using parallel Explore agents against CoachFit, PTP (Personal Trainer Planner), and Centurion codebases.

### Audit Results Summary
- **~65 features fully implemented** in Centurion
- **~10 features where Centurion exceeds** source apps (Google OAuth, 3 roles, conflict detection, Stripe payments, capacity enforcement)
- **~23 feature gaps** identified

### Critical Gaps (HIGH Priority)
1. **Password reset flow (email token)** - PTP has forgot/reset token flow; Centurion only has in-settings password change
2. **User goals/targets** - CoachFit has UserGoals model (target weight, calories, macros, steps, workout mins); Centurion missing
3. **User preferences** - CoachFit has weight unit (lbs/kg), date format; Centurion missing
4. **Extended system settings** - CoachFit has 50+ configurable params (calorie limits, macro defaults, body fat categories, step categories, protein ranges); Centurion has basic settings
5. **Email template admin editor** - CoachFit has DB-stored templates with admin CRUD UI + preview; Centurion has code-defined templates
6. **Account deletion + data export (GDPR)** - CoachFit has both; Centurion missing
7. **Consent management** - CoachFit has UserConsent model (terms, privacy, DPA, marketing opt-in); Centurion missing
8. **Cohort types** - CoachFit has 4 enum types (TIMED/ONGOING/CHALLENGE/CUSTOM) + admin-created custom types; Centurion partial
9. **Check-in frequency (3-level override)** - CoachFit supports global default → cohort override → user override; Centurion partial

### Medium Gaps
1. **Workout CRUD** (PTP) - Standalone exercise tracking separate from appointments
2. **Billing email** (PTP) - Separate billingEmail field for invoicing
3. **Body fat percentage** (CoachFit) - Missing from entry fields
4. **Fitness Wrapped / Year-in-Review** (CoachFit) - Annual stats with fun conversions
5. **Role switcher** (CoachFit) - Multi-role users can't switch views
6. **Apple OAuth** (CoachFit) - Missing sign-in provider
7. **Entry height storage** (CoachFit) - Per-entry height tracking
8. **BMI calculation + unit conversions** (CoachFit)

### Low Gaps
1. Appointment video URL (PTP)
2. Dynamic forms / Contentful CMS (PTP)
3. Sentry error monitoring (PTP)
4. Vercel Analytics (PTP)
5. Health check endpoint (PTP)
6. Fetch retry with exponential backoff (CoachFit)
7. HealthKit profile ingestion (CoachFit)
8. Cohort migration tracking (CoachFit)

### Where Centurion Exceeds Source Apps
- Google OAuth (PTP has none)
- 3 roles (PTP only has admin/user)
- Appointment conflict/overlap detection (PTP lacks this)
- Bootcamp capacity enforcement (PTP lacks this)
- Stripe payment integration for invoices (PTP has plain email only)
- Invoice payment status tracking (UNPAID/PAID/OVERDUE/CANCELLED)
- CSV + JSON export (PTP has CSV only)
- Week 6 questionnaire template (CoachFit has 1-5 only)
- 14 email template types (CoachFit has 7)
- Decimal precision for fees (PTP uses integer pence)

---

# 2026-01-26
Seed script completed successfully. Test accounts created:

ADMIN:
  Email: admin@centurion.test
  Password: password123

COACHES:
  Email: coach@centurion.test (Sarah Coach)
  Email: coach2@centurion.test (Mike Coach)
  Password: password123

CLIENTS:
  Email: client1@centurion.test (Alice - Active, many check-ins)
  Email: client2@centurion.test (Bob - Active, few check-ins)
  Email: client3@centurion.test (Charlie - Paused)
  Email: client4@centurion.test (Diana - New)
  Password: password123

Appointments and bootcamps seeded from TeamUp and test data. All flows verified.
# 2026-01-26
- Added `title` field to Appointment model in Prisma schema for TeamUp compatibility and usability.
- Updated all relevant UI and backend logic to support appointment titles.
## 2026-01-26 - Fix Remaining CRITICAL and HIGH Priority Audit Gaps

Addressed remaining gaps identified in audit.

### Task 1: Email Template COACH_NOTE_RECEIVED - ALREADY COMPLETE
- Template already exists at lines 285-295 in `src/lib/email-templates.ts`
- Subject: "New Note from {{coachName}}"
- Body includes userName, coachName, and loginUrl tokens
- No changes needed

### Task 2: useReviewQueue Hooks - ALREADY COMPLETE
- All 5 hooks fully implemented in `src/hooks/useReviewQueue.ts`:
  - `useWeeklySummaries(weekStart?, cohortId?)` - Lines 19-25
  - `useWeeklyResponse(clientId, weekStart)` - Lines 28-34
  - `useSaveWeeklyResponse()` - Lines 37-58
  - `useReviewQueueSummary(weekStart?)` - Lines 61-67
  - `useCoachCohorts()` - Lines 70-76
- No changes needed

### Task 3: Add deleteEntry Action - IMPLEMENTED
- Added `deleteEntry(entryId)` server action to `src/app/actions/entries.ts`
- Ownership verification: only entry owner can delete
- Returns `{ success: true }` on completion
- Added `useDeleteEntry()` hook to `src/hooks/useEntries.ts`
- Hook properly invalidates entries, entry, and checkInStats queries

### Task 4: HealthKit Data Explorer - ALREADY COMPLETE
- Component at `src/features/healthkit/HealthDataExplorer.tsx` displays:
  - Workouts: type, duration, calories, distance, heart rate
  - Sleep: date, total sleep, in-bed time, deep sleep, REM sleep
  - Steps: daily totals from HealthKit-sourced entries
- All data source indicators present via dataSources field

### Task 5: WeeklyCoachResponse Schema Constraint - ALREADY COMPLETE
- `@@unique([coachId, clientId, weekStart])` constraint exists at line 608
- Ensures one response per coach per client per week
- No changes needed

### Build Verification
- `npm run build` passes successfully (39 routes)
- All TypeScript types validated

---

## 2026-01-26 - Batch 4: Build Remaining Features to Close All Gaps

Executed Batch 4 to close remaining feature gaps in Centurion platform.

### Task 1: Appointment Conflict Detection - VERIFIED EXISTING
- Conflict detection already exists and works correctly:
  - `createAppointment` (lines 133-150): Queries existing appointments within date range, filters for actual overlaps using `hasOverlap()` helper
  - `updateAppointment` (lines 307-319): Checks for conflicts excluding the current appointment being updated
  - Both use the overlap algorithm: `aStart < bEnd && aEnd > bStart`
- No changes needed - implementation is complete and robust

### Task 2: Bootcamp Capacity Enforcement - VERIFIED EXISTING
- Capacity enforcement already exists at lines 140-142 in `src/app/actions/bootcamps.ts`:
  - Fetches bootcamp with attendee count
  - Checks `if (bootcamp.capacity && bootcamp.attendees.length >= bootcamp.capacity)`
  - Throws error "Bootcamp is at capacity" when full
- Credit consumption (line 150) and refund logic (line 173) also working
- No changes needed - implementation is complete

### Task 3: HealthKit Auto-Entry for Entries
- Updated `src/app/actions/entries.ts`:
  - Added `getHealthKitDataForDate()` function to fetch HealthKit data
  - Derives steps from walking/running workouts (1300 steps/km walking, 1200 steps/km running)
  - Derives calories from workout calorie totals
  - Derives sleep quality (1-10 scale) from SleepRecord total sleep hours
  - Auto-populates entry fields when user doesn't provide values
  - Tracks data source in `dataSources` JSON field: `{"steps": "healthkit", "sleepQuality": "healthkit"}`
  - Added `getHealthKitPreview()` server action for UI previews
- Updated `src/hooks/useEntries.ts`:
  - Added `useHealthKitPreview()` hook for fetching HealthKit preview data

### Task 4: DataSourceBadge Integration
- `CheckInHistory.tsx` already had DataSourceBadge integrated (verified at line 87)
- Updated `src/features/entries/CheckInForm.tsx`:
  - Added `HealthKitIndicator` component showing purple Apple icon with value preview
  - Added `useHealthKitPreview` hook to fetch available HealthKit data
  - Steps, Calories, Sleep Quality fields now show HealthKit indicators when:
    - User hasn't entered a value AND HealthKit data is available
    - Placeholder text shows HealthKit value (e.g., "HealthKit: 8,500")
  - Visual indicator: "HealthKit: {value} (auto-fills if empty)"

### Task 5: Client Appointment Detail Page
- Created new server actions in `src/app/actions/client-appointments.ts`:
  - `getMyAppointmentById(id)` - Fetches appointment by ID with ownership verification
  - `cancelMyAppointment(id)` - Cancel appointment with 24-hour restriction
  - Sends cancellation email and removes Google Calendar event
- Updated `src/hooks/useClientAppointments.ts`:
  - Added `useMyAppointment(id)` hook
  - Added `useCancelMyAppointment()` mutation hook
- Created `src/app/appointments/me/[id]/page.tsx`:
  - Client appointment detail page with ownership check
  - Returns 404 if appointment doesn't exist or doesn't belong to user
- Created `src/features/appointments/ClientAppointmentDetail.tsx`:
  - Full appointment detail view (date, time, duration, location, status)
  - Coach notes section
  - Cancel button with 24-hour restriction check
  - AlertDialog confirmation for cancellation
  - Status badges (Scheduled, Attended, Missed)
- Updated `src/features/appointments/ClientAppointmentsCalendar.tsx`:
  - Appointment items now link to `/appointments/me/[id]`
  - Added hover states for clickable appointments

### Build Verification
- `npm run build` passes successfully (39 routes)
- All TypeScript types validated

---

## 2026-01-26 - Comprehensive Testing Suite Implementation

Built a full testing suite covering the entire Centurion project using the chief-architect agent.

### Test Infrastructure
- **Mocks** (`src/__tests__/mocks/`):
  - `prisma.ts` - Mock Prisma client for database operations
  - `auth.ts` - Mock authentication with role-based access (admin, coach, client)
  - `google-calendar.ts` - Mock Google Calendar API integration
  - `email.ts` - Mock email sending with sent email tracking
  - `stripe.ts` - Mock Stripe payment integration
  - `index.ts` - Central export for all mocks

- **Test Utilities** (`src/__tests__/utils/`):
  - `test-data.ts` - Factory functions for creating mock data (users, appointments, invoices, cohorts, memberships, entries)
  - `test-helpers.ts` - Helper functions (mockDate, flushPromises, expectAsyncError, waitFor)

### Unit Tests

**Server Actions** (`src/__tests__/actions/`):
- `appointments.test.ts` - 23 tests: creation, updating, deletion, conflicts, Google Calendar sync, email notifications
- `cohorts.test.ts` - 32 tests: CRUD operations, member management, coach assignment, check-in config
- `invoices.test.ts` - 27 tests: generation, payment links, status updates, revenue stats
- `review-queue.test.ts` - 21 tests: weekly summaries, coach responses, priority calculations

**Library Functions** (`src/__tests__/lib/`):
- `calendar.test.ts` - 39 tests: date/time utilities, date filtering, calendar generation
- `utils.test.ts` - 9 tests: cn() class merging utility

### Component Tests

**UI Components** (`src/__tests__/components/ui/`):
- `button.test.tsx` - 25 tests: variants, sizes, disabled state, interactions, accessibility
- `card.test.tsx` - 23 tests: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `ErrorBoundary.test.tsx` - 14 tests: error catching, display, edge cases

### Hook Tests

**React Query Hooks** (`src/__tests__/hooks/`):
- `useAppointments.test.tsx` - 13 tests: useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useSyncAppointment

### E2E Tests

**Playwright Tests** (`e2e/`):
- `auth.spec.ts` - Authentication flows, protected routes
- `appointments.spec.ts` - Appointment management UI
- `cohorts.spec.ts` - Cohort management UI
- `invoices.spec.ts` - Invoice management UI
- `review-queue.spec.ts` - Coach review queue UI

### Test Statistics
- **Total Tests**: 237 passing
- **Test Files**: 11 files
- **Duration**: ~14 seconds

### Key Features
1. **Comprehensive Mocking** - All external dependencies (Prisma, Auth, Google Calendar, Email, Stripe) are mocked
2. **Role-Based Testing** - Tests verify proper access control for admin, coach, and client roles
3. **Business Logic Coverage** - Tests cover critical paths like appointment conflicts, invoice generation, cohort membership
4. **Integration Patterns** - React Query hooks are tested with proper QueryClient setup
5. **E2E Framework** - Playwright tests ready for full integration testing

---

## 2026-01-26 - Batch 3: Fix Critical Integration Gaps

Executed Batch 3 to fix critical integration gaps in Centurion platform.

### Task 1: Integrate Email System
- Integrated email notifications into server actions (previously 0% usage):
  - **Appointments** (`src/app/actions/appointments.ts`):
    - Added `sendSystemEmail` call after creating appointment (APPOINTMENT_CONFIRMATION)
    - Added `sendSystemEmail` call after deleting appointment (APPOINTMENT_CANCELLED)
    - Fetches member info to populate email variables (name, date, time)
  - **Invoices** (`src/app/actions/invoices.ts`):
    - Added `sendSystemEmail` after generating invoice (INVOICE_SENT)
    - Added `sendSystemEmail` when payment status updated to PAID (INVOICE_PAID)
    - Includes invoice amount, month, and payment URL
  - **Cohorts** (`src/app/actions/cohorts.ts`):
    - Added `sendSystemEmail` when adding member to cohort (COHORT_INVITE)
    - Includes cohort name and coach name
  - **Review Queue** (`src/app/actions/review-queue.ts`):
    - Added `sendSystemEmail` after coach saves feedback (COACH_NOTE_RECEIVED)
    - Only sends if there's actual feedback content (loomUrl or note)
- All emails respect `isTestUser` flag to suppress for test accounts
- Graceful degradation when RESEND_API_KEY not configured

### Task 2: Fix Navigation (5 Missing Pages)
- Updated `src/components/layouts/Sidebar.tsx`:
  - Added new icons: FileText, Activity, Settings, BarChart, ClipboardList
  - ADMIN: Added Questionnaires (/admin/questionnaires), HealthKit (/admin/healthkit), Settings (/admin/settings), Reports (/reports)
  - COACH: Added Review Queue (/coach/review-queue), Reports (/reports)
- Updated `src/components/layouts/MobileNav.tsx` with identical navigation changes

### Task 3: Build Credit Management UI
- **Schema Updates** (`prisma/schema.prisma`):
  - Added `CreditTransaction` model for credit history tracking
  - Fields: userId, amount (positive=add, negative=deduct), reason, expiresAt, createdById
  - Added `isTestUser` field to User model (for email suppression)
  - Added relations: `creditTransactionsReceived`, `creditTransactionsCreated`
- **Server Actions** (`src/app/actions/credits.ts`):
  - `allocateCredits()` - Add or deduct credits with audit logging
  - `getCreditsHistory()` - Get transaction history for a user
  - `getCreditsSummary()` - Get balance and recent transactions
  - Prevents negative balance on deduction
- **UI Components** (`src/features/credits/`):
  - `CreditAllocationForm.tsx` - Form to add/deduct credits with reason
  - `CreditBalanceWidget.tsx` - Badge display of credit balance
  - `CreditHistoryTable.tsx` - Table of credit transactions
- **Integration**:
  - Updated `src/features/users/UserDetail.tsx` to include credit management section
  - Shows allocation form, current balance, and transaction history

### Task 4: Add Error and Loading States
- **Created Skeleton component** (`src/components/ui/skeleton.tsx`):
  - Shadcn-style animated loading placeholder
- **Global Error Boundary** (`src/app/error.tsx`):
  - Friendly error display with AlertCircle icon
  - "Try Again" and "Go to Dashboard" buttons
  - Error digest display for debugging
- **Global Loading State** (`src/app/loading.tsx`):
  - Header, stats cards, and table skeleton layout
- **Route-Specific Loading States**:
  - `src/app/appointments/loading.tsx` - Appointment list skeleton
  - `src/app/cohorts/loading.tsx` - Cohort cards grid skeleton
  - `src/app/reports/loading.tsx` - Reports with chart skeleton
  - `src/app/admin/users/loading.tsx` - User table skeleton

### Build Verification
- Prisma client regenerated with new schema
- `npm run build` passes successfully (39 routes)
- All TypeScript types validated

---

## 2026-01-26 - Batch 2: Moderate Adaptation from CoachFit

Executed Batch 2 to adapt 70-80% ready code from CoachFit, requiring moderate modifications.

### Task 1: Questionnaire Builder UI
- Created `src/components/admin/EmailEditor.tsx`:
  - TipTap rich text editor with toolbar (bold, italic, underline, headings, lists, alignment, links)
  - Token insertion for template variables
  - Configurable minimum height
- Installed TipTap packages: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-link, @tiptap/extension-text-align, @tiptap/extension-underline
- Created `src/features/questionnaires/QuestionnaireBuilder.tsx`:
  - Visual question builder with week selection
  - Add/remove/reorder questions (up/down buttons)
  - Question types: Long text (comment), Number (with min/max), HTML intro
  - Required field toggles
  - Rich text editing for question titles and descriptions
- Created admin pages:
  - `/admin/questionnaires/page.tsx` - List all bundles grouped by cohort
  - `/admin/questionnaires/new/page.tsx` - Create new bundle with builder
  - `/admin/questionnaires/[id]/page.tsx` - Edit existing bundle
- Added server actions to `src/app/actions/questionnaires.ts`:
  - `getAllQuestionnaireBundlesAdmin()` - Admin-only list all bundles
  - `deleteQuestionnaireBundle()` - Delete bundle (blocks if responses exist)
  - `getOrCreateQuestionnaireBundle()` - Get or create with default template
- Created supporting components:
  - `QuestionnaireList.tsx` - Bundle list with edit/delete actions
  - `NewQuestionnaireForm.tsx` - Create form with cohort/week selection
  - `EditQuestionnaireForm.tsx` - Edit form with week navigation

### Task 2: Custom Check-In Config UI
- Created `src/lib/check-in-prompts.ts`:
  - Constants: MANDATORY_PROMPTS, OPTIONAL_PROMPTS, ALL_CHECK_IN_PROMPTS
  - 4 mandatory prompts (weight, steps, calories, perceivedStress)
  - 2 optional prompts (sleepQuality, notes)
- Added server actions to `src/app/actions/cohorts.ts`:
  - `getCheckInConfig(cohortId)` - Get config with defaults
  - `updateCheckInConfig(cohortId, config)` - Upsert config with validation
  - `CheckInConfig` type for config structure
- Created `src/features/cohorts/CheckInConfigEditor.tsx`:
  - Toggle checkboxes for each prompt (mandatory prompts locked)
  - Custom prompt input with label and response type (scale/number/text)
  - Save with inline success/error feedback
- Integrated into CohortDetail component:
  - Added CheckInConfigEditor below cohort analytics
  - Check-in settings appear on every cohort detail page

### Task 3: HealthKit API Routes
- Added PairingCode model to `prisma/schema.prisma`:
  - Fields: code (unique), userId (client), createdBy (coach/admin), expiresAt, usedAt
  - Relations to User for both client and creator
- Created `src/lib/validations/healthkit.ts`:
  - Zod schemas for workouts, sleep, steps, and pairing
  - Type exports for all input types
- Created `src/lib/healthkit/pairing.ts`:
  - `generatePairingCode()` - 6-char alphanumeric code (excludes ambiguous chars)
  - `createPairingCode()` - Create code for client with 24h expiry
  - `regeneratePairingCode()` - Invalidate old codes and create new
  - `validateAndUsePairingCode()` - Validate, mark used, return client info
  - `getActivePairingCodes()` - List unexpired, unused codes
  - `cleanupExpiredCodes()` - Maintenance function
- Created API routes:
  - `/api/healthkit/pair/route.ts` - iOS pairing endpoint with CORS
  - `/api/healthkit/workouts/route.ts` - Workout ingestion with deduplication
  - `/api/healthkit/sleep/route.ts` - Sleep record ingestion
  - `/api/healthkit/steps/route.ts` - Step count to Entry model
  - `/api/admin/healthkit/generate-code/route.ts` - Admin code generation
- Created UI components:
  - `src/features/healthkit/PairingCodeGenerator.tsx` - Generate codes for clients
  - `src/features/healthkit/HealthDataExplorer.tsx` - View client HealthKit data
  - `src/features/healthkit/HealthKitAdminDashboard.tsx` - Admin overview with stats
- Created admin page `/admin/healthkit/page.tsx`:
  - Stats: paired clients, active codes, total workouts, sleep records
  - Pairing code generator with copy functionality
  - Active codes list with expiry times
  - Recent workouts and sleep records lists

### Build Verification
- `npm run build` passes successfully
- All new routes compile and generate correctly
- Note: Database migration needed for PairingCode model

## 2026-01-26 17:02 GMT - Batch 1: Copy and Adapt Code from PTP/CoachFit

Executed Batch 1 to close gaps by copying 95%+ ready code from PTP and CoachFit source codebases.

### Task 1: Resend Email System (from CoachFit)
- Created `src/lib/email.ts` with Resend integration:
  - Lazy initialization to avoid build errors when API key missing
  - Test user email suppression (logs to console instead)
  - Graceful degradation when RESEND_API_KEY not configured
  - `sendTransactionalEmail()` for raw email sending
  - `sendSystemEmail()` for template-based emails with fallbacks
- Created `src/lib/email-templates.ts` with:
  - 14 template keys covering: user management, invitations, appointments, invoicing, health coaching
  - Token whitelist for XSS protection (18 tokens: userName, appointmentDate, invoiceAmount, etc.)
  - HTML escaping for body content, raw for subjects
  - `renderEmailTemplate()` function with hardcoded defaults (no database required)
  - Centurion-specific adaptations: changed "CoachFit" to "Centurion", added appointment/invoice templates
- Installed `resend` package

### Task 2: Test Framework (from PTP)
- Created `vitest.config.ts` with:
  - jsdom environment for React testing
  - Path alias (@) pointing to ./src
  - Exclusions for CoachFit, personal-trainer-planner, e2e directories
- Created `vitest.setup.ts` importing @testing-library/jest-dom
- Created `playwright.config.ts` for E2E testing:
  - 4 browser projects (chromium, webkit, mobile Chrome/Safari)
  - CI/local environment detection
  - HTML and list reporters
- Created `e2e/example.spec.ts` sample E2E test
- Created `src/lib/calendar.test.ts` with 11 unit tests covering:
  - formatTime24/formatTime12 functions
  - getRepeatingDates for recurring appointments
  - combineDateAndTime date/time merging
  - getPrismaDateFilter date range generation
- Added npm scripts: test, test:watch, test:ui, test:e2e, test:e2e:ui
- Installed dependencies: @vitejs/plugin-react, @testing-library/react, @testing-library/jest-dom, jsdom
- Verified: All 11 unit tests pass

### Task 3: Data Source Badges (from CoachFit)
- Created `src/components/ui/DataSourceBadge.tsx`:
  - Supports both array format (["healthkit"]) and object format ({"weight": "manual"})
  - Badge types: HealthKit (purple), Google Fit (blue), Strava (orange), Manual (gray)
  - Configurable size (sm/md) and label visibility
  - Mini SVG icons for each source type
- Integrated into CheckInHistory component:
  - Added Source column header
  - Added DataSourceBadge to each entry row
  - Shows icons only (showLabel=false) for compact display

### Task 4: Recurring Appointments Logic (from PTP)
- **Already exists**: `getRepeatingDates()` function already present in `src/lib/calendar.ts`
- No action needed - Centurion already has this functionality

### Build Verified
- All 31 routes compile successfully
- All 11 unit tests pass
- TypeScript types validated

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
