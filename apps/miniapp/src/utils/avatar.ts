import Taro from "@tarojs/taro";
import type { SessionUser } from "./session";

export const DEFAULT_NICKNAME = "阿布";
/** Keep in sync with server LIMITS.nickname. */
export const NICKNAME_MAX = 24;
export const DEFAULT_TAGLINE = "没事，有我在，陪你一起穿越情绪，看见自己";

/** Keep in sync with web `LIMITS.avatarDataUrl`. */
export const AVATAR_MAX_CHARS = 400_000;

const PROFILE_KEY = "littlemo.profile";
const AVATAR_DATA_URL_MAX = AVATAR_MAX_CHARS;

export type LocalProfile = {
  nickname?: string;
  signature?: string;
  avatarDataUrl?: string;
};

export function isSafeAvatarDataUrl(value?: string) {
  if (!value) return false;
  if (value.length > AVATAR_MAX_CHARS) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);
}

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

export function shouldUseChooseAvatar() {
  if (process.env.TARO_ENV !== "weapp") return false;
  try {
    return Taro.getSystemInfoSync().platform !== "devtools";
  } catch {
    return false;
  }
}

function mimeFromPath(path: string) {
  const clean = path.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function readFileAsDataUrl(filePath: string) {
  if (process.env.TARO_ENV === "weapp") {
    const fs = Taro.getFileSystemManager();
    const base64 = await new Promise<string>((resolve, reject) => {
      fs.readFile({
        filePath,
        encoding: "base64",
        success: (res) => resolve(String(res.data || "").replace(/\s/g, "")),
        fail: (err) => reject(err),
      });
    });
    return `data:${mimeFromPath(filePath)};base64,${base64}`;
  }

  const blob = await (await fetch(filePath)).blob();
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return url.replace(/\s/g, "");
}

async function compressLocalImage(filePath: string, quality: number, width: number) {
  try {
    const res = await Taro.compressImage({
      src: filePath,
      quality,
      compressedWidth: width,
    });
    return res.tempFilePath || filePath;
  } catch {
    try {
      const res = await Taro.compressImage({ src: filePath, quality });
      return res.tempFilePath || filePath;
    } catch {
      return filePath;
    }
  }
}

export async function imagePathToAvatarDataUrl(filePath: string) {
  const attempts = [
    { quality: 72, width: 480 },
    { quality: 55, width: 360 },
    { quality: 40, width: 240 },
  ];
  let lastError = new Error("头像换不了");
  for (const attempt of attempts) {
    const path = await compressLocalImage(filePath, attempt.quality, attempt.width);
    const dataUrl = (await readFileAsDataUrl(path)).replace(/^data:image\/jpg;/i, "data:image/jpeg;");
    if (isSafeAvatarDataUrl(dataUrl)) return dataUrl;
    lastError = new Error("头像太大了，换一张小一点的。");
  }
  throw lastError;
}

export function avatarSrcForDisplay(dataUrl: string) {
  if (!dataUrl) return "";
  if (process.env.TARO_ENV !== "weapp") return dataUrl;
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl;
  const root = Taro.env.USER_DATA_PATH;
  if (!root) return dataUrl;
  const ext = /image\/png/i.test(dataUrl) ? "png" : "jpg";
  const path = `${root}/littlemo-avatar.${ext}`;
  try {
    Taro.getFileSystemManager().writeFileSync(path, dataUrl.slice(comma + 1), "base64");
    return path;
  } catch {
    return dataUrl;
  }
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
  const nickname = String(next.nickname || "").trim().slice(0, NICKNAME_MAX);
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
  if (isUsableAvatarSrc(local)) {
    const src = local!.trim();
    return src.startsWith("data:image/") ? avatarSrcForDisplay(src) : src;
  }
  const cloud = user?.avatar?.trim();
  if (isUsableAvatarSrc(cloud)) {
    return cloud!.startsWith("data:image/") ? avatarSrcForDisplay(cloud!) : cloud!;
  }
  return "";
}
