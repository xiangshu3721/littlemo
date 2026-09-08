# Security

Short audit of 有点情绪 (littlemo), a local-first companion app. Scope: Next.js App Router API proxies, client IndexedDB, image handling, XSS, secrets. No account system in this version.

## Findings and fixes

### 1. Upstream API errors leaked to the client

**Wrong:** `/api/chat`, `/api/analyze`, and `/api/period` returned `err.message` on 500. `deepseek.ts` threw `DeepSeek 请求失败（status）：` plus the first 240 characters of the upstream body. That can include provider snippets, model names, or key-related text.

**Changed:** Upstream failures are coded (`NO_KEY`, `UPSTREAM`, `BAD_MODEL`). Routes run them through `publicError()`, which never echoes DeepSeek bodies, bearer tokens, or URLs. The unused body is discarded.

### 2. Unbounded history and payloads

**Wrong:** Chat history, analyze transcripts, period entries, and memory packs were accepted as-is. A large JSON post could stall the server or the model.

**Changed:** Shared `LIMITS` plus `readJsonBody()` (Content-Type, Content-Length, raw size). History last 40 turns / 800 chars, latest 4000, analyze last 80 lines, period last 60 entries, digest 4000. Client also clips before `fetch`. Oversize bodies get 413.

### 3. Prompt injection / oversized user text

**Wrong:** User text was interpolated into the model prompt with no fence and no per-field cap.

**Changed:** User blobs are wrapped as untrusted source text (`wrapUntrusted`). This is mitigation, not a guarantee. Residual: a determined prompt can still steer the model; replies stay rendered as text.

### 4. Image upload could blow memory

**Wrong:** Composer and avatar accepted any `image/*` with no byte cap before canvas work. Avatars became unbounded `data:` URLs in `localStorage`.

**Changed:** Type allow-list (jpeg/png/webp/gif/heic), 8MB input, ~1.2MB after JPEG compress. Avatar must be a `data:image/(jpeg|png|webp);base64,` URL under 400KB. SVG is rejected. Images stay as Blobs in IndexedDB, not raw base64 chat history.

### 5. Method / cache on API

**Wrong:** Only `POST` was exported (Next already 405s other verbs), but there were no explicit method replies and no `Cache-Control` on `/api`.

**Changed:** `GET` / `PUT` / `DELETE` / `OPTIONS` return 405 with `Allow: POST`. No `Access-Control-Allow-Origin: *`. API responses are `no-store`. App-wide: `nosniff`, `same-origin` referrer, `DENY` framing, tight Permissions-Policy.

### 6. XSS from model output

**Wrong (checked):** No `dangerouslySetInnerHTML`. Bubbles, insights, and errors use React text. Kept that way; long tokens now wrap with `overflow-wrap: anywhere`.

### 7. Secrets in git

**Wrong (checked):** `.gitignore` already ignores `.env*` and keeps `.env.example`. Example file has empty key only.

**Changed:** `.env.example` comments say the key is server-only. Settings copy no longer prints the env var name as if it belonged on the phone.

### 8. IndexedDB trash integrity

**Wrong:** Soft-delete forced `endedAt`, so restoring an in-progress episode came back as finished. Forever-delete scanned every message.

**Changed:** Trash only sets `deletedAt`. Restore strips that field and keeps analysis / open state. Purge uses the `bySession` index. Forever-delete still asks for a second tap in the UI.

## Residual risks

- In-memory rate limits (chat 24/min, analyze 8, period 6 per client IP) reset per server instance; they are a brake, not a WAF.
- Same-origin assumed. A future extra origin needs an explicit allow-list, not `*`.
- Prompt injection cannot be fully closed while user text is sent to a general model.
- Local IndexedDB and `localStorage` profile are readable by any script on this origin; XSS on this origin is still game over.
- No auth: anyone who can reach the deployment can spend the DeepSeek key. Protect the host; do not put the key in the browser.
- Image compress runs in-page; a hostile huge file is rejected by size, but canvas work still costs a beat.

## What we did not do

No account system, no cloud sync, no architecture rewrite. Keys stay on the server (`DEEPSEEK_API_KEY`).
