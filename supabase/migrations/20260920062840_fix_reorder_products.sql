-- =====================================================================
-- fix_reorder_products — correct position computation
-- =====================================================================
-- Problem: The original reorder_products (0028) computes ROW_NUMBER() AFTER
-- filtering to p_ids, so positions are 1..N, not global. In
-- [A1 B1 A2 B2 A3 B3 A4 B4] reversing category A yields
-- A4=1 B1=2 A3=2 A2=3 A1=4 B2=4 ... (ties, cross-category reshuffle)
-- instead of A4=1 B1=2 A3=3 B2=4 A2=5 B3=6 A1=7 B4=8.
-- Empty array raises "upper bound of FOR loop cannot be null";
-- an unknown/deleted id misaligns positions (live column is NOT NULL,
-- so it errors and rolls back).
--
-- Fix: Compute ROW_NUMBER() over ALL non-deleted products, then use a
-- CTE-based approach to handle empty arrays, unknown ids, and duplicates.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.reorder_products(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff or admin can reorder products';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RETURN;
  END IF;
  IF cardinality(p_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_ids) AS x) THEN
    RAISE EXCEPTION 'Duplicate product ids are not allowed';
  END IF;
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) AS pos
    FROM products WHERE deleted_at IS NULL
  ),
  target AS (
    SELECT r.id, r.pos, t.ord
    FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
    JOIN ranked r ON r.id = t.id
  ),
  slots AS (SELECT pos, ROW_NUMBER() OVER (ORDER BY pos) AS k FROM target),
  wanted AS (
    SELECT t.id, s.pos AS new_pos
    FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY ord) AS k FROM target) t
    JOIN slots s ON s.k = t.k
  ),
  final AS (
    SELECT r.id, COALESCE(w.new_pos, r.pos) AS new_pos
    FROM ranked r LEFT JOIN wanted w ON w.id = r.id
  )
  UPDATE products p
  SET sort_order = f.new_pos, updated_at = (now() AT TIME ZONE 'UTC')
  FROM final f
  WHERE p.id = f.id AND p.sort_order IS DISTINCT FROM f.new_pos;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_products(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_products(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.reorder_products(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
