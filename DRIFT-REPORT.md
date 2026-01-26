# Centurion Drift Analysis Report

*Date: 2026-01-26*

---

## Table of Contents

1. Executive Summary
2. Feature & Workflow Comparison
3. Data Model & API Drift
4. Frontend & UI/UX Drift
5. Testing & Quality Assurance
6. Documentation & Dev Tooling
7. Summary Table
8. Actionable Recommendations

---

## Executive Summary

Centurion aims to unify PTP’s robust scheduling/billing with CoachFit’s health tracking and cohort management. The codebase largely aligns with the unified platform spec, but several areas of drift, missing features, and inconsistencies remain, especially in advanced CoachFit features, UI/UX polish, and some admin/analytics flows.

---

## Feature & Workflow Comparison

| Area                | Unified Spec / PTP / CoachFit | Centurion Implementation | Drift/Deviation |
|---------------------|-------------------------------|-------------------------|-----------------|
| **User Management** | PTP: Admin CRUD, audit logs   | Implemented, PTP parity | Minor UI polish, bulk actions |
| **Appointments**    | PTP: Full booking, conflict detection, calendar sync | Implemented | Parity, no major drift |
| **Bootcamps**       | PTP: Group classes, credits   | Implemented             | Parity, no major drift |
| **Cohorts**         | CoachFit: Multi-coach, analytics, custom check-ins | Implemented, but some advanced analytics and custom check-in config incomplete | Partial drift (see below) |
| **Daily Check-Ins** | CoachFit: Entry model, custom prompts, HealthKit auto-fill | CRUD, compliance, streaks, UI present; custom prompts/HealthKit auto-fill partial | Partial drift |
| **Weekly Questionnaires** | CoachFit: SurveyJS, reporting, analytics | Basic structure, SurveyJS integration pending | Drift: advanced logic missing |
| **Coach Notes & Review Queue** | CoachFit: Automated queue, attention scoring, review workflow | Partial: Note model present, review queue/attention scoring incomplete | Drift: workflow/automation missing |
| **Analytics & Insights** | CoachFit: Attention scoring, dashboards | Basic analytics, attention scoring not fully implemented | Drift: advanced analytics missing |
| **HealthKit Integration** | CoachFit: Workout/SleepRecord, pairing, auto-entry | Models present, ingestion API/auto-entry partial | Drift: full sync/auto-entry missing |
| **Billing & Payments** | PTP: Stripe, invoice gen, payment tracking | Implemented, Stripe integration, revenue analytics | Parity, no major drift |
| **Admin/Settings** | PTP: Full admin surface, settings | Admin UI present, settings incomplete | Drift: settings polish needed |

---

## Data Model & API Drift

### Models

- **Authentication/Users**: Fully aligned (User, Account, Session, VerificationToken, Role enum).
- **Personal Training**: Appointment, Bootcamp, BootcampAttendee, Workout, Invoice all present and mapped.
- **Health Coaching**: Cohort, CohortMembership, CoachCohortMembership, Entry, QuestionnaireBundle, WeeklyQuestionnaireResponse, CohortCheckInConfig, CoachNote, AdminInsight present.
- **HealthKit**: HealthKitWorkout, SleepRecord models present; ingestion/auto-entry logic partial.
- **System**: SystemSettings, AuditLog present.

**Drift:**
- Some advanced CoachFit models (e.g., WeeklyReviewQueue, AttentionScore) are defined in spec but not fully implemented.
- Custom check-in prompts (CohortCheckInConfig) exist but UI/API for editing and using them is incomplete.
- HealthKit auto-population of Entry model is not fully realized.

### API

- Most CRUD and business logic routes for core models are present.
- Some advanced endpoints (e.g., review queue, attention scoring, HealthKit pairing) are stubbed or partially implemented.
- Naming and structure generally follow the unified spec, but some CoachFit-specific endpoints are missing or incomplete.

---

## Frontend & UI/UX Drift

- **Navigation/Layout**: Responsive, role-aware navigation as per spec.
- **Feature Modules**: Appointments, bootcamps, cohorts, check-ins, billing, analytics all have dedicated UI modules.
- **Cohort Management**: UI for cohort detail, member/coach management, and analytics present, but advanced analytics and custom check-in config UI are incomplete.
- **Daily Check-Ins**: UI present, but custom prompts and HealthKit data source badges are not fully integrated.
- **Weekly Questionnaires**: UI structure present, SurveyJS integration and week-based logic incomplete.
- **Coach Review Workflow**: Review queue dashboard and workflow UI are not fully implemented.
- **Admin/Settings**: Admin user management UI is present, but settings and advanced admin controls need polish.

---

## Testing & Quality Assurance

- **Unit Tests**: Vitest setup present, coverage for core features.
- **E2E Tests**: Playwright setup, critical flows covered (appointments, billing, check-ins).
- **Test Coverage**: >80% target in spec; actual coverage may be lower for new CoachFit features.
- **CI/CD**: Pipeline runs tests, but some new features lack full test coverage.
- **Linting/Formatting**: ESLint and Prettier configured.

**Drift:**
- Advanced CoachFit flows (review queue, custom check-ins, HealthKit sync) lack comprehensive tests.
- SurveyJS and analytics flows need more E2E coverage.

---

## Documentation & Dev Tooling

- **Docs**: Unified platform spec, schema reports, and feature specs are present and detailed.
- **Dev Tooling**: Prettier, ESLint, Playwright, Vitest, Sentry, Prisma Studio, Postman, TablePlus, Vercel, Railway all referenced and/or configured.
- **README**: Up-to-date, but some new features (CoachFit analytics, review queue) need more usage docs.

**Drift:**
- Some advanced CoachFit features lack user/admin documentation.
- Dev onboarding for new analytics and HealthKit flows could be improved.

---

## Summary Table

| Area                | Status         | Key Drift/Deviation |
|---------------------|---------------|---------------------|
| User Management     | ✅ Parity      | Minor UI polish     |
| Appointments        | ✅ Parity      | None                |
| Bootcamps           | ✅ Parity      | None                |
| Cohorts             | ⚠️ Partial    | Analytics, custom check-ins incomplete |
| Daily Check-Ins     | ⚠️ Partial    | Custom prompts, HealthKit auto-fill incomplete |
| Weekly Questionnaires| ⚠️ Partial   | SurveyJS, reporting, analytics missing |
| Coach Notes/Review  | ⚠️ Partial    | Review queue, attention scoring missing |
| Analytics           | ⚠️ Partial    | Advanced dashboards, scoring missing   |
| HealthKit           | ⚠️ Partial    | Auto-entry, pairing, data explorer incomplete |
| Billing/Payments    | ✅ Parity      | None                |
| Admin/Settings      | ⚠️ Partial    | Settings polish     |
| Testing             | ⚠️ Partial    | New features lack coverage            |
| Documentation       | ⚠️ Partial    | Advanced features under-documented    |
| Dev Tooling         | ✅ Parity      | None                |

---

## Actionable Recommendations

### Backend & Data Models

- **Implement missing models**: Complete WeeklyReviewQueue, AttentionScore, and related cron jobs.
- **Finish custom check-in config**: Ensure CohortCheckInConfig is editable and used in Entry logic.
- **Complete HealthKit auto-entry**: Finalize ingestion and auto-population of Entry from HealthKit data.

### API

- **Add missing endpoints**: Implement all review queue, attention scoring, and HealthKit pairing APIs.
- **Align naming/logic**: Ensure all endpoints match spec and CoachFit/PTP conventions.

### Frontend/UI

- **Finish custom check-in UI**: Build CheckInConfigEditor and integrate with DailyCheckInForm.
- **Complete review workflow**: Implement WeeklyReviewQueue dashboard and review panel.
- **Integrate SurveyJS**: Finalize questionnaire builder and response analytics.
- **Polish admin/settings**: Complete settings UI and advanced admin controls.

### Analytics

- **Implement attention scoring**: Build calculation service, cron job, and dashboards.
- **Expand analytics UI**: Add advanced dashboards for cohorts, engagement, and client progress.

### Testing

- **Increase coverage**: Add unit/E2E tests for new CoachFit features, especially review queue, custom check-ins, and HealthKit flows.
- **Test analytics**: Ensure dashboards and scoring logic are covered.

### Documentation

- **Update user/admin docs**: Document new features, especially advanced analytics, review queue, and HealthKit integration.
- **Improve onboarding**: Add guides for new flows and dev setup.

### Dev Tooling

- **Monitor test/lint status**: Ensure all new code passes linting and is covered by CI.
- **Add Sentry/monitoring**: Ensure error tracking is active for new features.

---

# End of Report

For each area of drift, prioritize implementation and testing of advanced CoachFit features, analytics, and admin flows to achieve full parity with the unified platform specification. Update documentation and tests as features are completed.

---

If you need a more granular, file-by-file checklist or want this report saved to a specific location, let me know!
