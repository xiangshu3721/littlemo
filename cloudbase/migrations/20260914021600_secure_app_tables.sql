-- Public-schema tables are granted to anon/authenticated by default in this
-- CloudBase PostgreSQL environment. This app reads them only through its
-- authenticated backend, so block direct PostgREST access to personal data.
REVOKE ALL ON TABLE
  "User",
  "Note",
  "ChatMessage",
  "DiarySession",
  "PeriodReport"
FROM anon, authenticated;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiarySession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PeriodReport" ENABLE ROW LEVEL SECURITY;
