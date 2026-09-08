# @littlemo/db

PostgreSQL + Prisma for 有点情绪 cloud API (WeChat mini-program V1).

## Models

- **User** — WeChat `openid` (unique), optional `unionid` / nickname / avatar.
- **Note** — user-authored bubbles. Optional `clientId` for idempotent creates. Soft delete via `deletedAt`.
- **ChatMessage** — persisted companion thread (`user` | `assistant`), optional `model` on AI rows.

Insight / period / analyze data is **not** in this schema. Those remain web-only (IndexedDB + `/api/analyze` `/api/period`).

## Commands

From repo root (needs `DATABASE_URL` in `.env`):

```bash
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

Initial SQL: `prisma/migrations/20260908120000_init/migration.sql`.
