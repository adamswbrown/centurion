# Claude Code Project Specification: Unified Fitness Platform - Centurion

## Project Overview

**Goal**: Build a comprehensive fitness platform combining Personal Trainer Planner's scheduling/billing infrastructure with CoachFit's health tracking and cohort management capabilities.

**Base Framework**: Personal Trainer Planner (Next.js 15 + PostgreSQL + Prisma + shadcn/ui)  
**Feature Extensions**: CoachFit (cohorts, daily check-ins, health analytics, HealthKit integration) - Full features spec of Coach Fit is available in the route.  /U/centurion/coachfit-features-detailed-spec.md

**Development Environment**: macOS local development  
**Deployment**: Vercel (hosting) + Railway (PostgreSQL database)
**Git Repo** Project will be living at https://github.com/adamswbrown/centurion
**Code availability** Both code-based sources for CoachFit and Personal Trainer Planner are available in the directory. 
---

## 🎯 Core Principles

1. **Use Personal Trainer Planner as the foundation** - proven architecture, UI, auth
2. **Add CoachFit features as extensions** - cohorts complement appointments, not replace
3. **No breaking changes** - both systems coexist peacefully
4. **Production-ready from day one** - testing, monitoring, proper error handling
5. **Feature-based architecture** - maintainable, scalable code organization
6. **Token Efficiency Requirement** Agents must operate with strict token efficiency. Responses should be concise, non-verbose, and avoid restating prior context. Internal reasoning must not be externalised unless explicitly requested. Outputs should prioritise commands, decisions, or structured results over narrative explanation.


---

## 📋 Tech Stack (Final Decision)

### Frontend
- **Framework**: Next.js 15.1+ with App Router
- **Language**: TypeScript 5.7+
- **UI Library**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS 4.1+
- **Icons**: Lucide React
- **Charts**: Recharts 3.6+ or D3.js

### Backend
- **Runtime**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 6.3+
- **Authentication**: Auth.js v5 (NextAuth)
- **Email**: Resend
- **Calendar**: Google Calendar API

### State & Forms
- **Server State**: TanStack Query v5
- **Forms**: React Hook Form + Zod validation
- **Date Utils**: date-fns

### Testing & Quality
- **Unit Tests**: Vitest
- **E2E Tests**: Playwright
- **Linting**: ESLint
- **Formatting**: Prettier
- **Error Tracking**: Sentry (optional)

### Infrastructure
- **Hosting**: Vercel
- **Database Hosting**: Railway
- **Version Control**: Git + GitHub

---

## 🗄️ Complete Database Schema

### Phase 1: Core Models (Week 1-2)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTICATION & USERS
// ============================================

model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  password      String?   // Nullable for OAuth-only users
  name          String?
  image         String?
  emailVerified Boolean   @default(false)
  role          Role      @default(CLIENT)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Personal Training Relations
  appointments       Appointment[]
  bootcampAttendees  BootcampAttendee[]
  workouts           Workout[]
  invoices           Invoice[]
  
  // Health Coaching Relations
  cohortMemberships  CohortMembership[]
  coachCohorts       CoachCohortMembership[]  @relation("CoachCohorts")
  entries            Entry[]
  questionnaireResponses WeeklyQuestionnaireResponse[]
  coachNotes         CoachNote[]
  
  // HealthKit Relations
  healthKitWorkouts  HealthKitWorkout[]
  sleepRecords       SleepRecord[]
  
  // OAuth Relations
  accounts      Account[]
  sessions      Session[]
  
  @@map("users")
  @@index([email])
}

enum Role {
  ADMIN
  COACH
  CLIENT
}

// NextAuth Models
model Account {
  id                Int     @id @default(autoincrement())
  userId            Int
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           Int      @id @default(autoincrement())
  sessionToken String   @unique
  userId       Int
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// PERSONAL TRAINING (From Personal Trainer Planner)
// ============================================

model Appointment {
  id            Int      @id @default(autoincrement())
  userId        Int
  startTime     DateTime
  endTime       DateTime
  fee           Decimal  @db.Decimal(10, 2)
  status        AttendanceStatus @default(NOT_ATTENDED)
  notes         String?
  googleEventId String?  // For calendar sync
  
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  invoice Invoice? @relation(fields: [invoiceId], references: [id])
  invoiceId Int?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("appointments")
  @@index([userId, startTime])
}

enum AttendanceStatus {
  ATTENDED
  NOT_ATTENDED
}

model Bootcamp {
  id         Int      @id @default(autoincrement())
  name       String
  startTime  DateTime
  endTime    DateTime
  location   String?
  capacity   Int?
  description String?
  
  attendees  BootcampAttendee[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("bootcamps")
  @@index([startTime])
}

model BootcampAttendee {
  id         Int      @id @default(autoincrement())
  bootcampId Int
  userId     Int
  
  bootcamp   Bootcamp @relation(fields: [bootcampId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([bootcampId, userId])
  @@map("bootcamp_attendees")
}

model Workout {
  id          Int      @id @default(autoincrement())
  userId      Int
  title       String
  description String?
  status      WorkoutStatus @default(NOT_STARTED)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("workouts")
}

enum WorkoutStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

model Invoice {
  id          Int      @id @default(autoincrement())
  userId      Int
  month       DateTime
  totalAmount Decimal  @db.Decimal(10, 2)
  emailSent   Boolean  @default(false)
  emailSentAt DateTime?
  
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointments Appointment[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("invoices")
  @@index([userId, month])
}

// ============================================
// HEALTH COACHING (From CoachFit)
// ============================================

model Cohort {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime?
  status      CohortStatus @default(ACTIVE)
  
  coaches     CoachCohortMembership[]
  members     CohortMembership[]
  bundles     QuestionnaireBundle[]
  config      CohortCheckInConfig?
  insights    AdminInsight[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("cohorts")
  @@index([status, startDate])
}

enum CohortStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model CohortMembership {
  id        Int      @id @default(autoincrement())
  cohortId  Int
  userId    Int
  status    MembershipStatus @default(ACTIVE)
  joinedAt  DateTime @default(now())
  leftAt    DateTime?
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([cohortId, userId])
  @@map("cohort_memberships")
  @@index([cohortId, status])
}

enum MembershipStatus {
  ACTIVE
  PAUSED
  INACTIVE
}

model CoachCohortMembership {
  id       Int      @id @default(autoincrement())
  cohortId Int
  coachId  Int
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  coach  User   @relation("CoachCohorts", fields: [coachId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([cohortId, coachId])
  @@map("coach_cohort_memberships")
}

model Entry {
  id              Int      @id @default(autoincrement())
  userId          Int
  date            DateTime @default(now())
  
  // Health metrics
  weight          Float?
  steps           Int?
  calories        Int?
  sleepQuality    Int?     // 1-10 scale
  perceivedStress Int?     // 1-10 scale
  notes           String?
  
  // Custom responses per cohort
  customResponses Json?
  
  // Data source tracking
  dataSources     Json?    // {"weight": "manual", "steps": "healthkit"}
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, date])
  @@map("entries")
  @@index([userId, date])
}

model QuestionnaireBundle {
  id          Int      @id @default(autoincrement())
  cohortId    Int
  weekNumber  Int
  questions   Json     // SurveyJS format
  isActive    Boolean  @default(true)
  
  cohort    Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  responses WeeklyQuestionnaireResponse[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([cohortId, weekNumber])
  @@map("questionnaire_bundles")
}

model WeeklyQuestionnaireResponse {
  id         Int      @id @default(autoincrement())
  userId     Int
  bundleId   Int
  weekNumber Int
  responses  Json     // User's answers
  status     ResponseStatus @default(IN_PROGRESS)
  
  user   User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  bundle QuestionnaireBundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, bundleId])
  @@map("weekly_questionnaire_responses")
}

enum ResponseStatus {
  IN_PROGRESS
  COMPLETED
}

model CohortCheckInConfig {
  id        Int    @id @default(autoincrement())
  cohortId  Int    @unique
  prompts   Json   // Custom check-in questions
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("cohort_check_in_configs")
}

model CoachNote {
  id        Int      @id @default(autoincrement())
  userId    Int      // Client
  coachId   Int      // Coach (not strictly enforced by FK)
  weekNumber Int
  notes     String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("coach_notes")
  @@index([userId, weekNumber])
}

model AdminInsight {
  id        Int      @id @default(autoincrement())
  cohortId  Int?
  title     String
  description String
  priority  InsightPriority @default(MEDIUM)
  status    InsightStatus   @default(ACTIVE)
  
  cohort Cohort? @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("admin_insights")
  @@index([status, priority])
}

enum InsightPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum InsightStatus {
  ACTIVE
  RESOLVED
  DISMISSED
}

// ============================================
// HEALTHKIT INTEGRATION (From CoachFit)
// ============================================

model HealthKitWorkout {
  id           Int      @id @default(autoincrement())
  userId       Int
  workoutType  String
  startTime    DateTime
  endTime      DateTime
  duration     Int      // seconds
  calories     Float?
  distance     Float?   // meters
  heartRate    Json?    // {avg: 150, max: 180}
  metadata     Json?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@map("healthkit_workouts")
  @@index([userId, startTime])
}

model SleepRecord {
  id            Int      @id @default(autoincrement())
  userId        Int
  startTime     DateTime
  endTime       DateTime
  totalSleep    Int      // minutes
  inBedTime     Int      // minutes
  deepSleep     Int?     // minutes
  remSleep      Int?     // minutes
  coreSleep     Int?     // minutes
  sourceDevice  String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@map("sleep_records")
  @@index([userId, startTime])
}

// ============================================
// SYSTEM & ADMIN (From CoachFit)
// ============================================

model SystemSettings {
  id    Int    @id @default(autoincrement())
  key   String @unique
  value Json
  
  updatedAt DateTime @updatedAt
  
  @@map("system_settings")
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     // Actor (null if system)
  action    String   // CREATE_COHORT, DELETE_USER, etc.
  target    String?  // Resource affected
  metadata  Json?    // Additional context
  
  createdAt DateTime @default(now())
  
  @@map("audit_logs")
  @@index([createdAt])
}
```

---

## 🏗️ Project Structure

```
gym-platform/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── members/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── cohorts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── billing/
│   │   │   │   └── page.tsx
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── coach/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── cohorts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx
│   │   │   ├── check-ins/
│   │   │   │   └── page.tsx
│   │   │   └── analytics/
│   │   │       └── page.tsx
│   │   │
│   │   ├── client/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── check-in/
│   │   │   │   └── page.tsx
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx
│   │   │   ├── programs/
│   │   │   │   └── page.tsx
│   │   │   └── progress/
│   │   │       └── page.tsx
│   │   │
│   │   └── layout.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── members/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── appointments/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── bootcamps/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── cohorts/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── entries/
│   │   │   ├── route.ts
│   │   │   └── today/
│   │   │       └── route.ts
│   │   ├── questionnaires/
│   │   │   └── route.ts
│   │   ├── payments/
│   │   │   └── route.ts
│   │   ├── invoices/
│   │   │   └── route.ts
│   │   └── healthkit/
│   │       ├── workouts/
│   │       │   └── route.ts
│   │       └── sleep/
│   │           └── route.ts
│   │
│   ├── actions/
│   │   ├── members.ts
│   │   ├── appointments.ts
│   │   ├── cohorts.ts
│   │   ├── entries.ts
│   │   └── auth.ts
│   │
│   └── layout.tsx
│   └── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── calendar.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── Footer.tsx
│   │
│   └── providers/
│       ├── QueryProvider.tsx
│       ├── ThemeProvider.tsx
│       └── ToastProvider.tsx
│
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthButtons.tsx
│   │
│   ├── members/
│   │   ├── MemberTable.tsx
│   │   ├── MemberSearch.tsx
│   │   ├── MemberForm.tsx
│   │   └── MemberDetail.tsx
│   │
│   ├── appointments/
│   │   ├── AppointmentForm.tsx
│   │   ├── AppointmentList.tsx
│   │   └── AppointmentCalendar.tsx
│   │
│   ├── bootcamps/
│   │   ├── BootcampForm.tsx
│   │   ├── BootcampList.tsx
│   │   └── BootcampAttendees.tsx
│   │
│   ├── cohorts/
│   │   ├── CohortForm.tsx
│   │   ├── CohortList.tsx
│   │   ├── CohortDetail.tsx
│   │   ├── MemberManagement.tsx
│   │   └── CoachAssignment.tsx
│   │
│   ├── check-ins/
│   │   ├── DailyCheckInForm.tsx
│   │   ├── CheckInHistory.tsx
│   │   ├── CheckInChart.tsx
│   │   └── CheckInCalendar.tsx
│   │
│   ├── questionnaires/
│   │   ├── QuestionnaireForm.tsx
│   │   ├── QuestionnaireBuilder.tsx
│   │   └── ResponseAnalytics.tsx
│   │
│   ├── calendar/
│   │   ├── CalendarView.tsx
│   │   ├── EventCard.tsx
│   │   └── EventDialog.tsx
│   │
│   ├── billing/
│   │   ├── InvoiceList.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── PaymentForm.tsx
│   │   └── RevenueChart.tsx
│   │
│   └── analytics/
│       ├── AttentionScoreDashboard.tsx
│       ├── CohortProgressChart.tsx
│       ├── RevenueChart.tsx
│       └── EngagementMetrics.tsx
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── utils.ts
│   ├── validations.ts
│   ├── email.ts
│   ├── google-calendar.ts
│   └── date-utils.ts
│
├── hooks/
│   ├── useMembers.ts
│   ├── useAppointments.ts
│   ├── useCohorts.ts
│   ├── useEntries.ts
│   └── useAuth.ts
│
├── types/
│   ├── index.ts
│   ├── api.ts
│   └── database.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   │   ├── api/
│   │   ├── components/
│   │   └── lib/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── appointments.spec.ts
│       ├── cohorts.spec.ts
│       └── check-ins.spec.ts
│
├── public/
│   └── images/
│
├── .env.example
├── .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── playwright.config.ts
├── vitest.config.ts
└── README.md
```

---

## 🚀 Development Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Set up project infrastructure

**Tasks**:
1. Initialize Next.js 15 project with TypeScript and Tailwind
2. Set up Prisma with PostgreSQL
3. Configure Auth.js v5 (Google OAuth + Email/Password)
4. Install and configure shadcn/ui
5. Set up folder structure
6. Create base layout components (Sidebar, Header, MobileNav)
7. Configure environment variables
8. Set up Git repository

**Deliverables**:
- ✅ Working Next.js app with TypeScript
- ✅ Prisma connected to PostgreSQL
- ✅ Auth.js authentication working (login/logout)
- ✅ shadcn/ui components installed
- ✅ Basic layout structure
- ✅ Git repository initialized

---

### Phase 2: Core Authentication & User Management (Week 2-3)

**Goal**: Complete authentication system and basic user management

**Tasks**:
1. Implement multi-provider auth (Google OAuth + Email/Password)
2. Create User model with role-based access
3. Build login/register pages
4. Implement protected routes middleware
5. Create admin user management pages
6. Build user CRUD API routes
7. Add real-time user search
8. Create user detail pages

**Deliverables**:
- ✅ Working login with Google and email/password
- ✅ Role-based access control (ADMIN, COACH, CLIENT)
- ✅ Admin can manage users
- ✅ Protected routes working
- ✅ User search functionality

---

### Phase 3: Appointment System (Week 3-4)

**Goal**: Build appointment scheduling from Personal Trainer Planner

**Tasks**:
1. Create Appointment model
2. Build appointment CRUD API routes
3. Create appointment form with React Hook Form + Zod
4. Build calendar view (monthly + weekly)
5. Implement appointment conflict detection
6. Add recurring appointments support
7. Create appointment detail pages
8. Build appointment list views

**Deliverables**:
- ✅ Coaches can create/edit/delete appointments
- ✅ Calendar view showing all appointments
- ✅ Conflict detection working
- ✅ Recurring appointments supported
- ✅ Clients can view their appointments

---

### Phase 4: Bootcamp/Group Classes (Week 4-5)

**Goal**: Implement group class system from Personal Trainer Planner

**Tasks**:
1. Create Bootcamp and BootcampAttendee models
2. Build bootcamp CRUD API routes
3. Create bootcamp form
4. Build attendee management
5. Add capacity limits
6. Create bootcamp calendar view
7. Build client bootcamp registration
8. Add credit system (optional)

**Deliverables**:
- ✅ Coaches can create group classes
- ✅ Clients can register for classes
- ✅ Capacity limits enforced
- ✅ Bootcamps show in calendar
- ✅ Attendee tracking working

---

### Phase 5: Cohort System (Week 5-6)

**Goal**: Add cohort-based program management from CoachFit

**Tasks**:
1. Create Cohort, CohortMembership, CoachCohortMembership models
2. Build cohort CRUD API routes
3. Create cohort form
4. Implement multi-coach assignment
5. Build member management for cohorts
6. Create cohort detail pages
7. Add cohort status management
8. Build cohort list/overview

**Deliverables**:
- ✅ Admins can create cohorts
- ✅ Multiple coaches per cohort
- ✅ Client assignment to cohorts
- ✅ Cohort detail views
- ✅ Active/completed/archived status

---

### Phase 6: Daily Check-In System (Week 6-7)

**Goal**: Implement daily health tracking from CoachFit

**Tasks**:
1. Create Entry model with unique constraint
2. Build entry CRUD API routes
3. Create daily check-in form
4. Add custom response fields (JSON)
5. Build check-in history view
6. Create progress charts (Recharts)
7. Add data source tracking
8. Implement check-in reminders

**Deliverables**:
- ✅ Clients can log daily metrics
- ✅ One entry per user per day
- ✅ Custom questions per cohort
- ✅ Progress charts showing trends
- ✅ Check-in history view

---

### Phase 7: Weekly Questionnaires (Week 7-8)

**Goal**: Add weekly questionnaire system from CoachFit

**Tasks**:
1. Create QuestionnaireBundle and Response models
2. Build questionnaire CRUD API routes
3. Create questionnaire form (SurveyJS integration)
4. Build questionnaire builder UI
5. Implement week-based availability
6. Create response analytics
7. Build coach review interface
8. Add completion tracking

**Deliverables**:
- ✅ Admins/coaches can create questionnaires
- ✅ Clients complete weekly questionnaires
- ✅ Week numbers calculated from cohort start date
- ✅ Coaches can view aggregated responses
- ✅ Response analytics dashboard

---

### Phase 8: Billing & Payments (Week 8-9)

**Goal**: Implement billing system from Personal Trainer Planner

**Tasks**:
1. Create Invoice model
2. Build invoice generation logic
3. Create payment tracking
4. Implement monthly invoice aggregation
5. Build invoice email sending (Resend)
6. Create revenue reporting
7. Add CSV export for accounting
8. Build admin billing dashboard

**Deliverables**:
- ✅ Automatic invoice generation
- ✅ Email invoices sent monthly
- ✅ Revenue reporting with charts
- ✅ CSV export for tax reporting
- ✅ Admin billing overview

---

### Phase 9: Calendar Integration (Week 9-10)

**Goal**: Add Google Calendar sync from Personal Trainer Planner

**Tasks**:
1. Set up Google Calendar API service account
2. Implement calendar sync logic
3. Add automatic event creation
4. Build bidirectional sync
5. Handle recurring events
6. Add sync error handling
7. Create manual sync option
8. Add sync status indicators

**Deliverables**:
- ✅ Appointments auto-sync to Google Calendar
- ✅ Calendar updates reflect in app
- ✅ Recurring events synced properly
- ✅ Error handling and retry logic
- ✅ Manual sync button available

---

### Phase 10: Analytics & Insights (Week 10-11)

**Goal**: Build analytics dashboards combining both systems

**Tasks**:
1. Create admin analytics dashboard
2. Build coach analytics (cohort progress, attention scores)
3. Create client progress dashboard
4. Implement attention score calculation
5. Build cohort engagement metrics
6. Add revenue analytics charts
7. Create weekly summary emails
8. Build insight generation system

**Deliverables**:
- ✅ Admin dashboard with platform metrics
- ✅ Coach dashboard with client insights
- ✅ Client dashboard with progress tracking
- ✅ Attention scores for prioritization
- ✅ Automated weekly summaries

---

### Phase 11: HealthKit Integration (Week 11-12)

**Goal**: Add HealthKit sync from CoachFit

**Tasks**:
1. Create HealthKitWorkout and SleepRecord models
2. Build HealthKit data ingestion API
3. Create pairing code system
4. Implement data source tracking
5. Build HealthKit data explorer for coaches
6. Add workout/sleep data visualization
7. Create iOS pairing instructions
8. Add feature flag for HealthKit

**Deliverables**:
- ✅ API endpoints for HealthKit data
- ✅ Pairing code system working
- ✅ Workout and sleep data stored
- ✅ Coach can view HealthKit data
- ✅ Data source badges showing origin

---

### Phase 12: Email System (Week 12-13)

**Goal**: Implement comprehensive email system

**Tasks**:
1. Set up Resend API integration
2. Create email templates (React Email)
3. Build welcome email flow
4. Implement appointment confirmation emails
5. Add invoice emails
6. Create cohort invitation emails
7. Build check-in reminder emails
8. Add weekly coach summary emails

**Deliverables**:
- ✅ All transactional emails working
- ✅ Email templates customizable
- ✅ Automated email sending
- ✅ Email tracking and logging
- ✅ Email preview in admin

---

### Phase 13: Testing (Week 13-14)

**Goal**: Comprehensive test coverage

**Tasks**:
1. Set up Vitest for unit tests
2. Set up Playwright for E2E tests
3. Write API route tests
4. Write component tests
5. Write E2E test scenarios
6. Create test database seeding
7. Add test data generators
8. Set up CI/CD pipeline

**Deliverables**:
- ✅ Unit tests for API routes
- ✅ Component tests for key features
- ✅ E2E tests for critical flows
- ✅ Test coverage reports
- ✅ CI/CD pipeline running tests

---

### Phase 14: Polish & Production (Week 14-16)

**Goal**: Production-ready deployment

**Tasks**:
1. Performance optimization
2. Error boundary implementation
3. Loading state improvements
4. Mobile responsiveness check
5. Accessibility audit
6. SEO optimization
7. Security audit
8. Deploy to Vercel + Railway
9. Set up monitoring (Sentry)
10. Documentation completion

**Deliverables**:
- ✅ App deployed to production
- ✅ All features working smoothly
- ✅ Mobile-responsive
- ✅ Error monitoring active
- ✅ Documentation complete

---

## 📝 First Prompt for Claude Code

```
I want to build a comprehensive fitness platform by combining the best parts of 
two existing projects:

1. Personal Trainer Planner (https://github.com/james-langridge/personal-trainer-planner)
   - Use as base framework: Next.js 15, shadcn/ui, Auth.js, feature-based architecture
   - Keep: appointment scheduling, billing, calendar sync, testing setup
   
2. CoachFit (https://github.com/adamswbrown/CoachFit)
   - Add features: cohort system, daily check-ins, health analytics, HealthKit integration

DEVELOPMENT ENVIRONMENT:
- macOS local development
- Local PostgreSQL via Homebrew
- Deployment: Vercel (hosting) + Railway (database)

TECH STACK DECISIONS:
- Framework: Next.js 15.1+ with App Router
- Language: TypeScript 5.7+
- UI: shadcn/ui + Tailwind CSS 4.1+
- Database: PostgreSQL 15+ via Prisma 6.3+
- Auth: Auth.js v5 (Google OAuth + Email/Password)
- State: TanStack Query v5
- Forms: React Hook Form + Zod
- Charts: Recharts
- Testing: Vitest + Playwright

ARCHITECTURE PRINCIPLES:
1. Use Personal Trainer's feature-based architecture
2. Use integer IDs (not CUIDs)
3. Cohorts complement appointments (don't replace)
4. Both systems coexist peacefully
5. Production-ready from day one

PHASE 1 TASKS:
Please complete the foundation setup:

1. Create Next.js 15 project with TypeScript and Tailwind CSS
2. Set up Prisma with PostgreSQL connection
3. Create complete database schema (I'll provide the full schema)
4. Configure Auth.js v5 with Google OAuth and email/password
5. Install and configure shadcn/ui components
6. Create folder structure following feature-based architecture
7. Set up base layout components (Sidebar, Header, MobileNav)
8. Configure environment variables (.env.example)
9. Set up git repository with proper .gitignore

Before proceeding, show me:
- Folder structure you'll create
- Commands you'll run
- Files you'll generate
- Environment variables needed

Then proceed with implementation.
```

---

## 📋 Environment Variables Template

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gym_platform_dev"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend Email
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="noreply@yourdomain.com"

# Google Calendar (Optional)
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: Sentry
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=""
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/api/members.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/members/route'

describe('/api/members', () => {
  beforeEach(async () => {
    // Clean database
  })

  it('should return all members', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.members).toBeArray()
  })

  it('should create a new member', async () => {
    const request = new Request('http://localhost:3000/api/members', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(201)
    expect(data.user.email).toBe('test@example.com')
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/appointments.spec.ts
import { test, expect } from '@playwright/test'

test('coach can create appointment', async ({ page }) => {
  // Login as coach
  await page.goto('/login')
  await page.fill('input[name="email"]', 'coach@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Navigate to calendar
  await page.goto('/coach/calendar')
  
  // Create appointment
  await page.click('button:has-text("New Appointment")')
  await page.fill('input[name="clientName"]', 'John Doe')
  await page.fill('input[name="startTime"]', '2025-02-01T10:00')
  await page.fill('input[name="endTime"]', '2025-02-01T11:00')
  await page.fill('input[name="fee"]', '75.00')
  await page.click('button:has-text("Create")')
  
  // Verify appointment appears
  await expect(page.locator('text=John Doe')).toBeVisible()
})
```

---

## 🚢 Deployment Checklist

### Vercel Setup

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Configure deployment protection

### Railway Setup

- [ ] Create Railway account
- [ ] Provision PostgreSQL database
- [ ] Copy connection string
- [ ] Add DATABASE_URL to Vercel
- [ ] Run migrations on Railway database
- [ ] Set up database backups
- [ ] Configure connection pooling

### Post-Deployment

- [ ] Run smoke tests on production
- [ ] Verify all features working
- [ ] Check email delivery
- [ ] Test OAuth flows
- [ ] Monitor error rates
- [ ] Set up Sentry (optional)
- [ ] Configure uptime monitoring

---

## 📊 Success Metrics

### Technical Metrics
- [ ] 100% TypeScript coverage
- [ ] >80% test coverage
- [ ] <2s page load time
- [ ] <100ms API response time
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Lighthouse score >90

### Functional Metrics
- [ ] All authentication flows work
- [ ] Appointments can be scheduled
- [ ] Cohorts can be created and managed
- [ ] Daily check-ins can be logged
- [ ] Invoices generate correctly
- [ ] Google Calendar syncs properly
- [ ] HealthKit data imports successfully

---

## 🎯 Project Completion Criteria

The project is complete when:

1. ✅ All 14 phases are implemented and tested
2. ✅ Application is deployed to production
3. ✅ All features from both projects are integrated
4. ✅ Test coverage is >80%
5. ✅ Documentation is complete
6. ✅ Admin can manage users, cohorts, and billing
7. ✅ Coaches can schedule appointments and manage cohorts
8. ✅ Clients can book appointments and log daily check-ins
9. ✅ All automated emails are working
10. ✅ Google Calendar sync is operational
11. ✅ HealthKit integration is functional
12. ✅ Analytics dashboards are displaying data
13. ✅ Mobile responsiveness is verified
14. ✅ Security audit is passed

---

## 📚 Additional Resources

### Reference Documentation
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Auth.js: https://authjs.dev
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query
- Recharts: https://recharts.org

### Reference Projects
- Personal Trainer Planner: https://github.com/james-langridge/personal-trainer-planner
- CoachFit: https://github.com/adamswbrown/CoachFit

### Tools
- Prisma Studio: Database GUI
- Postman: API testing
- TablePlus: PostgreSQL client
- Vercel: Deployment platform
- Railway: Database hosting

---

This specification provides everything Claude Code needs to build the complete unified platform. Start with Phase 1 and work through systematically!

---

## 🎯 Core Principles

1. **Use Personal Trainer Planner as the foundation** - proven architecture, UI, auth
2. **Add CoachFit features as extensions** - cohorts complement appointments, not replace
3. **No breaking changes** - both systems coexist peacefully
4. **Production-ready from day one** - testing, monitoring, proper error handling
5. **Feature-based architecture** - maintainable, scalable code organization

---

## 📋 Tech Stack (Final Decision)

### Frontend
- **Framework**: Next.js 15.1+ with App Router
- **Language**: TypeScript 5.7+
- **UI Library**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS 4.1+
- **Icons**: Lucide React
- **Charts**: Recharts 3.6+

### Backend
- **Runtime**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 6.3+
- **Authentication**: Auth.js v5 (NextAuth)
- **Email**: Resend
- **Calendar**: Google Calendar API

### State & Forms
- **Server State**: TanStack Query v5
- **Forms**: React Hook Form + Zod validation
- **Date Utils**: date-fns

### Testing & Quality
- **Unit Tests**: Vitest
- **E2E Tests**: Playwright
- **Linting**: ESLint
- **Formatting**: Prettier
- **Error Tracking**: Sentry (optional)

### Infrastructure
- **Hosting**: Vercel
- **Database Hosting**: Railway
- **Version Control**: Git + GitHub

---

## 🗄️ Complete Database Schema

### Phase 1: Core Models (Week 1-2)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTICATION & USERS
// ============================================

model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  password      String?   // Nullable for OAuth-only users
  name          String?
  image         String?
  emailVerified Boolean   @default(false)
  role          Role      @default(CLIENT)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Personal Training Relations
  appointments       Appointment[]
  bootcampAttendees  BootcampAttendee[]
  workouts           Workout[]
  invoices           Invoice[]
  
  // Health Coaching Relations
  cohortMemberships  CohortMembership[]
  coachCohorts       CoachCohortMembership[]  @relation("CoachCohorts")
  entries            Entry[]
  questionnaireResponses WeeklyQuestionnaireResponse[]
  coachNotes         CoachNote[]
  
  // HealthKit Relations
  healthKitWorkouts  HealthKitWorkout[]
  sleepRecords       SleepRecord[]
  
  // OAuth Relations
  accounts      Account[]
  sessions      Session[]
  
  @@map("users")
  @@index([email])
}

enum Role {
  ADMIN
  COACH
  CLIENT
}

// NextAuth Models
model Account {
  id                Int     @id @default(autoincrement())
  userId            Int
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           Int      @id @default(autoincrement())
  sessionToken String   @unique
  userId       Int
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// PERSONAL TRAINING (From Personal Trainer Planner)
// ============================================

model Appointment {
  id            Int      @id @default(autoincrement())
  userId        Int
  startTime     DateTime
  endTime       DateTime
  fee           Decimal  @db.Decimal(10, 2)
  status        AttendanceStatus @default(NOT_ATTENDED)
  notes         String?
  googleEventId String?  // For calendar sync
  
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  invoice Invoice? @relation(fields: [invoiceId], references: [id])
  invoiceId Int?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("appointments")
  @@index([userId, startTime])
}

enum AttendanceStatus {
  ATTENDED
  NOT_ATTENDED
}

model Bootcamp {
  id         Int      @id @default(autoincrement())
  name       String
  startTime  DateTime
  endTime    DateTime
  location   String?
  capacity   Int?
  description String?
  
  attendees  BootcampAttendee[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("bootcamps")
  @@index([startTime])
}

model BootcampAttendee {
  id         Int      @id @default(autoincrement())
  bootcampId Int
  userId     Int
  
  bootcamp   Bootcamp @relation(fields: [bootcampId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([bootcampId, userId])
  @@map("bootcamp_attendees")
}

model Workout {
  id          Int      @id @default(autoincrement())
  userId      Int
  title       String
  description String?
  status      WorkoutStatus @default(NOT_STARTED)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("workouts")
}

enum WorkoutStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

model Invoice {
  id          Int      @id @default(autoincrement())
  userId      Int
  month       DateTime
  totalAmount Decimal  @db.Decimal(10, 2)
  emailSent   Boolean  @default(false)
  emailSentAt DateTime?
  
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointments Appointment[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("invoices")
  @@index([userId, month])
}

// ============================================
// HEALTH COACHING (From CoachFit)
// ============================================

model Cohort {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime?
  status      CohortStatus @default(ACTIVE)
  
  coaches     CoachCohortMembership[]
  members     CohortMembership[]
  bundles     QuestionnaireBundle[]
  config      CohortCheckInConfig?
  insights    AdminInsight[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("cohorts")
  @@index([status, startDate])
}

enum CohortStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model CohortMembership {
  id        Int      @id @default(autoincrement())
  cohortId  Int
  userId    Int
  status    MembershipStatus @default(ACTIVE)
  joinedAt  DateTime @default(now())
  leftAt    DateTime?
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([cohortId, userId])
  @@map("cohort_memberships")
  @@index([cohortId, status])
}

enum MembershipStatus {
  ACTIVE
  PAUSED
  INACTIVE
}

model CoachCohortMembership {
  id       Int      @id @default(autoincrement())
  cohortId Int
  coachId  Int
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  coach  User   @relation("CoachCohorts", fields: [coachId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([cohortId, coachId])
  @@map("coach_cohort_memberships")
}

model Entry {
  id              Int      @id @default(autoincrement())
  userId          Int
  date            DateTime @default(now())
  
  // Health metrics
  weight          Float?
  steps           Int?
  calories        Int?
  sleepQuality    Int?     // 1-10 scale
  perceivedStress Int?     // 1-10 scale
  notes           String?
  
  // Custom responses per cohort
  customResponses Json?
  
  // Data source tracking
  dataSources     Json?    // {"weight": "manual", "steps": "healthkit"}
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, date])
  @@map("entries")
  @@index([userId, date])
}

model QuestionnaireBundle {
  id          Int      @id @default(autoincrement())
  cohortId    Int
  weekNumber  Int
  questions   Json     // SurveyJS format
  isActive    Boolean  @default(true)
  
  cohort    Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  responses WeeklyQuestionnaireResponse[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([cohortId, weekNumber])
  @@map("questionnaire_bundles")
}

model WeeklyQuestionnaireResponse {
  id         Int      @id @default(autoincrement())
  userId     Int
  bundleId   Int
  weekNumber Int
  responses  Json     // User's answers
  status     ResponseStatus @default(IN_PROGRESS)
  
  user   User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  bundle QuestionnaireBundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, bundleId])
  @@map("weekly_questionnaire_responses")
}

enum ResponseStatus {
  IN_PROGRESS
  COMPLETED
}

model CohortCheckInConfig {
  id        Int    @id @default(autoincrement())
  cohortId  Int    @unique
  prompts   Json   // Custom check-in questions
  
  cohort Cohort @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("cohort_check_in_configs")
}

model CoachNote {
  id        Int      @id @default(autoincrement())
  userId    Int      // Client
  coachId   Int      // Coach (not strictly enforced by FK)
  weekNumber Int
  notes     String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("coach_notes")
  @@index([userId, weekNumber])
}

model AdminInsight {
  id        Int      @id @default(autoincrement())
  cohortId  Int?
  title     String
  description String
  priority  InsightPriority @default(MEDIUM)
  status    InsightStatus   @default(ACTIVE)
  
  cohort Cohort? @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("admin_insights")
  @@index([status, priority])
}

enum InsightPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum InsightStatus {
  ACTIVE
  RESOLVED
  DISMISSED
}

// ============================================
// HEALTHKIT INTEGRATION (From CoachFit)
// ============================================

model HealthKitWorkout {
  id           Int      @id @default(autoincrement())
  userId       Int
  workoutType  String
  startTime    DateTime
  endTime      DateTime
  duration     Int      // seconds
  calories     Float?
  distance     Float?   // meters
  heartRate    Json?    // {avg: 150, max: 180}
  metadata     Json?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@map("healthkit_workouts")
  @@index([userId, startTime])
}

model SleepRecord {
  id            Int      @id @default(autoincrement())
  userId        Int
  startTime     DateTime
  endTime       DateTime
  totalSleep    Int      // minutes
  inBedTime     Int      // minutes
  deepSleep     Int?     // minutes
  remSleep      Int?     // minutes
  coreSleep     Int?     // minutes
  sourceDevice  String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@map("sleep_records")
  @@index([userId, startTime])
}

// ============================================
// SYSTEM & ADMIN (From CoachFit)
// ============================================

model SystemSettings {
  id    Int    @id @default(autoincrement())
  key   String @unique
  value Json
  
  updatedAt DateTime @updatedAt
  
  @@map("system_settings")
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     // Actor (null if system)
  action    String   // CREATE_COHORT, DELETE_USER, etc.
  target    String?  // Resource affected
  metadata  Json?    // Additional context
  
  createdAt DateTime @default(now())
  
  @@map("audit_logs")
  @@index([createdAt])
}
```

---

## 🏗️ Project Structure

```
gym-platform/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── members/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── cohorts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── billing/
│   │   │   │   └── page.tsx
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── coach/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── cohorts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx
│   │   │   ├── check-ins/
│   │   │   │   └── page.tsx
│   │   │   └── analytics/
│   │   │       └── page.tsx
│   │   │
│   │   ├── client/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── check-in/
│   │   │   │   └── page.tsx
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx
│   │   │   ├── programs/
│   │   │   │   └── page.tsx
│   │   │   └── progress/
│   │   │       └── page.tsx
│   │   │
│   │   └── layout.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── members/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── appointments/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── bootcamps/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── cohorts/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── entries/
│   │   │   ├── route.ts
│   │   │   └── today/
│   │   │       └── route.ts
│   │   ├── questionnaires/
│   │   │   └── route.ts
│   │   ├── payments/
│   │   │   └── route.ts
│   │   ├── invoices/
│   │   │   └── route.ts
│   │   └── healthkit/
│   │       ├── workouts/
│   │       │   └── route.ts
│   │       └── sleep/
│   │           └── route.ts
│   │
│   ├── actions/
│   │   ├── members.ts
│   │   ├── appointments.ts
│   │   ├── cohorts.ts
│   │   ├── entries.ts
│   │   └── auth.ts
│   │
│   └── layout.tsx
│   └── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── calendar.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── Footer.tsx
│   │
│   └── providers/
│       ├── QueryProvider.tsx
│       ├── ThemeProvider.tsx
│       └── ToastProvider.tsx
│
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthButtons.tsx
│   │
│   ├── members/
│   │   ├── MemberTable.tsx
│   │   ├── MemberSearch.tsx
│   │   ├── MemberForm.tsx
│   │   └── MemberDetail.tsx
│   │
│   ├── appointments/
│   │   ├── AppointmentForm.tsx
│   │   ├── AppointmentList.tsx
│   │   └── AppointmentCalendar.tsx
│   │
│   ├── bootcamps/
│   │   ├── BootcampForm.tsx
│   │   ├── BootcampList.tsx
│   │   └── BootcampAttendees.tsx
│   │
│   ├── cohorts/
│   │   ├── CohortForm.tsx
│   │   ├── CohortList.tsx
│   │   ├── CohortDetail.tsx
│   │   ├── MemberManagement.tsx
│   │   └── CoachAssignment.tsx
│   │
│   ├── check-ins/
│   │   ├── DailyCheckInForm.tsx
│   │   ├── CheckInHistory.tsx
│   │   ├── CheckInChart.tsx
│   │   └── CheckInCalendar.tsx
│   │
│   ├── questionnaires/
│   │   ├── QuestionnaireForm.tsx
│   │   ├── QuestionnaireBuilder.tsx
│   │   └── ResponseAnalytics.tsx
│   │
│   ├── calendar/
│   │   ├── CalendarView.tsx
│   │   ├── EventCard.tsx
│   │   └── EventDialog.tsx
│   │
│   ├── billing/
│   │   ├── InvoiceList.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── PaymentForm.tsx
│   │   └── RevenueChart.tsx
│   │
│   └── analytics/
│       ├── AttentionScoreDashboard.tsx
│       ├── CohortProgressChart.tsx
│       ├── RevenueChart.tsx
│       └── EngagementMetrics.tsx
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── utils.ts
│   ├── validations.ts
│   ├── email.ts
│   ├── google-calendar.ts
│   └── date-utils.ts
│
├── hooks/
│   ├── useMembers.ts
│   ├── useAppointments.ts
│   ├── useCohorts.ts
│   ├── useEntries.ts
│   └── useAuth.ts
│
├── types/
│   ├── index.ts
│   ├── api.ts
│   └── database.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   │   ├── api/
│   │   ├── components/
│   │   └── lib/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── appointments.spec.ts
│       ├── cohorts.spec.ts
│       └── check-ins.spec.ts
│
├── public/
│   └── images/
│
├── .env.example
├── .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── playwright.config.ts
├── vitest.config.ts
└── README.md
```

---

## 🚀 Development Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Set up project infrastructure

**Tasks**:
1. Initialize Next.js 15 project with TypeScript and Tailwind
2. Set up Prisma with PostgreSQL
3. Configure Auth.js v5 (Google OAuth + Email/Password)
4. Install and configure shadcn/ui
5. Set up folder structure
6. Create base layout components (Sidebar, Header, MobileNav)
7. Configure environment variables
8. Set up Git repository

**Deliverables**:
- ✅ Working Next.js app with TypeScript
- ✅ Prisma connected to PostgreSQL
- ✅ Auth.js authentication working (login/logout)
- ✅ shadcn/ui components installed
- ✅ Basic layout structure
- ✅ Git repository initialized

---

### Phase 2: Core Authentication & User Management (Week 2-3)

**Goal**: Complete authentication system and basic user management

**Tasks**:
1. Implement multi-provider auth (Google OAuth + Email/Password)
2. Create User model with role-based access
3. Build login/register pages
4. Implement protected routes middleware
5. Create admin user management pages
6. Build user CRUD API routes
7. Add real-time user search
8. Create user detail pages

**Deliverables**:
- ✅ Working login with Google and email/password
- ✅ Role-based access control (ADMIN, COACH, CLIENT)
- ✅ Admin can manage users
- ✅ Protected routes working
- ✅ User search functionality

---

### Phase 3: Appointment System (Week 3-4)

**Goal**: Build appointment scheduling from Personal Trainer Planner

**Tasks**:
1. Create Appointment model
2. Build appointment CRUD API routes
3. Create appointment form with React Hook Form + Zod
4. Build calendar view (monthly + weekly)
5. Implement appointment conflict detection
6. Add recurring appointments support
7. Create appointment detail pages
8. Build appointment list views

**Deliverables**:
- ✅ Coaches can create/edit/delete appointments
- ✅ Calendar view showing all appointments
- ✅ Conflict detection working
- ✅ Recurring appointments supported
- ✅ Clients can view their appointments

---

### Phase 4: Bootcamp/Group Classes (Week 4-5)

**Goal**: Implement group class system from Personal Trainer Planner

**Tasks**:
1. Create Bootcamp and BootcampAttendee models
2. Build bootcamp CRUD API routes
3. Create bootcamp form
4. Build attendee management
5. Add capacity limits
6. Create bootcamp calendar view
7. Build client bootcamp registration
8. Add credit system (optional)

**Deliverables**:
- ✅ Coaches can create group classes
- ✅ Clients can register for classes
- ✅ Capacity limits enforced
- ✅ Bootcamps show in calendar
- ✅ Attendee tracking working

---

### Phase 5: Cohort System (Week 5-6)

**Goal**: Add cohort-based program management from CoachFit

**Tasks**:
1. Create Cohort, CohortMembership, CoachCohortMembership models
2. Build cohort CRUD API routes
3. Create cohort form
4. Implement multi-coach assignment
5. Build member management for cohorts
6. Create cohort detail pages
7. Add cohort status management
8. Build cohort list/overview

**Deliverables**:
- ✅ Admins can create cohorts
- ✅ Multiple coaches per cohort
- ✅ Client assignment to cohorts
- ✅ Cohort detail views
- ✅ Active/completed/archived status

---

### Phase 6: Daily Check-In System (Week 6-7)

**Goal**: Implement daily health tracking from CoachFit

**Tasks**:
1. Create Entry model with unique constraint
2. Build entry CRUD API routes
3. Create daily check-in form
4. Add custom response fields (JSON)
5. Build check-in history view
6. Create progress charts (Recharts)
7. Add data source tracking
8. Implement check-in reminders

**Deliverables**:
- ✅ Clients can log daily metrics
- ✅ One entry per user per day
- ✅ Custom questions per cohort
- ✅ Progress charts showing trends
- ✅ Check-in history view

---

### Phase 7: Weekly Questionnaires (Week 7-8)

**Goal**: Add weekly questionnaire system from CoachFit

**Tasks**:
1. Create QuestionnaireBundle and Response models
2. Build questionnaire CRUD API routes
3. Create questionnaire form (SurveyJS integration)
4. Build questionnaire builder UI
5. Implement week-based availability
6. Create response analytics
7. Build coach review interface
8. Add completion tracking

**Deliverables**:
- ✅ Admins/coaches can create questionnaires
- ✅ Clients complete weekly questionnaires
- ✅ Week numbers calculated from cohort start date
- ✅ Coaches can view aggregated responses
- ✅ Response analytics dashboard

---

### Phase 8: Billing & Payments (Week 8-9)

**Goal**: Implement billing system from Personal Trainer Planner

**Tasks**:
1. Create Invoice model
2. Build invoice generation logic
3. Create payment tracking
4. Implement monthly invoice aggregation
5. Build invoice email sending (Resend)
6. Create revenue reporting
7. Add CSV export for accounting
8. Build admin billing dashboard

**Deliverables**:
- ✅ Automatic invoice generation
- ✅ Email invoices sent monthly
- ✅ Revenue reporting with charts
- ✅ CSV export for tax reporting
- ✅ Admin billing overview

---

### Phase 9: Calendar Integration (Week 9-10)

**Goal**: Add Google Calendar sync from Personal Trainer Planner

**Tasks**:
1. Set up Google Calendar API service account
2. Implement calendar sync logic
3. Add automatic event creation
4. Build bidirectional sync
5. Handle recurring events
6. Add sync error handling
7. Create manual sync option
8. Add sync status indicators

**Deliverables**:
- ✅ Appointments auto-sync to Google Calendar
- ✅ Calendar updates reflect in app
- ✅ Recurring events synced properly
- ✅ Error handling and retry logic
- ✅ Manual sync button available

---

### Phase 10: Analytics & Insights (Week 10-11)

**Goal**: Build analytics dashboards combining both systems

**Tasks**:
1. Create admin analytics dashboard
2. Build coach analytics (cohort progress, attention scores)
3. Create client progress dashboard
4. Implement attention score calculation
5. Build cohort engagement metrics
6. Add revenue analytics charts
7. Create weekly summary emails
8. Build insight generation system

**Deliverables**:
- ✅ Admin dashboard with platform metrics
- ✅ Coach dashboard with client insights
- ✅ Client dashboard with progress tracking
- ✅ Attention scores for prioritization
- ✅ Automated weekly summaries

---

### Phase 11: HealthKit Integration (Week 11-12)

**Goal**: Add HealthKit sync from CoachFit

**Tasks**:
1. Create HealthKitWorkout and SleepRecord models
2. Build HealthKit data ingestion API
3. Create pairing code system
4. Implement data source tracking
5. Build HealthKit data explorer for coaches
6. Add workout/sleep data visualization
7. Create iOS pairing instructions
8. Add feature flag for HealthKit

**Deliverables**:
- ✅ API endpoints for HealthKit data
- ✅ Pairing code system working
- ✅ Workout and sleep data stored
- ✅ Coach can view HealthKit data
- ✅ Data source badges showing origin

---

### Phase 12: Email System (Week 12-13)

**Goal**: Implement comprehensive email system

**Tasks**:
1. Set up Resend API integration
2. Create email templates (React Email)
3. Build welcome email flow
4. Implement appointment confirmation emails
5. Add invoice emails
6. Create cohort invitation emails
7. Build check-in reminder emails
8. Add weekly coach summary emails

**Deliverables**:
- ✅ All transactional emails working
- ✅ Email templates customizable
- ✅ Automated email sending
- ✅ Email tracking and logging
- ✅ Email preview in admin

---

### Phase 13: Testing (Week 13-14)

**Goal**: Comprehensive test coverage

**Tasks**:
1. Set up Vitest for unit tests
2. Set up Playwright for E2E tests
3. Write API route tests
4. Write component tests
5. Write E2E test scenarios
6. Create test database seeding
7. Add test data generators
8. Set up CI/CD pipeline

**Deliverables**:
- ✅ Unit tests for API routes
- ✅ Component tests for key features
- ✅ E2E tests for critical flows
- ✅ Test coverage reports
- ✅ CI/CD pipeline running tests

---

### Phase 14: Polish & Production (Week 14-16)

**Goal**: Production-ready deployment

**Tasks**:
1. Performance optimization
2. Error boundary implementation
3. Loading state improvements
4. Mobile responsiveness check
5. Accessibility audit
6. SEO optimization
7. Security audit
8. Deploy to Vercel + Railway
9. Set up monitoring (Sentry)
10. Documentation completion

**Deliverables**:
- ✅ App deployed to production
- ✅ All features working smoothly
- ✅ Mobile-responsive
- ✅ Error monitoring active
- ✅ Documentation complete

---

## 📝 First Prompt for Claude Code

```
I want to build a comprehensive fitness platform by combining the best parts of 
two existing projects:

1. Personal Trainer Planner (https://github.com/james-langridge/personal-trainer-planner)
   - Use as base framework: Next.js 15, shadcn/ui, Auth.js, feature-based architecture
   - Keep: appointment scheduling, billing, calendar sync, testing setup
   
2. CoachFit (https://github.com/adamswbrown/CoachFit)
   - Add features: cohort system, daily check-ins, health analytics, HealthKit integration

DEVELOPMENT ENVIRONMENT:
- macOS local development
- Local PostgreSQL via Homebrew
- Deployment: Vercel (hosting) + Railway (database)

TECH STACK DECISIONS:
- Framework: Next.js 15.1+ with App Router
- Language: TypeScript 5.7+
- UI: shadcn/ui + Tailwind CSS 4.1+
- Database: PostgreSQL 15+ via Prisma 6.3+
- Auth: Auth.js v5 (Google OAuth + Email/Password)
- State: TanStack Query v5
- Forms: React Hook Form + Zod
- Charts: Recharts
- Testing: Vitest + Playwright

ARCHITECTURE PRINCIPLES:
1. Use Personal Trainer's feature-based architecture
2. Use integer IDs (not CUIDs)
3. Cohorts complement appointments (don't replace)
4. Both systems coexist peacefully
5. Production-ready from day one

PHASE 1 TASKS:
Please complete the foundation setup:

1. Create Next.js 15 project with TypeScript and Tailwind CSS
2. Set up Prisma with PostgreSQL connection
3. Create complete database schema (I'll provide the full schema)
4. Configure Auth.js v5 with Google OAuth and email/password
5. Install and configure shadcn/ui components
6. Create folder structure following feature-based architecture
7. Set up base layout components (Sidebar, Header, MobileNav)
8. Configure environment variables (.env.example)
9. Set up git repository with proper .gitignore

Before proceeding, show me:
- Folder structure you'll create
- Commands you'll run
- Files you'll generate
- Environment variables needed

Then proceed with implementation.
```

---

## 📋 Environment Variables Template

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gym_platform_dev"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend Email
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="noreply@yourdomain.com"

# Google Calendar (Optional)
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: Sentry
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=""
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/api/members.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/members/route'

describe('/api/members', () => {
  beforeEach(async () => {
    // Clean database
  })

  it('should return all members', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.members).toBeArray()
  })

  it('should create a new member', async () => {
    const request = new Request('http://localhost:3000/api/members', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(201)
    expect(data.user.email).toBe('test@example.com')
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/appointments.spec.ts
import { test, expect } from '@playwright/test'

test('coach can create appointment', async ({ page }) => {
  // Login as coach
  await page.goto('/login')
  await page.fill('input[name="email"]', 'coach@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Navigate to calendar
  await page.goto('/coach/calendar')
  
  // Create appointment
  await page.click('button:has-text("New Appointment")')
  await page.fill('input[name="clientName"]', 'John Doe')
  await page.fill('input[name="startTime"]', '2025-02-01T10:00')
  await page.fill('input[name="endTime"]', '2025-02-01T11:00')
  await page.fill('input[name="fee"]', '75.00')
  await page.click('button:has-text("Create")')
  
  // Verify appointment appears
  await expect(page.locator('text=John Doe')).toBeVisible()
})
```

---

## 🚢 Deployment Checklist

### Vercel Setup

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Configure deployment protection

### Railway Setup

- [ ] Create Railway account
- [ ] Provision PostgreSQL database
- [ ] Copy connection string
- [ ] Add DATABASE_URL to Vercel
- [ ] Run migrations on Railway database
- [ ] Set up database backups
- [ ] Configure connection pooling

### Post-Deployment

- [ ] Run smoke tests on production
- [ ] Verify all features working
- [ ] Check email delivery
- [ ] Test OAuth flows
- [ ] Monitor error rates
- [ ] Set up Sentry (optional)
- [ ] Configure uptime monitoring

---

## 📊 Success Metrics

### Technical Metrics
- [ ] 100% TypeScript coverage
- [ ] >80% test coverage
- [ ] <2s page load time
- [ ] <100ms API response time
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Lighthouse score >90

### Functional Metrics
- [ ] All authentication flows work
- [ ] Appointments can be scheduled
- [ ] Cohorts can be created and managed
- [ ] Daily check-ins can be logged
- [ ] Invoices generate correctly
- [ ] Google Calendar syncs properly
- [ ] HealthKit data imports successfully

---

## 🎯 Project Completion Criteria

The project is complete when:

1. ✅ All 14 phases are implemented and tested
2. ✅ Application is deployed to production
3. ✅ All features from both projects are integrated
4. ✅ Test coverage is >80%
5. ✅ Documentation is complete
6. ✅ Admin can manage users, cohorts, and billing
7. ✅ Coaches can schedule appointments and manage cohorts
8. ✅ Clients can book appointments and log daily check-ins
9. ✅ All automated emails are working
10. ✅ Google Calendar sync is operational
11. ✅ HealthKit integration is functional
12. ✅ Analytics dashboards are displaying data
13. ✅ Mobile responsiveness is verified
14. ✅ Security audit is passed

---

## 📚 Additional Resources

### Reference Documentation
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Auth.js: https://authjs.dev
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query
- Recharts: https://recharts.org

### Reference Projects
- Personal Trainer Planner: https://github.com/james-langridge/personal-trainer-planner
- CoachFit: https://github.com/adamswbrown/CoachFit

### Tools
- Prisma Studio: Database GUI
- Postman: API testing
- TablePlus: PostgreSQL client
- Vercel: Deployment platform
- Railway: Database hosting

---

This specification provides everything Claude Code needs to build the complete unified platform. Start with Phase 1 and work through systematically!
