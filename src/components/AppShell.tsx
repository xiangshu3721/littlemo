"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconChat, IconClose, IconDiary, IconInsight, IconMe } from "@/components/InkIcons";
import { useStore } from "@/context/store";
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

  return (
    <div className="flex h-[100dvh] justify-center overflow-hidden bg-desk">
      <div className="phone relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden shadow-[0_24px_80px_rgba(48,38,28,0.18)]">
        <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
          <DrawerButton />
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-[19px] font-medium tracking-tight text-ink">
              {title || profile.nickname || "碎碎念"}
            </p>
            <p className="mt-0.5 truncate text-[12px] leading-4 text-ink-faint">
              {profile.signature || "没事，有我在，陪你一起穿越情绪，看见自己"}
            </p>
          </div>
        </header>
        <div className="hairline mx-4" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        {composer ? <div className="shrink-0">{composer}</div> : null}
        <nav className="grid shrink-0 grid-cols-4 border-t border-line/80 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
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
      className={`flex flex-col items-center gap-1 px-0.5 py-1.5 text-[11px] leading-tight tracking-[0.08em] ${
        active ? "text-ink" : "text-ink-faint"
      }`}
    >
      <Icon className="h-[22px] w-[22px]" />
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
          <span className="grid h-full w-full place-items-center text-[14px] text-ink-soft">
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

  function go(href: string) {
    const el = document.getElementById("side-drawer") as HTMLDialogElement | null;
    el?.close();
    router.push(href);
  }

  return (
    <dialog
      id="side-drawer"
      className="fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-ink/25"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="phone flex h-full w-[78%] max-w-[320px] flex-col pt-[max(20px,env(safe-area-inset-top))] shadow-[18px_0_50px_rgba(48,38,28,0.16)]">
        <div className="flex items-start justify-between px-5 pb-6">
          <button type="button" onClick={() => go("/me")} className="flex items-center gap-3 text-left">
            <span className="h-14 w-14 overflow-hidden rounded-full bg-wash">
              {profile.avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-lg text-ink-soft">
                  {profile.nickname.slice(0, 1)}
                </span>
              )}
            </span>
            <span>
              <span className="block font-display text-[18px] font-medium text-ink">{profile.nickname}</span>
              <span className="block text-[12px] text-ink-faint">编辑资料</span>
            </span>
          </button>
          <form method="dialog">
            <button className="text-ink-faint" aria-label="关闭">
              <IconClose className="h-5 w-5" />
            </button>
          </form>
        </div>
        <nav className="flex flex-col px-2 text-[15px] text-ink">
          <DrawerLink onClick={() => go("/")} label="碎碎念" />
          <DrawerLink onClick={() => go("/stats")} label="情绪日记" />
          <DrawerLink onClick={() => go("/insight")} label="情绪洞察" />
          <DrawerLink onClick={() => go("/trash")} label="回收站" />
          <DrawerLink onClick={() => go("/settings")} label="设置" />
        </nav>
      </div>
    </dialog>
  );
}

function DrawerLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl px-4 py-3 text-left hover:bg-wash active:scale-[0.99]"
    >
      {label}
    </button>
  );
}

export function AvatarField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (dataUrl?: string) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer flex-col items-center gap-2">
      <span className="h-[5.5rem] w-20 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_rgba(44,36,28,0.08)]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-faint">头像</span>
        )}
      </span>
      <span className="text-[12px] text-accent">更换头像</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const { compressImage } = await import("@/lib/image");
          const blob = await compressImage(file, 480);
          onChange(await blobToDataUrl(blob));
        }}
      />
    </label>
  );
}
