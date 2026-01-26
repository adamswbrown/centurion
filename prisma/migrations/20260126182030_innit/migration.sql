-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isTestUser" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "pairing_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_coach_responses" (
    "id" SERIAL NOT NULL,
    "coachId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "loomUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_coach_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pairing_codes_code_key" ON "pairing_codes"("code");

-- CreateIndex
CREATE INDEX "pairing_codes_code_idx" ON "pairing_codes"("code");

-- CreateIndex
CREATE INDEX "pairing_codes_userId_idx" ON "pairing_codes"("userId");

-- CreateIndex
CREATE INDEX "pairing_codes_expiresAt_idx" ON "pairing_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions"("userId");

-- CreateIndex
CREATE INDEX "credit_transactions_createdById_idx" ON "credit_transactions"("createdById");

-- CreateIndex
CREATE INDEX "credit_transactions_createdAt_idx" ON "credit_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "weekly_coach_responses_coachId_clientId_idx" ON "weekly_coach_responses"("coachId", "clientId");

-- CreateIndex
CREATE INDEX "weekly_coach_responses_weekStart_idx" ON "weekly_coach_responses"("weekStart");

-- CreateIndex
CREATE INDEX "weekly_coach_responses_clientId_idx" ON "weekly_coach_responses"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_coach_responses_coachId_clientId_weekStart_key" ON "weekly_coach_responses"("coachId", "clientId", "weekStart");

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_coach_responses" ADD CONSTRAINT "weekly_coach_responses_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_coach_responses" ADD CONSTRAINT "weekly_coach_responses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
