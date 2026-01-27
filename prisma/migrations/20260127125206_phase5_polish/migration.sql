-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "bodyFatPercentage" DOUBLE PRECISION,
ADD COLUMN     "heightInches" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "billingEmail" TEXT;

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "coachId" INTEGER,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "videoUrl" TEXT;

-- CreateIndex
CREATE INDEX "workouts_coachId_idx" ON "workouts"("coachId");

-- CreateIndex
CREATE INDEX "workouts_scheduledAt_idx" ON "workouts"("scheduledAt");
