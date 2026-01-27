# Cross-Platform Feature Audit: CoachFit + PTP vs Centurion

**Date:** 2026-01-27
**Method:** Parallel Explore agents audited all three codebases exhaustively

---

## Summary

| Metric | Count |
|--------|-------|
| Features fully implemented | ~65 |
| Features where Centurion exceeds source | ~10 |
| Feature gaps identified | 23 |
| Critical gaps | 9 |
| Medium gaps | 8 |
| Low gaps | 6 |

---

## PTP (Personal Trainer Planner) Features

| # | Feature | PTP | Centurion | Status |
|---|---------|-----|-----------|--------|
| 1 | Email/password auth (bcrypt) | Yes | Yes | IMPLEMENTED |
| 2 | Google OAuth | No | Yes | CENTURION EXCEEDS |
| 3 | JWT session (30-day) | Yes | Yes | IMPLEMENTED |
| 4 | Role-based access (admin/user) | Yes (admin/user) | Yes (ADMIN/COACH/CLIENT) | CENTURION EXCEEDS (3 roles) |
| 5 | Password reset flow (email token) | Yes | No | **GAP - CRITICAL** |
| 6 | Appointment CRUD | Yes | Yes | IMPLEMENTED |
| 7 | Appointment title/name | Yes | Yes | IMPLEMENTED |
| 8 | Repeating appointments (weekly pattern) | Yes | Yes | IMPLEMENTED |
| 9 | Appointment fee tracking | Yes (int pence) | Yes (Decimal) | IMPLEMENTED (improved) |
| 10 | Appointment attendance (ATTENDED/NOT_ATTENDED) | Yes | Yes | IMPLEMENTED |
| 11 | Google Calendar sync (add/update/delete) | Yes | Yes | IMPLEMENTED |
| 12 | Google Calendar batch sync | Yes (10 at a time) | Yes | IMPLEMENTED |
| 13 | Appointment overlap/conflict detection | No | Yes | CENTURION EXCEEDS |
| 14 | Appointment video URL | Yes | No | **GAP - LOW** |
| 15 | Bootcamp CRUD | Yes | Yes | IMPLEMENTED |
| 16 | Bootcamp attendee management | Yes (many-to-many) | Yes | IMPLEMENTED |
| 17 | Bootcamp capacity enforcement | No | Yes | CENTURION EXCEEDS |
| 18 | Bootcamp credit system (join/leave) | Yes (toggle +1/-1) | Yes | IMPLEMENTED |
| 19 | Workout CRUD (standalone events) | Yes | No | **GAP - MEDIUM** |
| 20 | Workout status tracking | Yes | No | **GAP - MEDIUM** |
| 21 | Invoice creation | Yes (email-first) | Yes | IMPLEMENTED |
| 22 | Invoice email sending | Yes (plain text) | Yes (templated) | CENTURION EXCEEDS |
| 23 | Invoice Stripe payment links | No | Yes | CENTURION EXCEEDS |
| 24 | Invoice payment status tracking | No | Yes (4 statuses) | CENTURION EXCEEDS |
| 25 | CSV revenue export | Yes | Yes (CSV + JSON) | CENTURION EXCEEDS |
| 26 | UK tax year calculation | Yes | Unknown | VERIFY |
| 27 | User types (INDIVIDUAL/BOOTCAMP) | Yes | No (uses roles) | DIFFERENT APPROACH |
| 28 | User billing email (separate) | Yes | No | **GAP - MEDIUM** |
| 29 | Desktop calendar (month grid) | Yes | Yes | IMPLEMENTED |
| 30 | Mobile calendar (week view) | Yes | Yes | IMPLEMENTED |
| 31 | Client calendar (personal view) | Yes | Yes | IMPLEMENTED |
| 32 | Soft delete (deleted flag) | Yes | No (hard delete) | DIFFERENT APPROACH |
| 33 | Dynamic forms (Contentful CMS) | Yes | No | **GAP - LOW** |
| 34 | Sentry error monitoring | Yes | No | **GAP - LOW** |
| 35 | Vercel Analytics/Speed Insights | Yes | No | **GAP - LOW** |
| 36 | Health check endpoint | Yes | No | **GAP - LOW** |

---

## CoachFit Features

| # | Feature | CoachFit | Centurion | Status |
|---|---------|----------|-----------|--------|
| 37 | Google + Apple OAuth | Yes | Google only | **GAP - MEDIUM** (Apple missing) |
| 38 | Cohort management (CRUD) | Yes | Yes | IMPLEMENTED |
| 39 | Cohort types (TIMED/ONGOING/CHALLENGE/CUSTOM) | Yes (4 enum + custom) | Partial | **GAP - CRITICAL** |
| 40 | Custom cohort types (admin-created) | Yes | No | **GAP - CRITICAL** |
| 41 | Cohort duration config (6-week/custom) | Yes | Yes | IMPLEMENTED |
| 42 | Cohort membership duration (months) | Yes | No | **GAP - CRITICAL** |
| 43 | Multi-coach cohorts | Yes | Yes | IMPLEMENTED |
| 44 | Cohort migration tracking | Yes | No | **GAP - LOW** |
| 45 | Daily entry submission (manual) | Yes | Yes | IMPLEMENTED |
| 46 | Entry fields: weight, steps, calories, sleep, stress, notes | Yes | Yes | IMPLEMENTED |
| 47 | Entry body fat percentage | Yes | No | **GAP - MEDIUM** |
| 48 | Entry height storage (per entry) | Yes | No | **GAP - MEDIUM** |
| 49 | Entry custom responses | Yes | Yes | IMPLEMENTED |
| 50 | Entry data source tracking | Yes (array) | Yes (JSON) | IMPLEMENTED |
| 51 | HealthKit iOS pairing (6-char code, 24h expiry) | Yes | Yes | IMPLEMENTED |
| 52 | HealthKit workout ingestion | Yes | Yes | IMPLEMENTED |
| 53 | HealthKit sleep ingestion | Yes | Yes | IMPLEMENTED |
| 54 | HealthKit steps ingestion | Yes | Yes | IMPLEMENTED |
| 55 | HealthKit profile ingestion | Yes | No | **GAP - LOW** |
| 56 | HealthKit 365-day initial sync | Yes | Unknown | VERIFY |
| 57 | SurveyJS questionnaire builder | Yes | Yes | IMPLEMENTED |
| 58 | Questionnaire templates (weekly) | Yes (Weeks 1-5) | Yes (Weeks 1-6) | CENTURION EXCEEDS |
| 59 | Questionnaire responses with status | Yes | Yes | IMPLEMENTED |
| 60 | Questionnaire reminders (email) | Yes | Yes | IMPLEMENTED |
| 61 | Questionnaire analytics | Yes | Yes | IMPLEMENTED |
| 62 | Weekly coach notes | Yes | Yes | IMPLEMENTED |
| 63 | Weekly coach video responses (Loom URL) | Yes | Yes | IMPLEMENTED |
| 64 | Client weekly review page | Yes | Yes | IMPLEMENTED |
| 65 | Check-in configuration (per cohort) | Yes | Yes | IMPLEMENTED |
| 66 | Check-in frequency (global/cohort/user override) | Yes (3-level) | Partial | **GAP - CRITICAL** |
| 67 | Missed check-in detection | Yes | Yes | IMPLEMENTED |
| 68 | Admin dashboard overview | Yes | Yes | IMPLEMENTED |
| 69 | Attention queue/score system | Yes (0-100) | Yes | IMPLEMENTED |
| 70 | Admin audit logging | Yes | Yes | IMPLEMENTED |
| 71 | Admin user management | Yes | Yes | IMPLEMENTED |
| 72 | Admin coach management | Yes | Yes | IMPLEMENTED |
| 73 | Email templates (DB-stored, admin-editable) | Yes (7 types) | Code-defined (14 types) | **GAP - CRITICAL** (no admin editor) |
| 74 | Email template admin editor + preview | Yes | No | **GAP - CRITICAL** |
| 75 | Resend email provider | Yes | Yes | IMPLEMENTED |
| 76 | Test user email suppression | Yes | Yes | IMPLEMENTED |
| 77 | System settings (50+ params) | Yes (extensive) | Yes (basic) | **GAP - CRITICAL** |
| 78 | User preferences (weight unit, date format) | Yes | No | **GAP - CRITICAL** |
| 79 | User goals (target weight, calories, macros, steps) | Yes | No | **GAP - CRITICAL** |
| 80 | Fitness Wrapped / Year-in-Review | Yes | No | **GAP - MEDIUM** |
| 81 | Wrapped fun conversions | Yes | No | **GAP - MEDIUM** |
| 82 | Consent management (GDPR) | Yes | No | **GAP - CRITICAL** |
| 83 | Legal content management (terms, privacy, DPA) | Yes | No | **GAP - CRITICAL** |
| 84 | Account deletion (GDPR) | Yes | No | **GAP - CRITICAL** |
| 85 | Data export (user data download) | Yes | No | **GAP - CRITICAL** |
| 86 | Role switcher (multi-role users) | Yes | No | **GAP - MEDIUM** |
| 87 | Client/Coach/Admin layouts | Yes | Yes | IMPLEMENTED |
| 88 | DataSourceBadge component | Yes | Yes | IMPLEMENTED |
| 89 | Error boundary | Yes | Yes | IMPLEMENTED |
| 90 | Loading skeletons | Yes | Yes | IMPLEMENTED |
| 91 | Fetch retry with exponential backoff | Yes | No | **GAP - LOW** |
| 92 | BMI calculation | Yes | No | **GAP - MEDIUM** |
| 93 | Unit conversions (lbs/kg, inches/cm) | Yes | No | **GAP - MEDIUM** |

---

## Where Centurion Exceeds Source Apps

| Feature | Detail |
|---------|--------|
| Google OAuth | PTP has none |
| 3-tier roles | PTP only has admin/user; Centurion has ADMIN/COACH/CLIENT |
| Appointment conflict detection | PTP lacks overlap checking |
| Bootcamp capacity enforcement | PTP lacks capacity checks |
| Stripe payment integration | PTP has plain-text email invoices only |
| Invoice payment status | 4-state tracking (UNPAID/PAID/OVERDUE/CANCELLED) |
| CSV + JSON export | PTP has CSV only |
| Week 6 questionnaire | CoachFit has weeks 1-5 only |
| 14 email template types | CoachFit has 7 |
| Decimal fee precision | PTP uses integer pence |

---

## Gap Breakdown by Priority

### CRITICAL (9 gaps) - Must implement for feature parity

| # | Gap | Source | Description |
|---|-----|--------|-------------|
| C1 | Password reset (email token) | PTP | Forgot password → email token → reset flow. Users currently can't recover accounts without admin. |
| C2 | User goals/targets | CoachFit | UserGoals model: target weight, daily calories, macro targets (protein/carbs/fat g), water intake, daily steps, weekly workout mins. Core coaching feature. |
| C3 | User preferences | CoachFit | Weight unit (lbs/kg), measurement unit (inches/cm), date format (MM/dd/yyyy etc). UK/metric users see wrong units. |
| C4 | Extended system settings | CoachFit | 50+ params: calorie limits (min/max daily), protein ranges per pound, macro defaults (carbs/protein/fat %), step categories, workout minute categories, body fat categories, adherence scoring thresholds. |
| C5 | Email template admin editor | CoachFit | DB-stored templates with admin CRUD UI, token substitution preview, enable/disable per template, system vs custom flag. |
| C6 | GDPR: account deletion + data export | CoachFit | Cascade deletion of all user data. Data export endpoint returning profile, entries, workouts, sleep records. Legal requirement. |
| C7 | Consent management | CoachFit | UserConsent model: terms acceptance, privacy policy, data processing agreement, marketing opt-in. Version tracking, IP/UA capture. |
| C8 | Cohort types | CoachFit | 4 enum types (TIMED/ONGOING/CHALLENGE/CUSTOM) + admin-created CustomCohortType with label/description. Membership duration for ongoing cohorts. |
| C9 | Check-in frequency (3-level) | CoachFit | SystemSettings default (7 days) → per-cohort override → per-user override. Impacts adherence calculations. |

### MEDIUM (8 gaps) - Important for full feature set

| # | Gap | Source | Description |
|---|-----|--------|-------------|
| M1 | Workout CRUD | PTP | Standalone Workout model (separate from appointments): NOT_STARTED/COMPLETED status, assigned to individual users, video URL, repeating patterns. |
| M2 | Billing email | PTP | Separate `billingEmail` field on User model. Invoices sent to billing email, not login email. |
| M3 | Body fat percentage | CoachFit | `bodyFatPercentage` field on Entry model. Used with body fat category thresholds in system settings. |
| M4 | Fitness Wrapped | CoachFit | Year-in-review: aggregate totals (calories, steps, workout mins, sleep), weight change, longest streak, top metrics, fun conversions (pizza slices, movies watched, etc). Modal + carousel UI. |
| M5 | Role switcher | CoachFit | RoleSwitcher component + RoleContext. Users with multiple roles can switch active view. Navigation adjusts per role. |
| M6 | Apple OAuth | CoachFit | Apple sign-in provider alongside Google. Important for iOS users. |
| M7 | Entry height + BMI | CoachFit | `heightInches` on Entry, BMI calculation from weight/height, unit conversions (lbs↔kg, inches↔cm). |
| M8 | Unit conversions | CoachFit | `lib/utils/unit-conversions.ts`: lbs↔kg, inches↔cm, metric↔imperial. Used throughout display. |

### LOW (6 gaps) - Nice to have

| # | Gap | Source | Description |
|---|-----|--------|-------------|
| L1 | Appointment video URL | PTP | `videoUrl` field on Appointment model for session recordings/instructions. |
| L2 | Dynamic forms (Contentful) | PTP | Contentful CMS integration for arbitrary dynamic forms submitted via email. |
| L3 | Sentry error monitoring | PTP | Production error tracking and alerting. |
| L4 | Vercel Analytics | PTP | Usage analytics and performance insights. |
| L5 | Health check endpoint | PTP | `/api/health` endpoint for uptime monitoring. |
| L6 | Fetch retry + backoff | CoachFit | `lib/fetch-with-retry.ts`: configurable retry count, exponential backoff, optional timeout. |

---

## Implementation Recommendations

### Phase 1: Legal & Auth (C1, C6, C7)
- Password reset flow (email token generation, reset page, token validation)
- GDPR account deletion with cascade
- GDPR data export endpoint
- Consent management (UserConsent model, acceptance tracking)
- Legal content pages (terms, privacy, DPA)

### Phase 2: User Personalization (C2, C3, C9)
- UserGoals model and CRUD
- UserPreference model (units, date format)
- 3-level check-in frequency override
- Unit conversion utilities

### Phase 3: Admin Configuration (C4, C5, C8)
- Extended SystemSettings (50+ params from CoachFit)
- Email template admin editor with DB storage
- Cohort types enum + custom types

### Phase 4: Medium Gaps (M1-M8)
- Workout CRUD (standalone)
- Billing email field
- Body fat tracking
- Fitness Wrapped
- Role switcher
- Apple OAuth
- BMI + unit conversions

### Phase 5: Polish (L1-L6)
- Video URL on appointments
- Sentry + Vercel Analytics
- Health check endpoint
- Fetch retry utility
