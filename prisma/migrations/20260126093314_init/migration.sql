-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COACH', 'CLIENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ATTENDED', 'NOT_ATTENDED');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InsightPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'NOT_ATTENDED',
    "notes" TEXT,
    "googleEventId" TEXT,
    "invoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamps" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bootcamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp_attendees" (
    "id" SERIAL NOT NULL,
    "bootcampId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bootcamp_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "month" DATE NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "stripePaymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "CohortStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_memberships" (
    "id" SERIAL NOT NULL,
    "cohortId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "cohort_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_cohort_memberships" (
    "id" SERIAL NOT NULL,
    "cohortId" INTEGER NOT NULL,
    "coachId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_cohort_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "weight" DOUBLE PRECISION,
    "steps" INTEGER,
    "calories" INTEGER,
    "sleepQuality" INTEGER,
    "perceivedStress" INTEGER,
    "notes" TEXT,
    "customResponses" JSONB,
    "dataSources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_bundles" (
    "id" SERIAL NOT NULL,
    "cohortId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_questionnaire_responses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "responses" JSONB NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_check_in_configs" (
    "id" SERIAL NOT NULL,
    "cohortId" INTEGER NOT NULL,
    "prompts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohort_check_in_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_notes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "coachId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_insights" (
    "id" SERIAL NOT NULL,
    "cohortId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "InsightPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "InsightStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthkit_workouts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workoutType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "calories" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "heartRate" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthkit_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_records" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "totalSleep" INTEGER NOT NULL,
    "inBedTime" INTEGER NOT NULL,
    "deepSleep" INTEGER,
    "remSleep" INTEGER,
    "coreSleep" INTEGER,
    "sourceDevice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleep_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_sessionToken_idx" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "appointments_userId_idx" ON "appointments"("userId");

-- CreateIndex
CREATE INDEX "appointments_startTime_idx" ON "appointments"("startTime");

-- CreateIndex
CREATE INDEX "appointments_userId_startTime_idx" ON "appointments"("userId", "startTime");

-- CreateIndex
CREATE INDEX "appointments_invoiceId_idx" ON "appointments"("invoiceId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "bootcamps_startTime_idx" ON "bootcamps"("startTime");

-- CreateIndex
CREATE INDEX "bootcamps_name_idx" ON "bootcamps"("name");

-- CreateIndex
CREATE INDEX "bootcamp_attendees_bootcampId_idx" ON "bootcamp_attendees"("bootcampId");

-- CreateIndex
CREATE INDEX "bootcamp_attendees_userId_idx" ON "bootcamp_attendees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bootcamp_attendees_bootcampId_userId_key" ON "bootcamp_attendees"("bootcampId", "userId");

-- CreateIndex
CREATE INDEX "workouts_userId_idx" ON "workouts"("userId");

-- CreateIndex
CREATE INDEX "workouts_status_idx" ON "workouts"("status");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_month_idx" ON "invoices"("month");

-- CreateIndex
CREATE INDEX "invoices_userId_month_idx" ON "invoices"("userId", "month");

-- CreateIndex
CREATE INDEX "invoices_emailSent_idx" ON "invoices"("emailSent");

-- CreateIndex
CREATE INDEX "invoices_paymentStatus_idx" ON "invoices"("paymentStatus");

-- CreateIndex
CREATE INDEX "cohorts_status_idx" ON "cohorts"("status");

-- CreateIndex
CREATE INDEX "cohorts_startDate_idx" ON "cohorts"("startDate");

-- CreateIndex
CREATE INDEX "cohorts_status_startDate_idx" ON "cohorts"("status", "startDate");

-- CreateIndex
CREATE INDEX "cohorts_name_idx" ON "cohorts"("name");

-- CreateIndex
CREATE INDEX "cohort_memberships_cohortId_idx" ON "cohort_memberships"("cohortId");

-- CreateIndex
CREATE INDEX "cohort_memberships_userId_idx" ON "cohort_memberships"("userId");

-- CreateIndex
CREATE INDEX "cohort_memberships_cohortId_status_idx" ON "cohort_memberships"("cohortId", "status");

-- CreateIndex
CREATE INDEX "cohort_memberships_status_idx" ON "cohort_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_memberships_cohortId_userId_key" ON "cohort_memberships"("cohortId", "userId");

-- CreateIndex
CREATE INDEX "coach_cohort_memberships_cohortId_idx" ON "coach_cohort_memberships"("cohortId");

-- CreateIndex
CREATE INDEX "coach_cohort_memberships_coachId_idx" ON "coach_cohort_memberships"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_cohort_memberships_cohortId_coachId_key" ON "coach_cohort_memberships"("cohortId", "coachId");

-- CreateIndex
CREATE INDEX "entries_userId_idx" ON "entries"("userId");

-- CreateIndex
CREATE INDEX "entries_date_idx" ON "entries"("date");

-- CreateIndex
CREATE INDEX "entries_userId_date_idx" ON "entries"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "entries_userId_date_key" ON "entries"("userId", "date");

-- CreateIndex
CREATE INDEX "questionnaire_bundles_cohortId_idx" ON "questionnaire_bundles"("cohortId");

-- CreateIndex
CREATE INDEX "questionnaire_bundles_weekNumber_idx" ON "questionnaire_bundles"("weekNumber");

-- CreateIndex
CREATE INDEX "questionnaire_bundles_isActive_idx" ON "questionnaire_bundles"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_bundles_cohortId_weekNumber_key" ON "questionnaire_bundles"("cohortId", "weekNumber");

-- CreateIndex
CREATE INDEX "weekly_questionnaire_responses_userId_idx" ON "weekly_questionnaire_responses"("userId");

-- CreateIndex
CREATE INDEX "weekly_questionnaire_responses_bundleId_idx" ON "weekly_questionnaire_responses"("bundleId");

-- CreateIndex
CREATE INDEX "weekly_questionnaire_responses_weekNumber_idx" ON "weekly_questionnaire_responses"("weekNumber");

-- CreateIndex
CREATE INDEX "weekly_questionnaire_responses_status_idx" ON "weekly_questionnaire_responses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_questionnaire_responses_userId_bundleId_key" ON "weekly_questionnaire_responses"("userId", "bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_check_in_configs_cohortId_key" ON "cohort_check_in_configs"("cohortId");

-- CreateIndex
CREATE INDEX "coach_notes_userId_idx" ON "coach_notes"("userId");

-- CreateIndex
CREATE INDEX "coach_notes_coachId_idx" ON "coach_notes"("coachId");

-- CreateIndex
CREATE INDEX "coach_notes_userId_weekNumber_idx" ON "coach_notes"("userId", "weekNumber");

-- CreateIndex
CREATE INDEX "coach_notes_coachId_userId_idx" ON "coach_notes"("coachId", "userId");

-- CreateIndex
CREATE INDEX "admin_insights_cohortId_idx" ON "admin_insights"("cohortId");

-- CreateIndex
CREATE INDEX "admin_insights_status_idx" ON "admin_insights"("status");

-- CreateIndex
CREATE INDEX "admin_insights_priority_idx" ON "admin_insights"("priority");

-- CreateIndex
CREATE INDEX "admin_insights_status_priority_idx" ON "admin_insights"("status", "priority");

-- CreateIndex
CREATE INDEX "healthkit_workouts_userId_idx" ON "healthkit_workouts"("userId");

-- CreateIndex
CREATE INDEX "healthkit_workouts_startTime_idx" ON "healthkit_workouts"("startTime");

-- CreateIndex
CREATE INDEX "healthkit_workouts_userId_startTime_idx" ON "healthkit_workouts"("userId", "startTime");

-- CreateIndex
CREATE INDEX "healthkit_workouts_workoutType_idx" ON "healthkit_workouts"("workoutType");

-- CreateIndex
CREATE INDEX "sleep_records_userId_idx" ON "sleep_records"("userId");

-- CreateIndex
CREATE INDEX "sleep_records_startTime_idx" ON "sleep_records"("startTime");

-- CreateIndex
CREATE INDEX "sleep_records_userId_startTime_idx" ON "sleep_records"("userId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_key_idx" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp_attendees" ADD CONSTRAINT "bootcamp_attendees_bootcampId_fkey" FOREIGN KEY ("bootcampId") REFERENCES "bootcamps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp_attendees" ADD CONSTRAINT "bootcamp_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_memberships" ADD CONSTRAINT "cohort_memberships_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_memberships" ADD CONSTRAINT "cohort_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_cohort_memberships" ADD CONSTRAINT "coach_cohort_memberships_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_cohort_memberships" ADD CONSTRAINT "coach_cohort_memberships_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_bundles" ADD CONSTRAINT "questionnaire_bundles_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_questionnaire_responses" ADD CONSTRAINT "weekly_questionnaire_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_questionnaire_responses" ADD CONSTRAINT "weekly_questionnaire_responses_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "questionnaire_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_check_in_configs" ADD CONSTRAINT "cohort_check_in_configs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_insights" ADD CONSTRAINT "admin_insights_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthkit_workouts" ADD CONSTRAINT "healthkit_workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
