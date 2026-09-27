export const TERMS_VERSION = "2026-09-13";
export const PRIVACY_VERSION = "2026-09-13";
export const SENSITIVE_INFO_CONSENT_VERSION = "2026-09-13";
export const AI_DATA_CONSENT_VERSION = "2026-09-13";
export const ADULT_AGE_SCOPE = "仅限年满18周岁";

export function isProductionLegalGate() {
  return process.env.NODE_ENV === "production";
}

function configured(name: string) {
  return process.env[name]?.trim() || "待运营方补充，当前不可发布";
}

export function publicLegalInfo() {
  return {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    sensitiveInfoConsentVersion: SENSITIVE_INFO_CONSENT_VERSION,
    aiDataConsentVersion: AI_DATA_CONSENT_VERSION,
    operatorName: configured("LEGAL_OPERATOR_NAME"),
    privacyContact: configured("LEGAL_PRIVACY_CONTACT"),
    complaintContact: configured("LEGAL_COMPLAINT_CONTACT"),
    complaintResponseTime: configured("LEGAL_COMPLAINT_RESPONSE_TIME"),
    ageScope: configured("LEGAL_AGE_SCOPE"),
    storageRegion: configured("LEGAL_STORAGE_REGION"),
    retentionDescription: configured("LEGAL_RETENTION_DESCRIPTION"),
    miniProgramFiling: configured("MINIPROGRAM_FILING_NO"),
    aiProvider: "DeepSeek API",
    aiModel: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
    aiServiceFiling: configured("DEEPSEEK_SERVICE_FILING_NO"),
    aiAlgorithmFiling: configured("DEEPSEEK_ALGORITHM_FILING_NO"),
    aiProcessingSummary: configured("DEEPSEEK_DATA_HANDLING"),
    aiProcessingRegion: configured("DEEPSEEK_DATA_REGION"),
    adultOnly: process.env.LEGAL_AGE_SCOPE?.trim() === ADULT_AGE_SCOPE,
  };
}
