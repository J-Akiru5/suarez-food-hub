-- Migration 0015: Add pending_riders JSONB column to orders
-- Enables broadcasting an order to multiple riders simultaneously

ALTER TABLE orders
  ADD COLUMN pending_riders JSONB DEFAULT '[]'::jsonb;

-- Add a GIN index for querying JSONB array containment
CREATE INDEX idx_orders_pending_riders ON orders USING gin (pending_riders);

COMMENT ON COLUMN orders.pending_riders IS 'Array of rider IDs who have been invited to accept this order. First to accept gets it.';
