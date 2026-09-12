import { api } from "./api";
import { saveSession, type SessionUser } from "./session";

export async function loginWithWeChat() {
  const data = await api<{ token: string; user: SessionUser }>("/api/auth/wechat", {
    method: "POST",
    data: {},
    auth: false,
  });
  saveSession(data.token, data.user);
  return data;
}
