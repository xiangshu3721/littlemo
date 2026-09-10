-- AlterTable
ALTER TABLE "DiarySession" ADD COLUMN "patternSummary" JSONB;
ALTER TABLE "DiarySession" ADD COLUMN "patternSummaryStatus" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "DiarySession" ADD COLUMN "patternSummaryError" TEXT;
ALTER TABLE "DiarySession" ADD COLUMN "patternSummaryAt" TIMESTAMP(3);
