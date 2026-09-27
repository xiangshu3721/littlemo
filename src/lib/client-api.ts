const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postApi<T extends { error?: string }>(path: string, body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      if (attempt === 0) {
        await wait(1200);
        continue;
      }
      throw new Error("这会儿没接上，再试一次。");
    }
    const text = await res.text();
    const trimmed = text.trim();
    const html = trimmed.startsWith("<");
    if ((res.status === 503 || html) && attempt === 0) {
      await wait(1200);
      continue;
    }
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      throw new Error("这会儿没接上，再试一次。");
    }
    let data: T;
    try {
      data = JSON.parse(trimmed) as T;
    } catch {
      throw new Error("这会儿没接上，再试一次。");
    }
    if (!res.ok) throw new Error(data.error || "没接上");
    return data;
  }
  throw new Error("这会儿没接上，再试一次。");
}
