-- Keep Prisma's migration engine aligned after applying its SQL through the
-- CloudBase PostgreSQL migration runner. Checksums are from the source Prisma
-- migration.sql files, not these CloudBase copies.
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
VALUES
  ('814c0a1b-9e19-4fb1-a57a-d1260f4671a0', '618e1bda57b0c01becc4654d819bf6c24d878e6623906fa89e86bd71e9de75d9', now(), '20260908120000_init', now(), 1),
  ('5f94c43f-1027-4006-8969-e73a4cc928c2', '9abb8e99a015c515f3b85a318b040d086b3c987d0d6e62aeece1b96467f5a208', now(), '20260910153000_diary_cloud', now(), 1),
  ('c53ef388-82aa-4c59-9ee0-9ec42c10d5ec', 'd815ed341e34009be75e397ddfe5f4f18ee979a624818371d5a4f4f639c94811', now(), '20260913120000_user_consent_versions', now(), 1);
