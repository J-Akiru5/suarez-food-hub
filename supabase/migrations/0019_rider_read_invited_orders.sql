-- =====================================================================
-- Suarez Food Hub — Rider Invite Visibility Fix (0019)
-- Run in Supabase SQL Editor (https://app.supabase.com)
-- Idempotent: safe to re-run.
--
-- Bug: The existing policy "riders read assigned orders" only lets a
-- rider SELECT orders where rider_id = auth.uid(). With the broadcast
-- model, an INVITED rider has rider_id = NULL (set only on acceptance),
-- so invited riders could never read the order — the rider home page's
-- "Available Deliveries" section was always empty and riders could
-- never accept an invite.
--
-- Fix: Add a policy that also lets a rider read orders where their id
-- appears in the pending_riders jsonb array (jsonb "?" operator checks
-- array element membership).
-- =====================================================================

DROP POLICY IF EXISTS "riders read invited orders" ON public.orders;

CREATE POLICY "riders read invited orders" ON public.orders
FOR SELECT
USING (pending_riders ? auth.uid()::text);
