-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "creditsExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_credits_idx" ON "users"("credits");
