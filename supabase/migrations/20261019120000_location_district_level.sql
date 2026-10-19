-- =====================================================================
-- Location hierarchy: add the 'district' level (Iloilo City districts)
-- =====================================================================
-- WHY: Jaro is a district of Iloilo City — not a city and not a barangay.
-- The location_type enum only had region/province/city/barangay, and the
-- PSGC API publishes no district level for Iloilo City, so the customer
-- address flow had nowhere to show Jaro.
--
-- This migration is intentionally separate from the seed that inserts the
-- actual district rows: PostgreSQL does not allow a newly added enum value
-- to be used in the same transaction that adds it.
--
-- Backward compatible / non-destructive:
--   * 'district' is appended to the enum; existing values are untouched.
--   * profiles.district_id is nullable; existing rows and orders are
--     unaffected (historical delivery addresses remain as stored).
-- =====================================================================

ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'district';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS district_id TEXT;

COMMENT ON COLUMN profiles.district_id IS
  'City district (locations.type = ''district'') — e.g. Jaro for Iloilo City. Nullable; NULL for cities without districts.';
