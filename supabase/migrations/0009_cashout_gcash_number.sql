-- ===========================
-- 0009: Add gcash_number to rider_cashouts
-- ===========================
-- Riders can provide their GCash number when requesting a cashout
-- so admin knows where to send the payment.

ALTER TABLE rider_cashouts
  ADD COLUMN IF NOT EXISTS gcash_number TEXT;
