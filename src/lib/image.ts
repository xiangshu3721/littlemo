import { LIMITS } from "./limits";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export function assertImageFile(file: File) {
  if (file.size > LIMITS.imageInputBytes) {
    throw new Error("照片太大了，换一张小一点的。");
  }
  const type = (file.type || "").toLowerCase();
  if (type && !type.startsWith("image/")) {
    throw new Error("只收图片。");
  }
  if (type && !ALLOWED_TYPES.has(type) && type !== "image/*") {
    throw new Error("这种图片格式读不了，试试 jpg 或 png。");
  }
}

export function compressImage(file: File, maxSize = 1280): Promise<Blob> {
  assertImageFile(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("无法处理图片"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("图片压缩失败"));
            return;
          }
          if (blob.size > LIMITS.imageOutputBytes) {
            reject(new Error("压缩后还是太大，换一张小一点的。"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片无法读取"));
    };
    img.src = url;
  });
}

export function blobToDataUrl(blob: Blob) {
  if (blob.size > LIMITS.imageOutputBytes) {
    return Promise.reject(new Error("图片太大了。"));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
