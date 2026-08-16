-- 0021: Restaurant origin (base_lat / base_lng) on business
-- The rider app uses the restaurant's coordinates as the start point for
-- Google Maps navigation links. Previously each page hardcoded the same
-- coordinate; now it lives on the real "business" table (the rider app
-- previously queried a nonexistent "business_config" table, firing 404/400s).
--
-- Seeded with the verified Google Maps pin for Suarez Siomai Food Hub
-- (maps.app.goo.gl/jomTnu42bgwEdgM28 → 10.9501875, 122.5065625, Janiuay, Iloilo).
-- Idempotent: safe to re-run; existing non-null values are never overwritten.

ALTER TABLE business
  ADD COLUMN IF NOT EXISTS base_lat NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS base_lng NUMERIC(10, 7);

UPDATE business
SET base_lat = 10.9501875,
    base_lng = 122.5065625
WHERE base_lat IS NULL AND base_lng IS NULL;
