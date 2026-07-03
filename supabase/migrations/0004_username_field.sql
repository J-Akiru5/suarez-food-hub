-- =====================================================================
-- Suarez Food Hub — Add username field to profiles
-- Idempotent: safe to re-run. Won't drop existing data.
-- =====================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Allow NULL for existing rows, but require unique non-null values
