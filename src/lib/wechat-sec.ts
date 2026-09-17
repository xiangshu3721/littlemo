const WECHAT_APPID = "wx6f03736d4996c4e4";

type TokenCache = { token: string; expireAt: number };
let tokenCache: TokenCache | null = null;

function appSecret() {
  return process.env.WECHAT_APPSECRET?.trim() || "";
}

function appId() {
  return process.env.WECHAT_APPID?.trim() || WECHAT_APPID;
}

async function readJson(res: Response) {
  try {
    return (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
      result?: { suggest?: string; label?: number };
    };
  } catch {
    return {};
  }
}

async function accessToken(force = false) {
  const secret = appSecret();
  if (!secret) return "";
  if (!force && tokenCache && Date.now() < tokenCache.expireAt) return tokenCache.token;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId())}&secret=${encodeURIComponent(secret)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await readJson(res);
  if (!data.access_token) return "";
  const ttl = Math.max(60, Number(data.expires_in || 7200) - 120);
  tokenCache = { token: data.access_token, expireAt: Date.now() + ttl * 1000 };
  return tokenCache.token;
}

async function msgSecCheck(openid: string, content: string, scene: number, token: string) {
  const res = await fetch(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: 2,
      openid,
      scene,
      content: content.slice(0, 2500),
    }),
  });
  return readJson(res);
}

/** scene: 1 profile, 2 comment / chat. Throws CONTENT_BLOCKED when WeChat marks risky. */
export async function assertUserTextSafe(input: { openid: string; content: string; scene: 1 | 2 }) {
  const content = input.content.trim();
  if (!content) return;
  if (!appSecret()) return;

  let token = await accessToken();
  if (!token) return;
  let data = await msgSecCheck(input.openid, content, input.scene, token);
  if (data.errcode === 40001) {
    token = await accessToken(true);
    if (!token) return;
    data = await msgSecCheck(input.openid, content, input.scene, token);
  }
  if (data.errcode === 87014) throw new Error("CONTENT_BLOCKED");
  if (data.errcode && data.errcode !== 0) return;
  if (data.result?.suggest === "risky") throw new Error("CONTENT_BLOCKED");
}
