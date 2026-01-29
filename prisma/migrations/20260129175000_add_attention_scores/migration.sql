-- AlterTable
ALTER TABLE "weekly_questionnaire_responses" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "attention_scores" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" TEXT[],
    "metadata" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "attention_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attention_scores_priority_score_idx" ON "attention_scores"("priority", "score");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attention_scores_calculatedAt_idx" ON "attention_scores"("calculatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attention_scores_expiresAt_idx" ON "attention_scores"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "attention_scores_entityType_entityId_key" ON "attention_scores"("entityType", "entityId");
