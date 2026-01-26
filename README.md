# Centurion

A unified fitness platform combining personal training management with health coaching capabilities.

## Overview

Centurion merges two specialized fitness applications into a comprehensive platform:
- **Personal Training**: Appointment scheduling, bootcamp management, client tracking, and invoicing
- **Health Coaching**: Cohort-based programs, health data tracking, and HealthKit integration

## Tech Stack

- **Framework**: Next.js 15.5+ (App Router)
- **Language**: TypeScript 5.7+
- **Database**: PostgreSQL 15+ with Prisma ORM 6.19+
- **Authentication**: Auth.js v5 (NextAuth)
- **Styling**: Tailwind CSS 4.1+ with shadcn/ui components
- **UI Components**: Radix UI primitives with custom theming
- **Validation**: Zod schemas
- **State Management**: React Query (TanStack Query)
- **Payments**: Stripe API with Payment Links
- **Calendar**: Google Calendar API integration
- **Charts**: Recharts for data visualization
- **Date Handling**: date-fns for date utilities

## Features

### Phase 1: Foundation ✅
- Next.js 15 with TypeScript and Tailwind CSS 4
- Prisma schema with 21 models (94/100 score)
- Security baseline (87/100 score)
- Git repository initialization

### Phase 2: Authentication & Layout ✅
- **Authentication**
  - Google OAuth provider
  - Email/password credentials
  - JWT session strategy (30-day expiration)
  - Role-based access control (ADMIN, COACH, CLIENT)
  - HIPAA-compliant audit logging
  - Protected routes middleware

- **Layout Components**
  - Responsive sidebar navigation
  - User header with profile dropdown
  - Mobile navigation drawer
  - Role-aware navigation menus
  - Dashboard with stats cards

### Phase 3: Member Management ✅
- **Member CRUD Operations**
  - List all members with stats (appointments, cohorts)
  - Create new member profiles
  - Edit member information
  - Delete members
  - Server actions with Zod validation

- **Member Views**
  - Table view with sortable columns
  - Detail page with appointments history
  - Cohort memberships tracking
  - Invoice history
  - Role-based access (ADMIN and COACH only)

### Phase 4: Appointments & Scheduling ✅
- **Appointment Management**
  - Create, update, delete appointments
  - Conflict detection (no overlapping sessions)
  - Attendance status tracking (SCHEDULED, ATTENDED, CANCELLED, NO_SHOW)
  - Fee tracking per appointment
  - Google Calendar synchronization

- **Calendar Views**
  - Month and week views with event cards
  - Calendar selection pre-fills appointment form
  - Date and time navigation
  - Visual appointment cards

- **Appointment Detail**
  - Inline editing for all fields
  - Status updates with inline feedback
  - Google Calendar sync/delete actions
  - Notes and recurrence display

### Phase 5: Bootcamps & Group Training ✅
- **Bootcamp Management**
  - Create recurring bootcamp sessions
  - Capacity limits and tracking
  - Attendee management with add/remove
  - Calendar integration

- **Coach Features**
  - Bootcamp list and calendar views
  - Capacity warnings (at-capacity alerts)
  - Attendee detail with member info
  - Monthly bootcamp schedule

- **Member Self-Registration**
  - Browse upcoming bootcamps at `/client/bootcamps`
  - Self-register and unregister
  - View personal bootcamp schedule
  - Capacity availability indicators

### Phase 6: Invoicing & Payments ✅
- **Invoice Generation**
  - Auto-generate from ATTENDED appointments
  - Manual invoice creation with custom amounts
  - Month-based billing cycles
  - Automatic appointment linking

- **Stripe Integration**
  - Payment link generation
  - Payment status tracking (UNPAID, PAID, OVERDUE, CANCELLED)
  - Webhook handling for payment events
  - Secure payment processing

- **Revenue Tracking**
  - Monthly revenue chart with year selector
  - Revenue statistics and aggregation
  - Invoice filtering by status, user, year
  - Payment history with timestamps

- **Invoice Management**
  - Invoice list with status badges
  - Detail view with appointment breakdown
  - Inline status updates
  - Payment link management and copying

### Phase 7: Cohort System ✅
- **Cohort Management**
  - Create cohorts with start/end dates
  - Multi-coach assignment per cohort
  - Member management with status tracking
  - Status transitions (ACTIVE → COMPLETED → ARCHIVED)

- **Member Tracking**
  - Member status: ACTIVE, PAUSED, INACTIVE
  - Join/leave timestamps
  - Cohort detail with inline editing
  - Member assignment with dropdown selection

- **Coach Assignment**
  - Multiple coaches per cohort
  - Coach list with add/remove functionality
  - Coach-specific cohort views
  - Assignment history

### Upcoming
- Phase 8: Daily Check-In System
- Phase 9: Health Data Tracking
- Phase 10: HealthKit Integration

## Database Schema

21 models across 4 domains:

**Authentication**
- User (with role: ADMIN, COACH, CLIENT)
- Account (OAuth providers)
- Session (user sessions)

**Personal Training**
- Appointment (1-on-1 sessions with Google Calendar sync)
- Bootcamp (group training sessions)
- BootcampAttendee (attendee registration)
- Workout (exercise tracking - future)
- Invoice (billing with Stripe payment links)
- InvoiceItem (future - line items)

**Health Coaching**
- Cohort (group programs with multi-coach support)
- CohortMembership (member tracking with status)
- CoachCohortMembership (multi-coach assignment)
- CohortCheckInConfig (check-in prompts - future)
- Entry (journal/progress - future)
- Metric (custom tracking - future)

**HealthKit Integration** (Planned)
- HealthKitWorkout
- HealthKitBloodPressure
- HealthKitBodyMetrics
- HealthKitHeartRate
- HealthKitNutrition
- SleepRecord
- StressLevel

**Key Features**
- Appointment conflicts automatically detected
- Invoices auto-generated from ATTENDED appointments
- Google Calendar bidirectional sync
- Stripe payment link generation
- Bootcamp capacity enforcement
- Cohort member status tracking (ACTIVE/PAUSED/INACTIVE)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/adamswbrown/centurion.git
cd centurion
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials and API keys:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your application URL (e.g., `http://localhost:3000`)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

**Optional (for full functionality):**
- `STRIPE_SECRET_KEY`: Stripe secret key for payment processing
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `GOOGLE_CALENDAR_CLIENT_EMAIL`: Service account email for Calendar API
- `GOOGLE_CALENDAR_PRIVATE_KEY`: Service account private key for Calendar API
- `GOOGLE_CALENDAR_CALENDAR_ID`: Target Google Calendar ID

4. Run database migrations:
```bash
npm run db:migrate
```

5. Generate Prisma Client:
```bash
npm run db:generate
```

6. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
centurion/
├── prisma/
│   └── schema.prisma          # Database schema (21 models)
├── src/
│   ├── app/
│   │   ├── actions/           # Server actions
│   │   │   ├── appointments.ts
│   │   │   ├── bootcamps.ts
│   │   │   ├── cohorts.ts
│   │   │   ├── invoices.ts
│   │   │   └── members.ts
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   └── webhooks/      # Stripe webhooks
│   │   ├── appointments/      # Appointment pages
│   │   ├── billing/           # Invoice pages
│   │   ├── bootcamps/         # Bootcamp pages
│   │   ├── client/            # Client-facing pages
│   │   │   └── bootcamps/     # Self-registration
│   │   ├── cohorts/           # Cohort pages
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── login/             # Login page
│   │   ├── members/           # Member pages
│   │   ├── register/          # Registration page
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # React Query provider
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── layouts/           # Layout components
│   │   └── ui/                # shadcn/ui components
│   ├── features/              # Feature modules
│   │   ├── appointments/      # Appointment UI
│   │   ├── bootcamps/         # Bootcamp UI
│   │   ├── cohorts/           # Cohort UI
│   │   ├── invoices/          # Invoice UI
│   │   └── members/           # Member UI
│   ├── hooks/                 # React Query hooks
│   │   ├── useAppointments.ts
│   │   ├── useBootcamps.ts
│   │   ├── useCohorts.ts
│   │   ├── useInvoices.ts
│   │   └── useMembers.ts
│   ├── lib/
│   │   ├── auth.ts            # Auth utilities
│   │   ├── calendar.ts        # Calendar utilities
│   │   ├── google-calendar.ts # Google Calendar API
│   │   ├── prisma.ts          # Prisma client
│   │   ├── stripe.ts          # Stripe integration
│   │   └── utils.ts           # Helper functions
│   ├── auth.ts                # Auth.js configuration
│   └── middleware.ts          # Route protection
├── .env.example               # Environment template
├── .env.local                 # Local environment (git-ignored)
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── STATE.md                   # Current project state
├── WORKLOG.md                 # Development log
└── unified-platform-spec.md   # Full specification
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npm run db:studio
```

## Authentication

### User Roles

- **ADMIN**: Full system access, user management
- **COACH**: Manage clients, appointments, bootcamps, cohorts
- **CLIENT**: View own data, book appointments, join cohorts

### Protected Routes

Routes are protected by role in [src/middleware.ts](src/middleware.ts):
- `/admin/*` - ADMIN only
- `/dashboard`, `/members`, `/appointments`, `/bootcamps`, `/cohorts`, `/billing` - ADMIN and COACH
- `/client/*` - All authenticated users (member self-service)

**Route Breakdown:**
- `/members` - Member management (ADMIN/COACH)
- `/appointments` - Appointment scheduling (ADMIN/COACH)
- `/bootcamps` - Bootcamp management (ADMIN/COACH)
- `/client/bootcamps` - Self-registration (all users)
- `/cohorts` - Cohort programs (ADMIN/COACH)
- `/billing` - Invoice and payment management (ADMIN only)

### OAuth Setup

1. Create Google OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID and Secret to `.env.local`

## Third-Party Integrations

### Google Calendar Integration

For appointment synchronization:

1. Create a service account in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Calendar API
3. Download service account JSON credentials
4. Add to `.env.local`:
   - `GOOGLE_CALENDAR_CLIENT_EMAIL`: Service account email
   - `GOOGLE_CALENDAR_PRIVATE_KEY`: Private key (replace `\n` with actual newlines)
   - `GOOGLE_CALENDAR_CALENDAR_ID`: Target calendar ID
5. Share your Google Calendar with the service account email

### Stripe Payment Integration

For invoice payment processing:

1. Create account at [Stripe](https://stripe.com)
2. Get API keys from Stripe Dashboard
3. Add to `.env.local`:
   - `STRIPE_SECRET_KEY`: Secret key (starts with `sk_test_` or `sk_live_`)
   - `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (from webhook settings)
4. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Subscribe to events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`

**Webhook Testing:**
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook
stripe trigger checkout.session.completed
```

## Key Features Implemented

### Appointment Scheduling
- **Calendar Views**: Month and week views with drag-to-create
- **Conflict Detection**: Automatic detection of overlapping appointments
- **Google Calendar Sync**: Bidirectional sync with Google Calendar
- **Status Tracking**: SCHEDULED → ATTENDED → invoicing workflow
- **Inline Editing**: Quick updates without page refreshes

### Bootcamp Management
- **Group Sessions**: Recurring bootcamp scheduling
- **Capacity Management**: Set limits, track registrations, prevent overbooking
- **Self-Registration**: Members can browse and register at `/client/bootcamps`
- **Visual Indicators**: At-capacity warnings, spots remaining counts

### Invoicing & Payments
- **Auto-Generation**: Create invoices from attended appointments
- **Stripe Integration**: One-click payment links
- **Payment Tracking**: Real-time status updates via webhooks
- **Revenue Analytics**: Monthly revenue charts and statistics
- **Status Management**: UNPAID → PAID → reconciliation

### Cohort Programs
- **Multi-Coach Support**: Assign multiple coaches per cohort
- **Member Tracking**: ACTIVE/PAUSED/INACTIVE status management
- **Lifecycle Management**: ACTIVE → COMPLETED → ARCHIVED transitions
- **Inline Editing**: Update details directly from detail view

### Data Integrity
- **Conflict Prevention**: No overlapping appointments per member
- **Atomic Operations**: Transactions for invoice generation with appointment linking
- **Audit Trail**: Track payment history, member status changes
- **Decimal Precision**: Accurate financial calculations with Prisma Decimal

## Security

- **Password Requirements**: Minimum 8 characters with uppercase, lowercase, and number
- **Session Duration**: 30 days (configurable)
- **HIPAA Compliance**: Audit logging for all authentication events
- **Stripe Security**: PCI-compliant payment processing, webhook signature verification
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **API Authentication**: Protected server actions with role-based access

## Deployment

The application can be deployed to:
- **Vercel** (recommended for Next.js)
- **Railway** (PostgreSQL hosting)
- **AWS**, **GCP**, **Azure** (full control)

### Vercel Deployment

```bash
npm install -g vercel
vercel
```

**Required Environment Variables in Vercel:**
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Optional (for full features):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CALENDAR_CLIENT_EMAIL`
- `GOOGLE_CALENDAR_PRIVATE_KEY`
- `GOOGLE_CALENDAR_CALENDAR_ID`

**Post-Deployment:**
1. Configure Stripe webhook URL in Stripe Dashboard: `https://yourdomain.com/api/webhooks/stripe`
2. Share Google Calendar with service account email
3. Run database migrations: `npx prisma migrate deploy`

### Database Hosting

For production PostgreSQL:
- [Railway](https://railway.app) - Simple, developer-friendly
- [Supabase](https://supabase.com) - PostgreSQL with additional features
- [Neon](https://neon.tech) - Serverless PostgreSQL

## Contributing

This is a private project. Contact the repository owner for contribution guidelines.

## License

Private - All rights reserved

## Support

For issues or questions, please contact the development team.

---

**Built with** ❤️ **by the Centurion Team**

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
