-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "clientId" TEXT;

-- CreateTable
CREATE TABLE "DiarySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "mood" TEXT,
    "analysis" JSONB,
    "analysisStatus" TEXT NOT NULL DEFAULT 'idle',
    "analysisError" TEXT,
    "deletedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "weather" TEXT,
    "stress" INTEGER,
    "energy" INTEGER,
    "primaryEmotions" JSONB,
    "thoughts" JSONB,
    "coreNeeds" JSONB,
    "coreTheme" TEXT,
    "lastUserAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiarySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiarySession_userId_startedAt_idx" ON "DiarySession"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodReport_userId_periodId_key" ON "PeriodReport"("userId", "periodId");

-- CreateIndex
CREATE INDEX "PeriodReport_userId_generatedAt_idx" ON "PeriodReport"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_sessionId_idx" ON "ChatMessage"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_userId_clientId_key" ON "ChatMessage"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "DiarySession" ADD CONSTRAINT "DiarySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodReport" ADD CONSTRAINT "PeriodReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DiarySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
