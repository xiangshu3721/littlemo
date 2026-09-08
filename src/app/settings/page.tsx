"use client";

import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="设置">
      <div className="feed-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 text-[14px] leading-7 text-ink-soft">
        <p className="chapter-mark">本地与密钥</p>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium tracking-wide text-ink">数据</h2>
          <p className="mt-2">
            碎碎念先存在这台手机的浏览器里（IndexedDB）。清掉站点数据，记录也会一起消失。
          </p>
        </section>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium tracking-wide text-ink">AI</h2>
          <p className="mt-2">
            深度分析走 DeepSeek。密钥只放在服务器环境变量里，页面上不会出现 Key。没有配置时仍可记录，分析会安静失败。
          </p>
        </section>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium tracking-wide text-ink">关于</h2>
          <p className="mt-2">碎碎念网页版。记录本身不评分、不打卡、不排行。</p>
        </section>
      </div>
    </AppShell>
  );
}
