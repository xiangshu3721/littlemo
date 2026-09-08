"use client";

import { useState } from "react";
import { AppShell, AvatarField } from "@/components/AppShell";
import { useStore } from "@/context/store";
import type { Profile } from "@/lib/types";

export default function MePage() {
  const { profile, saveProfile } = useStore();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const draft = editing ?? profile;

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setEditing((d) => ({ ...(d ?? profile), [key]: value }));
    setSaved(false);
  }

  return (
    <AppShell title="个人资料">
      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex justify-center py-4">
          <AvatarField value={draft.avatarDataUrl} onChange={(url) => set("avatarDataUrl", url)} />
        </div>
        <Field label="昵称">
          <input
            value={draft.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            className="field"
          />
        </Field>
        <Field label="性别">
          <input
            value={draft.gender}
            onChange={(e) => set("gender", e.target.value)}
            placeholder="可不填"
            className="field"
          />
        </Field>
        <Field label="生日">
          <input
            type="date"
            value={draft.birthday}
            onChange={(e) => set("birthday", e.target.value)}
            className="field"
          />
        </Field>
        <Field label="地区">
          <input
            value={draft.region}
            onChange={(e) => set("region", e.target.value)}
            placeholder="可不填"
            className="field"
          />
        </Field>
        <Field label="签名">
          <textarea
            value={draft.signature}
            onChange={(e) => set("signature", e.target.value)}
            rows={3}
            className="field min-h-[88px]"
          />
        </Field>
        <button
          type="button"
          onClick={() => {
            saveProfile(draft);
            setEditing(null);
            setSaved(true);
          }}
            className="btn-accent mt-5 w-full py-3.5 text-[15px]"
        >
          {saved ? "已保存在这台设备" : "保存"}
        </button>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
