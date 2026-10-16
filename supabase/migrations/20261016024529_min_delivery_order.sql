-- Minimum order value for delivery orders.
--
-- Peso amount applied to the order SUBTOTAL (before delivery fee).
-- NULL = no minimum. Set by staff (Staff -> Settings), enforced at web
-- checkout and in POST /api/orders, shown read-only on Admin -> Settings.
--
-- Idempotent: safe to re-run. Apply with `supabase db push --db-url ...`.

ALTER TABLE business
  ADD COLUMN IF NOT EXISTS delivery_min_order_amount integer DEFAULT NULL
  CHECK (delivery_min_order_amount IS NULL OR delivery_min_order_amount >= 0);
