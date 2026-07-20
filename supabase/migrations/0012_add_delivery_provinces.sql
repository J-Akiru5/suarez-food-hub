-- Add delivery_provinces column to the business table
-- Stores comma-separated province IDs allowed for delivery
-- When NULL or empty, delivery is available to all areas
-- Example: '060040000' for Iloilo province only
-- Example: '060040000,060030000' for Iloilo and Capiz

ALTER TABLE business
ADD COLUMN IF NOT EXISTS delivery_provinces TEXT DEFAULT NULL;
