-- products.restock_lead_time_days: days until a low-stock product is restocked.
--
-- The column already exists in the live database (it was created by hand) and is
-- typed in packages/types, but no migration in the repo created it. This makes a
-- fresh database match. Idempotent: safe to run on a database that has it.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS restock_lead_time_days integer
  CHECK (restock_lead_time_days IS NULL OR restock_lead_time_days >= 0);
