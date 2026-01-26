/*
  Warnings:

  - Added the required column `coachId` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "coachId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "appointments_coachId_idx" ON "appointments"("coachId");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
