# @littlemo/db

PostgreSQL + Prisma for 有点情绪 cloud API (WeChat mini-program V1).

## Models

- **User** — WeChat `openid` (unique), optional `unionid` / nickname / avatar.
- **Note** — user-authored bubbles. Optional `clientId` for idempotent creates. Soft delete via `deletedAt`.
- **ChatMessage** — persisted companion thread (`user` | `assistant`), optional `model`, `sessionId`, `clientId`.
- **DiarySession** — mini-program emotion-diary episodes (title, analysis JSON, soft delete). Client id is the primary key.
- **PeriodReport** — week / month / 90-day insight, unique on `(userId, periodId)`.

Web insight data stays in IndexedDB. Logged-in mini-program diary uses these tables as source of truth.

## Commands

From repo root (needs `DATABASE_URL` in `.env`):

```bash
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

Initial SQL: `prisma/migrations/20260908120000_init/migration.sql`.
Diary cloud: `prisma/migrations/20260910153000_diary_cloud/migration.sql`.
