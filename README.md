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

### Upcoming
- Phase 3: Client Management
- Phase 4: Appointments & Scheduling
- Phase 5: Bootcamps & Group Sessions
- Phase 6: Invoicing & Payments
- Phase 7: Health Coaching & Cohorts
- Phase 8: HealthKit Integration

## Database Schema

21 models across 4 domains:

**Authentication**
- User (with role: ADMIN, COACH, CLIENT)
- Account (OAuth providers)
- Session (user sessions)

**Personal Training**
- Appointment (1-on-1 sessions)
- Bootcamp (group training)
- BootcampAttendee
- Workout (exercise tracking)
- Invoice (billing)
- InvoiceItem

**Health Coaching**
- Cohort (group programs)
- CohortMembership
- CoachCohortMembership
- Entry (journal/progress)
- Metric (custom tracking)

**HealthKit Integration**
- HealthKitWorkout
- HealthKitBloodPressure
- HealthKitBodyMetrics
- HealthKitHeartRate
- HealthKitNutrition
- SleepRecord
- StressLevel

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
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your application URL (e.g., `http://localhost:3000`)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

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
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── layouts/           # Layout components
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts            # Auth utilities
│   │   ├── prisma.ts          # Prisma client
│   │   └── utils.ts           # Helper functions
│   ├── auth.ts                # Auth.js configuration
│   └── middleware.ts          # Route protection
├── .env.example               # Environment template
├── .env.local                 # Local environment (git-ignored)
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
└── tsconfig.json              # TypeScript configuration
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
- `/dashboard`, `/clients`, `/appointments`, `/bootcamps`, `/cohorts`, `/invoices` - ADMIN and COACH
- `/client/*` - All authenticated users

### OAuth Setup

1. Create Google OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID and Secret to `.env.local`

## Security

- **Password Requirements**: Minimum 8 characters with uppercase, lowercase, and number
- **Session Duration**: 30 days (configurable)
- **HIPAA Compliance**: Audit logging for all authentication events
- **Rate Limiting**: Planned for Phase 3
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries

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

Configure environment variables in Vercel dashboard.

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
