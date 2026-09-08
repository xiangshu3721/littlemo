"use client";

import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="设置">
      <div className="feed-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[14px] leading-6 text-ink-soft">
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium text-ink">数据</h2>
          <p className="mt-2">
            碎碎念先存在这台手机的浏览器里（IndexedDB）。清掉站点数据，记录也会一起消失。
          </p>
        </section>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium text-ink">AI</h2>
          <p className="mt-2">
            深度分析走 DeepSeek。密钥放在服务器环境变量 <code className="text-ink">DEEPSEEK_API_KEY</code>{" "}
            里，以后会迁到腾讯云，页面上不会出现 Key。
          </p>
        </section>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium text-ink">关于</h2>
          <p className="mt-2">碎碎念网页版。记录本身不评分、不打卡、不排行。</p>
        </section>
      </div>
    </AppShell>
  );
}
