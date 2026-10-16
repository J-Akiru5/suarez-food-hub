-- 0028: Distance-based delivery fee
-- Run manually via the Supabase SQL editor.
--
-- Replaces the single flat delivery fee with admin-editable distance tiers
-- stored as JSONB on the business table (same JSONB-settings pattern as
-- operating_hours / about_content from 0025).
--
-- Default tiers (client-approved):
--   0–2 km   → ₱20
--   2–5 km   → ₱40
--   5–10 km  → ₱70
--   10–15 km → ₱120
-- Orders beyond max_delivery_km are rejected at checkout.
--
-- business.delivery_fee is KEPT as the fallback flat fee for orders where
-- no coordinates are available (no map pin set and no town centroid).
--
-- Idempotent: safe to re-run.

ALTER TABLE business
  ADD COLUMN IF NOT EXISTS delivery_tiers JSONB NOT NULL DEFAULT '[
    {"max_km": 2,  "fee": 20},
    {"max_km": 5,  "fee": 40},
    {"max_km": 10, "fee": 70},
    {"max_km": 15, "fee": 120}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS max_delivery_km NUMERIC(5, 2) NOT NULL DEFAULT 15;

-- The free-delivery threshold is retired — the distance tier is now the
-- only fee driver. (0022's historical backfill already ran; nothing in the
-- current app code reads this column.)
ALTER TABLE business DROP COLUMN IF EXISTS free_delivery_min;

-- Optional town centroids on the PSGC cache table. When a town has a
-- centroid, orders WITHOUT a map pin can still be priced by distance.
-- Towns without centroids simply fall back to business.delivery_fee.
-- Populate with, e.g.:
--   UPDATE locations SET centroid_lat = 10.9501875, centroid_lng = 122.5065625
--   WHERE id = '<town-psgc-code>';
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS centroid_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS centroid_lng DOUBLE PRECISION;
