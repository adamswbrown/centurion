-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_cohortId_fkey";

-- CreateTable
CREATE TABLE "cohort_session_access" (
    "cohortId" INTEGER NOT NULL,
    "classTypeId" INTEGER NOT NULL,
    "constraints" JSONB,

    CONSTRAINT "cohort_session_access_pkey" PRIMARY KEY ("cohortId","classTypeId")
);

-- CreateIndex
CREATE INDEX "cohort_session_access_classTypeId_idx" ON "cohort_session_access"("classTypeId");

-- AddForeignKey
ALTER TABLE "cohort_session_access" ADD CONSTRAINT "cohort_session_access_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_session_access" ADD CONSTRAINT "cohort_session_access_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "class_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
