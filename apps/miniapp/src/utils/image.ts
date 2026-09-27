import Taro from "@tarojs/taro";
import { ensurePrivacyAuthorized } from "./privacy";

const IMAGE_INPUT_BYTES = 8 * 1024 * 1024;
const IMAGE_OUTPUT_BYTES = 1_200_000;
const AVATAR_MAX_EDGE = 480;
const CHAT_MAX_EDGE = 1280;

function fail(message: string): never {
  throw new Error(message);
}

export function isPickCancel(err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "errMsg" in err
        ? String((err as { errMsg?: string }).errMsg)
        : String(err || "");
  return /cancel|取消/i.test(msg);
}

async function fileSize(path: string) {
  try {
    const info = (await Taro.getFileInfo({ filePath: path })) as { size?: number };
    return Number(info.size || 0);
  } catch {
    return 0;
  }
}

async function compress(src: string, maxEdge: number) {
  try {
    const res = await Taro.compressImage({
      src,
      quality: 80,
      compressedWidth: maxEdge,
    });
    return res.tempFilePath || src;
  } catch {
    return src;
  }
}

async function blobToDataUrl(blob: Blob) {
  if (blob.size > IMAGE_OUTPUT_BYTES) fail("压缩后还是太大，换一张小一点的。");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片无法读取"));
    reader.readAsDataURL(blob);
  });
}

async function persistLocal(tempPath: string) {
  if (tempPath.startsWith("data:")) {
    if (tempPath.length > IMAGE_OUTPUT_BYTES * 1.4) fail("压缩后还是太大，换一张小一点的。");
    return tempPath;
  }

  if (tempPath.startsWith("blob:") && typeof fetch === "function") {
    const blob = await fetch(tempPath).then((res) => res.blob());
    return blobToDataUrl(blob);
  }

  const root = Taro.env.USER_DATA_PATH;
  if (root) {
    const dest = `${root}/lm-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
    try {
      await new Promise<void>((resolve, reject) => {
        Taro.getFileSystemManager().saveFile({
          tempFilePath: tempPath,
          filePath: dest,
          success: () => resolve(),
          fail: (err) => reject(err),
        });
      });
      const size = await fileSize(dest);
      if (size > IMAGE_OUTPUT_BYTES) fail("压缩后还是太大，换一张小一点的。");
      return dest;
    } catch (err) {
      if (err instanceof Error && /太大/.test(err.message)) throw err;
    }
  }

  try {
    const data = await new Promise<string>((resolve, reject) => {
      Taro.getFileSystemManager().readFile({
        filePath: tempPath,
        encoding: "base64",
        success: (res) => resolve(String(res.data)),
        fail: reject,
      });
    });
    if (data.length > IMAGE_OUTPUT_BYTES * 1.4) fail("压缩后还是太大，换一张小一点的。");
    return `data:image/jpeg;base64,${data}`;
  } catch (err) {
    if (err instanceof Error && /太大/.test(err.message)) throw err;
    return tempPath;
  }
}

export async function pickRawImagePath() {
  if (!(await ensurePrivacyAuthorized())) fail("请先同意隐私保护指引。");
  const picked = await Taro.chooseMedia({
    count: 1,
    mediaType: ["image"],
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
  });
  const src = picked.tempFiles?.[0]?.tempFilePath;
  if (!src) fail("cancel");
  return src;
}

async function pickOne(maxEdge: number) {
  const src = await pickRawImagePath();
  const size = await fileSize(src);
  if (size > IMAGE_INPUT_BYTES) fail("照片太大了，换一张小一点的。");
  const compressed = await compress(src, maxEdge);
  return persistLocal(compressed);
}

export async function pickChatImage() {
  return pickOne(CHAT_MAX_EDGE);
}

export async function pickAvatarImage() {
  const path = await pickOne(AVATAR_MAX_EDGE);
  if (path.startsWith("data:")) {
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(path) || path.length > 400_000) {
      fail("头像太大了，换一张小一点的。");
    }
    return path;
  }
  try {
    const data = await new Promise<string>((resolve, reject) => {
      Taro.getFileSystemManager().readFile({
        filePath: path,
        encoding: "base64",
        success: (res) => resolve(String(res.data)),
        fail: reject,
      });
    });
    const url = `data:image/jpeg;base64,${data}`;
    if (url.length > 400_000) fail("头像太大了，换一张小一点的。");
    return url;
  } catch (err) {
    if (err instanceof Error && /太大/.test(err.message)) throw err;
    fail("头像换不了");
  }
}
