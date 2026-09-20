# Legacy SQL Files — HISTORICAL, NEVER APPLY

These files are kept for historical reference only. They were used before the Supabase CLI
was adopted as the single source of truth for database migrations.

**Never apply these files to any database.** All database changes should go through
`supabase/migrations/` via `supabase db push --db-url`.

## Why they exist

Before this sprint, the database was managed via:
1. Prisma schema (`prisma/schema.prisma`) for table structure
2. `supabase/infra.sql` for RLS, functions, triggers, storage (applied via SQL Editor)
3. `scripts/fix-rls*.sql` and `prisma/fix-rls*.sql` for ad-hoc RLS fixes

The Supabase CLI migrations (`supabase/migrations/`) now contain everything and are
the single source of truth.

## Files

| Original Path | Description |
|---|---|
| `infra.sql` | Master infrastructure layer (functions, RLS, storage, realtime) |
| `prisma-fix-rls.sql` | Profiles-only RLS fix (original) |
| `prisma-fix-rls-final.sql` | Comprehensive RLS for all tables |
| `prisma-fix-rls-all.sql` | Targeted patch for business + cashouts |
| `scripts-fix-rls.sql` | Profiles-only RLS fix (original, no helper fn) |
| `scripts-fix-rls-v2.sql` | Profiles-only RLS fix (v2, recursion-safe) |
| `apply-rls.ts` | TypeScript RLS enforcement script (used `pg` driver) |

## Drift Status

Docker was unavailable during the foundation sprint, so `supabase db pull` could not be
run to capture live-only objects. These files may contain objects that exist in the live
database but are NOT in the migration files. A future `supabase db pull` (with Docker)
should reconcile this.

Objects from these files that are confirmed present in the live database (via migration
history or probe):
- All RLS policies from `infra.sql` → covered by migrations 0001-0027
- Helper functions (`is_admin`, `is_staff_or_admin`, `is_rider`, `get_email_by_username`) → covered by 0001
- Storage buckets and policies → covered by 0001
- Realtime publication entries → covered by 0001, 0018, 0020

**Status: DRIFT CAPTURE PENDING** — run `supabase db pull --db-url <url>` when Docker is available.
