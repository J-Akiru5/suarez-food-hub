-- =====================================================================
-- reorder_products(p_ids uuid[]) — bulk reorder a subset of products
-- =====================================================================
-- p_ids: the desired top-to-bottom order of a SUBSET of products
--        (typically one category). Only the listed products are moved;
--        every other product keeps its position.
--
-- Semantics (matching move_product in 0023):
--   G = global position of each product from
--       ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC)
--       over non-deleted rows
--   The positions currently occupied by p_ids (sorted ascending) are
--   reassigned to p_ids in the given order.
--
-- Safety:
--   - Rejects duplicate ids in the input
--   - Ignores unknown / deleted ids silently
--   - One UPDATE touching only changed rows
--   - Sets updated_at like move_product
-- =====================================================================

CREATE OR REPLACE FUNCTION public.reorder_products(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cnt int;
  v_positions int[];
  v_id uuid;
  v_idx int;
BEGIN
  IF NOT is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff or admin can reorder products';
  END IF;

  -- Reject duplicate ids
  SELECT count(*) INTO v_cnt FROM unnest(p_ids) AS id;
  IF v_cnt <> (SELECT count(DISTINCT x) FROM unnest(p_ids) AS x) THEN
    RAISE EXCEPTION 'Duplicate product ids are not allowed';
  END IF;

  -- Collect current global positions of the target products (ascending)
  SELECT array_agg(pos ORDER BY pos ASC) INTO v_positions
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) AS pos
    FROM products WHERE deleted_at IS NULL AND id = ANY(p_ids)
  ) sub;

  -- Assign each requested product to the corresponding position
  FOR v_idx IN 1..array_length(p_ids, 1) LOOP
    v_id := p_ids[v_idx];
    UPDATE products
    SET sort_order = v_positions[v_idx],
        updated_at = (now() AT TIME ZONE 'UTC')
    WHERE id = v_id
      AND sort_order IS DISTINCT FROM v_positions[v_idx];
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_products(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reorder_products(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_products(uuid[]) FROM public;

NOTIFY pgrst, 'reload schema';
