"use client";

import { AppShell } from "@/components/AppShell";
import { ThemePicker } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <AppShell title="设置">
      <div className="feed-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 text-[14px] leading-7 text-ink-soft">
        <p className="chapter-mark">外观</p>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium tracking-wide text-ink">日间与夜间</h2>
          <p className="mt-2">
            日间是「干净手账」：白纸浅灰、字号分明、发送钮用沉静的灰绿。夜间是「墨夜金线」：墨底、奶油字、细金线，不走霓虹。
          </p>
          <div className="mt-3">
            <ThemePicker />
          </div>
          <p className="mt-3 text-[13px] leading-6 text-ink-faint">
            「跟随时间」按这台设备的本地时钟切换（与 Asia/Shanghai 同一套 24 小时窗口）：每天 06:00–18:59 日间，19:00–05:59 夜间。手动点日间或夜间后，会记住选择，不再跟随时钟，直到再次选择「跟随时间」。
          </p>
        </section>
        <p className="chapter-mark">本地与密钥</p>
        <section className="sheet px-4 py-4">
          <h2 className="font-display text-[16px] font-medium tracking-wide text-ink">数据</h2>
          <p className="mt-2">
            碎碎念先存在这台手机的浏览器里（IndexedDB）。清掉站点数据，记录也会一起消失。外观偏好另外记在本机 localStorage，清站点数据时会一起重置为跟随时间。
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
