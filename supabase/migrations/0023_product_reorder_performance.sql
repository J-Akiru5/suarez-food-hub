-- =====================================================================
-- Suarez Food Hub — Product Reorder Performance (0023)
-- Run in Supabase SQL Editor (https://app.supabase.com)
-- Idempotent: safe to re-run. Won't drop existing data.
--
-- Fixes the "moving products up/down is slow" complaint:
--
--  1. Covering index for every product listing query. The menu,
--     inventory and API all read:
--         WHERE deleted_at IS NULL
--         ORDER BY sort_order ASC, created_at DESC
--     The existing idx_products_category_sort(category_id, sort_order)
--     cannot serve that shape (wrong leading column, no deleted_at
--     filter), so Postgres filtered + sorted every read.
--
--  2. move_product() RPC — the whole reorder (find same-category
--     neighbour, swap display positions, resequence sort_order) now
--     happens ATOMICALLY SERVER-SIDE in ONE round trip. Previously the
--     client issued ONE UPDATE PER PRODUCT sequentially; with ~30
--     products that was ~30 sequential HTTP requests before the list
--     could refresh — the direct cause of the sluggish response.
--     The UPDATE only touches rows whose sort_order actually changes
--     (normally 2), so realtime emits 2 events instead of N.
-- =====================================================================

-- ===========================
-- 1. Covering index for the standard listing sort
-- ===========================
CREATE INDEX IF NOT EXISTS idx_products_active_listing
  ON products (sort_order ASC, created_at DESC)
  WHERE deleted_at IS NULL;

ANALYZE products;

-- ===========================
-- 2. Atomic reorder RPC
-- ===========================
-- Semantics mirror the previous client-side logic exactly:
--   * neighbour search skips products from OTHER categories (a flat
--     list means the adjacent row isn't necessarily the same category),
--     treating NULL category_id as its own group.
--   * ties on legacy sort_order values are broken by created_at DESC —
--     same as the app's ORDER BY — and the swap persists DISTINCT
--     positions, which also normalizes legacy duplicates in one shot.
--   * already first/last in its category -> no-op.
CREATE OR REPLACE FUNCTION public.move_product(
  p_product_id UUID,
  p_direction TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff or admin can reorder products';
  END IF;

  IF p_direction NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid direction: %', p_direction;
  END IF;

  WITH ranked AS (
    -- Distinct display position for every non-deleted product.
    SELECT id,
           category_id,
           ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) AS pos
    FROM products
    WHERE deleted_at IS NULL
  ),
  me AS (
    SELECT pos, category_id FROM ranked WHERE id = p_product_id
  ),
  neighbor AS (
    SELECT CASE WHEN p_direction = 'up'
             THEN (
               SELECT MAX(r2.pos) FROM ranked r2
               WHERE r2.category_id IS NOT DISTINCT FROM (SELECT category_id FROM me)
                 AND r2.pos < (SELECT pos FROM me)
             )
             ELSE (
               SELECT MIN(r2.pos) FROM ranked r2
               WHERE r2.category_id IS NOT DISTINCT FROM (SELECT category_id FROM me)
                 AND r2.pos > (SELECT pos FROM me)
             )
           END AS npos
  ),
  swapped AS (
    SELECT r.id,
           CASE
             WHEN r.id = p_product_id THEN n.npos
             WHEN r.pos = n.npos      THEN m.pos
             ELSE r.pos
           END AS new_pos
    FROM ranked r
    CROSS JOIN me m
    CROSS JOIN neighbor n
    WHERE n.npos IS NOT NULL
  )
  UPDATE products p
  SET sort_order = s.new_pos,
      updated_at = (now() AT TIME ZONE 'UTC')
  FROM swapped s
  WHERE p.id = s.id
    AND p.sort_order IS DISTINCT FROM s.new_pos;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_product(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.move_product(UUID, TEXT) FROM anon;

-- ===========================
-- DONE
-- ===========================
