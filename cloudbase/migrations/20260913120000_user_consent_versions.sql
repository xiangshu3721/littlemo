ALTER TABLE "User"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsConsentedAt" TIMESTAMP(3),
  ADD COLUMN "sensitiveInfoConsentVersion" TEXT,
  ADD COLUMN "sensitiveInfoConsentedAt" TIMESTAMP(3),
  ADD COLUMN "aiDataConsentVersion" TEXT,
  ADD COLUMN "aiDataConsentedAt" TIMESTAMP(3),
  ADD COLUMN "adultAgeConfirmedAt" TIMESTAMP(3);
