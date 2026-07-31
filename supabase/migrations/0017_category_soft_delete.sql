-- =====================================================================
-- 0017: Soft-delete support for categories
-- Fixes: staff couldn't delete categories (RLS only allowed admin hard-delete),
--        and hard-deletes were FK-blocked by referencing products.
-- Solution: soft-delete (set deleted_at + is_active=false) via UPDATE,
--           which staff are already allowed to do by existing RLS policies.
-- =====================================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
