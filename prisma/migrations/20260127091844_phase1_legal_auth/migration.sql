-- CreateTable
CREATE TABLE "user_consents" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "termsAccepted" TIMESTAMP(3) NOT NULL,
    "privacyAccepted" TIMESTAMP(3) NOT NULL,
    "dataProcessing" TIMESTAMP(3) NOT NULL,
    "marketing" TIMESTAMP(3),
    "version" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_userId_key" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_createdAt_idx" ON "user_consents"("createdAt");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
