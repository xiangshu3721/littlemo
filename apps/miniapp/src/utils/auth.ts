import { api } from "./api";
import { SENSITIVE_INFO_CONSENT_VERSION, TERMS_VERSION } from "./legal-versions";
import { saveSession, type SessionUser } from "./session";

export async function loginWithWeChat() {
  const data = await api<{ token: string; user: SessionUser }>("/api/auth/wechat", {
    method: "POST",
    data: {
      termsVersion: TERMS_VERSION,
      sensitiveInfoConsentVersion: SENSITIVE_INFO_CONSENT_VERSION,
      adultConfirmed: true,
    },
    auth: false,
  });
  saveSession(data.token, data.user);
  return data;
}
