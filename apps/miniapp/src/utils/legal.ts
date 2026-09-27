import { api } from "./api";
import {
  AI_DATA_CONSENT_VERSION,
  PRIVACY_VERSION,
  SENSITIVE_INFO_CONSENT_VERSION,
  TERMS_VERSION,
} from "./legal-versions";

export { AI_DATA_CONSENT_VERSION, PRIVACY_VERSION, SENSITIVE_INFO_CONSENT_VERSION, TERMS_VERSION } from "./legal-versions";

export type PublicLegalInfo = {
  termsVersion: string;
  privacyVersion: string;
  sensitiveInfoConsentVersion: string;
  aiDataConsentVersion: string;
  operatorName: string;
  privacyContact: string;
  complaintContact: string;
  complaintResponseTime: string;
  ageScope: string;
  storageRegion: string;
  retentionDescription: string;
  miniProgramFiling: string;
  aiProvider: string;
  aiModel: string;
  aiServiceFiling: string;
  aiAlgorithmFiling: string;
  aiProcessingSummary: string;
  aiProcessingRegion: string;
};

export const LEGAL_INFO_PENDING = "待运营方补充，当前不可发布";

export function isPendingLegalValue(value?: string | null) {
  return !value || value.includes(LEGAL_INFO_PENDING);
}

export function hasPendingPublicDisclosure(info: PublicLegalInfo) {
  return [
    info.operatorName,
    info.privacyContact,
    info.complaintContact,
    info.complaintResponseTime,
    info.storageRegion,
    info.retentionDescription,
    info.miniProgramFiling,
  ].some(isPendingLegalValue);
}

export function isProductionLegalGate() {
  return process.env.NODE_ENV === "production";
}

export const LEGAL_INFO_DEFAULTS: PublicLegalInfo = {
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
  sensitiveInfoConsentVersion: SENSITIVE_INFO_CONSENT_VERSION,
  aiDataConsentVersion: AI_DATA_CONSENT_VERSION,
  operatorName: LEGAL_OPERATOR_NAME || LEGAL_INFO_PENDING,
  privacyContact: LEGAL_PRIVACY_CONTACT || LEGAL_INFO_PENDING,
  complaintContact: LEGAL_COMPLAINT_CONTACT || LEGAL_INFO_PENDING,
  complaintResponseTime: LEGAL_COMPLAINT_RESPONSE_TIME || LEGAL_INFO_PENDING,
  ageScope: LEGAL_AGE_SCOPE || LEGAL_INFO_PENDING,
  storageRegion: LEGAL_STORAGE_REGION || LEGAL_INFO_PENDING,
  retentionDescription: LEGAL_RETENTION_DESCRIPTION || LEGAL_INFO_PENDING,
  miniProgramFiling: MINIPROGRAM_FILING_NO || LEGAL_INFO_PENDING,
  aiProvider: "DeepSeek API",
  aiModel: DEEPSEEK_MODEL || "deepseek-flash",
  aiServiceFiling: DEEPSEEK_SERVICE_FILING_NO || LEGAL_INFO_PENDING,
  aiAlgorithmFiling: DEEPSEEK_ALGORITHM_FILING_NO || LEGAL_INFO_PENDING,
  aiProcessingSummary: DEEPSEEK_DATA_HANDLING || LEGAL_INFO_PENDING,
  aiProcessingRegion: DEEPSEEK_DATA_REGION || LEGAL_INFO_PENDING,
};

export async function loadPublicLegalInfo() {
  try {
    return await api<PublicLegalInfo>("/api/legal", { auth: false });
  } catch {
    return LEGAL_INFO_DEFAULTS;
  }
}
