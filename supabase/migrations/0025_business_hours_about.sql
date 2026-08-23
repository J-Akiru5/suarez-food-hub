-- ===========================
-- 0025: Operating hours & About Us content
-- ===========================
-- Adds two JSONB columns to the business table:
-- 1. operating_hours: per-day open/close times
-- 2. about_content: dynamic About Us page content

ALTER TABLE business
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT NULL;

ALTER TABLE business
ADD COLUMN IF NOT EXISTS about_content JSONB DEFAULT NULL;

-- ===========================
-- operating_hours format:
-- {
--   "monday":    { "open": true,  "open_time": "10:00", "close_time": "21:00" },
--   "tuesday":   { "open": true,  "open_time": "10:00", "close_time": "21:00" },
--   "wednesday": { "open": true,  "open_time": "10:00", "close_time": "21:00" },
--   "thursday":  { "open": true,  "open_time": "10:00", "close_time": "21:00" },
--   "friday":    { "open": true,  "open_time": "10:00", "close_time": "21:00" },
--   "saturday":  { "open": true,  "open_time": "10:00", "close_time": "21:00" },
--   "sunday":    { "open": false, "open_time": "10:00", "close_time": "21:00" }
-- }
-- ===========================
-- about_content format:
-- {
--   "hero": { "title": "...", "description": "..." },
--   "mission": { "title": "Our Mission", "description": "..." },
--   "vision": { "title": "Our Vision", "description": "..." },
--   "values": [
--     { "title": "...", "description": "..." },
--     ...
--   ],
--   "timeline": [
--     { "year": "2024", "title": "...", "description": "..." },
--     ...
--   ]
-- }
