-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED', 'LATE_CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MembershipTierStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipPlanType" AS ENUM ('RECURRING', 'PACK', 'PREPAID');

-- CreateTable
CREATE TABLE "class_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 12,
    "defaultDurationMins" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" SERIAL NOT NULL,
    "classTypeId" INTEGER,
    "cohortId" INTEGER,
    "coachId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_registrations" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "waitlistPosition" INTEGER,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "promotedFromWaitlistAt" TIMESTAMP(3),

    CONSTRAINT "session_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "MembershipPlanType" NOT NULL,
    "sessionsPerWeek" INTEGER,
    "commitmentMonths" INTEGER,
    "monthlyPrice" DECIMAL(10,2),
    "totalSessions" INTEGER,
    "packPrice" DECIMAL(10,2),
    "durationDays" INTEGER,
    "prepaidPrice" DECIMAL(10,2),
    "lateCancelCutoffHours" INTEGER NOT NULL DEFAULT 2,
    "allowRepeatPurchase" BOOLEAN NOT NULL DEFAULT true,
    "purchasableByClient" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "penaltySystemEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_class_type_allowances" (
    "id" SERIAL NOT NULL,
    "membershipPlanId" INTEGER NOT NULL,
    "classTypeId" INTEGER NOT NULL,

    CONSTRAINT "membership_class_type_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memberships" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "MembershipTierStatus" NOT NULL DEFAULT 'ACTIVE',
    "sessionsRemaining" INTEGER,
    "stripeSubscriptionId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_types_name_idx" ON "class_types"("name");

-- CreateIndex
CREATE INDEX "class_types_isActive_idx" ON "class_types"("isActive");

-- CreateIndex
CREATE INDEX "class_sessions_coachId_idx" ON "class_sessions"("coachId");

-- CreateIndex
CREATE INDEX "class_sessions_cohortId_idx" ON "class_sessions"("cohortId");

-- CreateIndex
CREATE INDEX "class_sessions_startTime_idx" ON "class_sessions"("startTime");

-- CreateIndex
CREATE INDEX "class_sessions_status_idx" ON "class_sessions"("status");

-- CreateIndex
CREATE INDEX "class_sessions_classTypeId_idx" ON "class_sessions"("classTypeId");

-- CreateIndex
CREATE INDEX "class_sessions_coachId_startTime_idx" ON "class_sessions"("coachId", "startTime");

-- CreateIndex
CREATE INDEX "class_sessions_status_startTime_idx" ON "class_sessions"("status", "startTime");

-- CreateIndex
CREATE INDEX "session_registrations_sessionId_idx" ON "session_registrations"("sessionId");

-- CreateIndex
CREATE INDEX "session_registrations_userId_idx" ON "session_registrations"("userId");

-- CreateIndex
CREATE INDEX "session_registrations_status_idx" ON "session_registrations"("status");

-- CreateIndex
CREATE INDEX "session_registrations_sessionId_status_idx" ON "session_registrations"("sessionId", "status");

-- CreateIndex
CREATE INDEX "session_registrations_userId_status_idx" ON "session_registrations"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "session_registrations_sessionId_userId_key" ON "session_registrations"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "membership_plans_type_idx" ON "membership_plans"("type");

-- CreateIndex
CREATE INDEX "membership_plans_isActive_idx" ON "membership_plans"("isActive");

-- CreateIndex
CREATE INDEX "membership_plans_type_isActive_idx" ON "membership_plans"("type", "isActive");

-- CreateIndex
CREATE INDEX "membership_class_type_allowances_membershipPlanId_idx" ON "membership_class_type_allowances"("membershipPlanId");

-- CreateIndex
CREATE INDEX "membership_class_type_allowances_classTypeId_idx" ON "membership_class_type_allowances"("classTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_class_type_allowances_membershipPlanId_classType_key" ON "membership_class_type_allowances"("membershipPlanId", "classTypeId");

-- CreateIndex
CREATE INDEX "user_memberships_userId_idx" ON "user_memberships"("userId");

-- CreateIndex
CREATE INDEX "user_memberships_planId_idx" ON "user_memberships"("planId");

-- CreateIndex
CREATE INDEX "user_memberships_status_idx" ON "user_memberships"("status");

-- CreateIndex
CREATE INDEX "user_memberships_userId_status_idx" ON "user_memberships"("userId", "status");

-- CreateIndex
CREATE INDEX "user_memberships_stripeSubscriptionId_idx" ON "user_memberships"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "class_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_class_type_allowances" ADD CONSTRAINT "membership_class_type_allowances_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_class_type_allowances" ADD CONSTRAINT "membership_class_type_allowances_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "class_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
