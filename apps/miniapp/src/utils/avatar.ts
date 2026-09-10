import Taro from "@tarojs/taro";
import type { SessionUser } from "./session";

export const DEFAULT_NICKNAME = "阿布";
export const DEFAULT_TAGLINE = "没事，有我在，陪你一起穿越情绪，看见自己";

const PROFILE_KEY = "littlemo.profile";
const AVATAR_DATA_URL_MAX = 400_000;

export type LocalProfile = {
  nickname?: string;
  signature?: string;
  avatarDataUrl?: string;
};

export function isSafeImageDataUrl(value?: string | null) {
  if (!value) return false;
  if (value.length > AVATAR_DATA_URL_MAX) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(value);
}

export function isUsableAvatarSrc(value?: string | null) {
  if (!value) return false;
  const src = value.trim();
  if (!src) return false;
  if (isSafeImageDataUrl(src)) return true;
  if (/^https?:\/\//i.test(src)) return true;
  if (/^(wxfile|file|http):\/\//i.test(src)) return true;
  if (src.startsWith("blob:")) return true;
  if (src.startsWith("/")) return true;
  return false;
}

export function readLocalProfile(): LocalProfile {
  try {
    const raw = Taro.getStorageSync(PROFILE_KEY) as LocalProfile | string;
    if (!raw) return {};
    const data = typeof raw === "string" ? (JSON.parse(raw) as LocalProfile) : raw;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function writeLocalProfile(next: LocalProfile) {
  const avatar = isSafeImageDataUrl(next.avatarDataUrl) ? next.avatarDataUrl : undefined;
  const nickname = String(next.nickname || "").trim().slice(0, 24);
  const signature = String(next.signature || "").trim().slice(0, 140);
  Taro.setStorageSync(PROFILE_KEY, {
    nickname: nickname || undefined,
    signature: signature || undefined,
    avatarDataUrl: avatar,
  });
}

export function displayName(user?: SessionUser | null) {
  const local = readLocalProfile().nickname?.trim();
  return local || user?.nickname?.trim() || DEFAULT_NICKNAME;
}

export function companionTagline() {
  return readLocalProfile().signature?.trim() || DEFAULT_TAGLINE;
}

export function avatarInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : DEFAULT_NICKNAME.slice(0, 1);
}

export function avatarSrc(user?: SessionUser | null) {
  const local = readLocalProfile().avatarDataUrl;
  if (isUsableAvatarSrc(local)) return local!.trim();
  const cloud = user?.avatar?.trim();
  if (isUsableAvatarSrc(cloud)) return cloud!;
  return "";
}
