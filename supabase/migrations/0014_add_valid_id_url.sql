-- =====================================================================
-- Suarez Food Hub — Migration 0014: Add Valid ID URL to Profiles
-- =====================================================================
-- Adds valid_id_url column to store rider's uploaded valid government ID
-- (driver's license, passport, etc.) for admin verification.
-- =====================================================================

-- ===========================
-- 1. ADD COLUMN
-- ===========================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS valid_id_url TEXT;

-- ===========================
-- 2. UPDATE RLS (optional - profiles already have appropriate policies)
-- ===========================
-- Profiles already have RLS policies that allow admins and staff
-- to read all profiles, and users to update their own.
-- No additional policies needed.
