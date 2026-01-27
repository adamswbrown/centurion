-- CreateEnum
CREATE TYPE "CohortType" AS ENUM ('TIMED', 'ONGOING', 'CHALLENGE', 'CUSTOM');

-- AlterTable
ALTER TABLE "cohorts" ADD COLUMN     "customCohortTypeId" INTEGER,
ADD COLUMN     "membershipDurationMonths" INTEGER,
ADD COLUMN     "type" "CohortType";

-- CreateTable
CREATE TABLE "email_templates" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "textTemplate" TEXT NOT NULL,
    "availableTokens" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_cohort_types" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_cohort_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- CreateIndex
CREATE INDEX "email_templates_key_idx" ON "email_templates"("key");

-- CreateIndex
CREATE INDEX "email_templates_enabled_idx" ON "email_templates"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "custom_cohort_types_label_key" ON "custom_cohort_types"("label");

-- CreateIndex
CREATE INDEX "custom_cohort_types_createdBy_idx" ON "custom_cohort_types"("createdBy");

-- CreateIndex
CREATE INDEX "custom_cohort_types_createdAt_idx" ON "custom_cohort_types"("createdAt");

-- CreateIndex
CREATE INDEX "cohorts_type_idx" ON "cohorts"("type");

-- CreateIndex
CREATE INDEX "cohorts_customCohortTypeId_idx" ON "cohorts"("customCohortTypeId");

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_customCohortTypeId_fkey" FOREIGN KEY ("customCohortTypeId") REFERENCES "custom_cohort_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_cohort_types" ADD CONSTRAINT "custom_cohort_types_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
