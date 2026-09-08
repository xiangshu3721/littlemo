"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconChat,
  IconClose,
  IconDiary,
  IconInsight,
  IconMe,
  IconSettings,
  IconTrash,
} from "@/components/InkIcons";
import { useStore } from "@/context/store";
import { LIMITS, isSafeImageDataUrl } from "@/lib/limits";
import { blobToDataUrl } from "@/lib/image";

export function AppShell({
  children,
  title,
  composer,
}: {
  children: React.ReactNode;
  title?: string;
  composer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useStore();
  const heading = title || profile.nickname || "碎碎念";

  return (
    <div className="flex h-[100dvh] justify-center overflow-hidden bg-desk">
      <div className="phone relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden shadow-[0_28px_80px_rgba(31,25,20,0.22)]">
        <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
          <DrawerButton />
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-[20px] font-medium tracking-[0.02em] text-ink">{heading}</p>
            <p className="mt-0.5 truncate text-[12px] leading-4 tracking-wide text-ink-faint">
              {profile.signature || "没事，有我在，陪你一起穿越情绪，看见自己"}
            </p>
          </div>
        </header>
        <div className="hairline mx-5" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        {composer ? <div className="shrink-0">{composer}</div> : null}
        <nav className="grid shrink-0 grid-cols-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
          <div className="hairline col-span-4 mb-1.5" />
          <Tab href="/" label="碎碎念" icon={IconChat} active={pathname === "/"} />
          <Tab href="/stats" label="情绪日记" icon={IconDiary} active={pathname.startsWith("/stats")} />
          <Tab href="/insight" label="情绪洞察" icon={IconInsight} active={pathname.startsWith("/insight")} />
          <Tab href="/me" label="我" icon={IconMe} active={pathname.startsWith("/me")} />
        </nav>
      </div>
    </div>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof IconChat;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 px-0.5 py-1.5 text-[11px] leading-tight tracking-[0.12em] ${
        active ? "text-ink" : "text-ink-faint"
      }`}
    >
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" />
        {active ? <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-accent" /> : null}
      </span>
      {label}
    </Link>
  );
}

function DrawerButton() {
  const { profile } = useStore();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById("side-drawer") as HTMLDialogElement | null;
          el?.showModal();
        }}
        className="h-11 w-11 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_rgba(44,36,28,0.08)]"
        aria-label="菜单"
      >
        {profile.avatarDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center font-display text-[15px] text-ink-soft">
            {profile.nickname.slice(0, 1)}
          </span>
        )}
      </button>
      <Drawer />
    </>
  );
}

function Drawer() {
  const { profile } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  function go(href: string) {
    const el = document.getElementById("side-drawer") as HTMLDialogElement | null;
    el?.close();
    router.push(href);
  }

  return (
    <dialog
      id="side-drawer"
      className="fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-ink/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="drawer-panel phone flex h-full w-[78%] max-w-[320px] flex-col pt-[max(22px,env(safe-area-inset-top))] shadow-[22px_0_50px_rgba(31,25,20,0.18)]">
        <div className="flex items-start justify-between px-5 pb-7">
          <button type="button" onClick={() => go("/me")} className="flex items-center gap-3 text-left">
            <span className="h-14 w-14 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_rgba(44,36,28,0.08)]">
              {profile.avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center font-display text-lg text-ink-soft">
                  {profile.nickname.slice(0, 1)}
                </span>
              )}
            </span>
            <span>
              <span className="block font-display text-[18px] font-medium tracking-wide text-ink">{profile.nickname}</span>
              <span className="mt-0.5 block text-[12px] tracking-wide text-ink-faint">编辑资料</span>
            </span>
          </button>
          <form method="dialog">
            <button className="text-ink-faint" aria-label="关闭">
              <IconClose className="h-5 w-5" />
            </button>
          </form>
        </div>
        <div className="hairline mx-5 mb-3" />
        <nav className="flex flex-col px-2 text-[15px] text-ink">
          <DrawerLink onClick={() => go("/")} label="碎碎念" icon={IconChat} active={pathname === "/"} />
          <DrawerLink onClick={() => go("/stats")} label="情绪日记" icon={IconDiary} active={pathname.startsWith("/stats")} />
          <DrawerLink onClick={() => go("/insight")} label="情绪洞察" icon={IconInsight} active={pathname.startsWith("/insight")} />
          <DrawerLink onClick={() => go("/trash")} label="回收站" icon={IconTrash} active={pathname.startsWith("/trash")} />
          <DrawerLink onClick={() => go("/settings")} label="设置" icon={IconSettings} active={pathname.startsWith("/settings")} />
        </nav>
      </div>
    </dialog>
  );
}

function DrawerLink({
  onClick,
  label,
  icon: Icon,
  active,
}: {
  onClick: () => void;
  label: string;
  icon: typeof IconChat;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left tracking-wide ${
        active ? "bg-wash text-ink" : "text-ink-soft hover:bg-wash/70"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </button>
  );
}

export function AvatarField({
  value,
  onChange,
  onError,
}: {
  value?: string;
  onChange: (dataUrl?: string) => void;
  onError?: (message: string) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer flex-col items-center gap-2">
      <span className="h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_rgba(44,36,28,0.08)]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[13px] tracking-wide text-ink-faint">头像</span>
        )}
      </span>
      <span className="text-[12px] tracking-wide text-accent">更换头像</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const { compressImage } = await import("@/lib/image");
            const blob = await compressImage(file, 480);
            const url = await blobToDataUrl(blob);
            if (!isSafeImageDataUrl(url) || url.length > LIMITS.avatarDataUrl) {
              throw new Error("头像太大了，换一张小一点的。");
            }
            onChange(url);
          } catch (err) {
            onError?.(err instanceof Error ? err.message : "头像换不了");
          }
        }}
      />
    </label>
  );
}
