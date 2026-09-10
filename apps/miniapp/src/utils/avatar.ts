import Taro from "@tarojs/taro";

/** Keep in sync with web `LIMITS.avatarDataUrl`. */
export const AVATAR_MAX_CHARS = 400_000;

export function isSafeAvatarDataUrl(value?: string) {
  if (!value) return false;
  if (value.length > AVATAR_MAX_CHARS) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);
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
