import Taro from "@tarojs/taro";
import { api } from "./api";
import { saveSession, type SessionUser } from "./session";

async function loginCode() {
  if (process.env.TARO_ENV === "weapp") {
    try {
      const res = await Taro.login();
      if (res.code) return res.code;
    } catch {
      /* fall through to mock code */
    }
  }
  return `dev-${Date.now()}`;
}

export async function loginWithWeChat() {
  const code = await loginCode();
  const data = await api<{ token: string; user: SessionUser }>("/api/auth/wechat", {
    method: "POST",
    data: { code },
    auth: false,
  });
  saveSession(data.token, data.user);
  return data;
}
