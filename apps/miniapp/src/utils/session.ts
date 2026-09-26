import Taro from "@tarojs/taro";
import { SENSITIVE_INFO_CONSENT_VERSION, TERMS_VERSION } from "./legal-versions";

const TOKEN_KEY = "littlemo.token";
const USER_KEY = "littlemo.user";

export type SessionUser = {
  id: string;
  nickname: string | null;
  avatar: string | null;
  termsVersion?: string | null;
  sensitiveInfoConsentVersion?: string | null;
  aiDataConsentVersion?: string | null;
  adultConfirmed?: boolean;
};

export function getToken() {
  return Taro.getStorageSync(TOKEN_KEY) as string;
}

export function getUser() {
  return (Taro.getStorageSync(USER_KEY) as SessionUser) || null;
}

export function saveSession(token: string, user: SessionUser) {
  Taro.setStorageSync(TOKEN_KEY, token);
  Taro.setStorageSync(USER_KEY, user);
}

export function saveUser(user: SessionUser) {
  Taro.setStorageSync(USER_KEY, user);
}

export function clearSession() {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(USER_KEY);
}

export function clearAppData() {
  try {
    const keys = Taro.getStorageInfoSync().keys || [];
    for (const key of keys) {
      if (key.startsWith("littlemo.")) Taro.removeStorageSync(key);
    }
  } catch {
    /* Keep going so a local file cleanup can still run. */
  }
  try {
    const root = Taro.env.USER_DATA_PATH;
    if (!root) return;
    const fs = Taro.getFileSystemManager();
    for (const name of fs.readdirSync(root)) {
      if (
        name.startsWith("littlemo-avatar.") ||
        name.startsWith("littlemo-export-") ||
        name.startsWith("lm-")
      ) {
        try {
          fs.unlinkSync(`${root}/${name}`);
        } catch {
          /* A file may already be gone. */
        }
      }
    }
  } catch {
    /* Mini-program private storage may not be available on every platform. */
  }
}

export function isLoggedIn() {
  return (
    Boolean(getToken()) &&
    getUser()?.termsVersion === TERMS_VERSION &&
    getUser()?.sensitiveInfoConsentVersion === SENSITIVE_INFO_CONSENT_VERSION &&
    getUser()?.adultConfirmed === true
  );
}
