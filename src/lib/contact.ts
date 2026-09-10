/** Server-exposed WeChat contact config for soft CTA on pattern summary. */
export type ContactConfig = {
  wechatId: string;
  qrUrl: string;
  configured: boolean;
  placeholderHint: string;
};

export function getContactConfig(): ContactConfig {
  const wechatId = String(process.env.NEXT_PUBLIC_CONTACT_WECHAT_ID || process.env.CONTACT_WECHAT_ID || "").trim();
  const qrUrl = String(
    process.env.CONTACT_WECHAT_QR_URL ||
      process.env.NEXT_PUBLIC_CONTACT_WECHAT_QR_URL ||
      "",
  ).trim();
  const configured = Boolean(wechatId || qrUrl);
  return {
    wechatId,
    qrUrl,
    configured,
    placeholderHint: configured ? "" : "联系方式待配置",
  };
}
