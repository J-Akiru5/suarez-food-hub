-- ============================================================
-- SFH Capstone - Demo Seed Data
-- Run AFTER 0001_capstone_full.sql and 0002_psgc_seed.sql
-- ============================================================

-- 1. Business Config
UPDATE business SET
  name = 'Suarez Food Hub',
  address = 'Brgy. Sapa 2, Janiuay, Iloilo',
  phone = '09123456789',
  email = 'hello@suarezfoodhub.com',
  gcash_qr_url = NULL,
  maya_qr_url = NULL,
  delivery_fee = 40,
  free_delivery_min = 200
WHERE name = 'Suarez Food Hub';

-- 2. Categories
INSERT INTO categories (id, name, slug, description, sort_order, is_active)
VALUES
  (gen_random_uuid(), 'Main Dish', 'main-dish', 'Our delicious siomai and main courses', 1, true),
  (gen_random_uuid(), 'Dumplings', 'dumplings', 'Handcrafted dumplings steamed or fried', 2, true),
  (gen_random_uuid(), 'Spring Rolls', 'spring-rolls', 'Crispy spring rolls with savory fillings', 3, true),
  (gen_random_uuid(), 'Drinks', 'drinks', 'Refreshments to complement your meal', 4, true);

-- 3. Products (need to capture category ids)
DO $$
DECLARE
  main_id UUID; dumpling_id UUID; spring_id UUID; drinks_id UUID;
BEGIN
  SELECT id INTO main_id FROM categories WHERE slug = 'main-dish' LIMIT 1;
  SELECT id INTO dumpling_id FROM categories WHERE slug = 'dumplings' LIMIT 1;
  SELECT id INTO spring_id FROM categories WHERE slug = 'spring-rolls' LIMIT 1;
  SELECT id INTO drinks_id FROM categories WHERE slug = 'drinks' LIMIT 1;

  INSERT INTO products (id, name, slug, description, base_price, image_url, category_id, quantity, buffer_quantity, availability, rating, is_featured)
  VALUES
    (gen_random_uuid(), 'Pork Siomai (6 pcs)', 'pork-siomai-6', 'Classic pork siomai served with special dipping sauce. 6 pieces per order.', 55, '/assets/siomai-1.png', main_id, 100, 10, 'available', 4.8, true),
    (gen_random_uuid(), 'Beef Siomai (6 pcs)', 'beef-siomai-6', 'Premium beef siomai, juicy and flavorful. 6 pieces per order.', 65, '/assets/siomai-2.png', main_id, 80, 10, 'available', 4.7, true),
    (gen_random_uuid(), 'Shrimp Siomai (6 pcs)', 'shrimp-siomai-6', 'Fresh shrimp siomai with a hint of ginger. 6 pieces per order.', 75, '/assets/siomai-3.png', main_id, 60, 8, 'available', 4.9, true),
    (gen_random_uuid(), 'Combination Siomai (6 pcs)', 'combo-siomai-6', 'Mix of pork, beef, and shrimp siomai. 2 of each. 6 pieces per order.', 70, '/assets/siomai-4.png', main_id, 50, 8, 'available', 4.6, false),
    (gen_random_uuid(), 'Pork Dumplings (6 pcs)', 'pork-dumplings-6', 'Handmade pork dumplings, choose steamed or fried. 6 pieces per order.', 60, '/assets/dumpling-1.png', dumpling_id, 70, 10, 'available', 4.5, false),
    (gen_random_uuid(), 'Shrimp & Chive Dumplings', 'shrimp-chive-dumplings', 'Delicate shrimp and chive dumplings. 6 pieces per order.', 80, '/assets/dumpling-2.png', dumpling_id, 40, 5, 'available', 4.7, false),
    (gen_random_uuid(), 'Dynamite Spring Rolls (4 pcs)', 'dynamite-spring-rolls', 'Spicy stuffed chili spring rolls. 4 pieces per order.', 50, '/assets/springroll-1.png', spring_id, 90, 10, 'available', 4.4, false),
    (gen_random_uuid(), 'Lumpiang Shanghai (6 pcs)', 'lumpiang-shanghai', 'Crispy pork spring rolls. 6 pieces per order.', 55, '/assets/springroll-2.png', spring_id, 85, 10, 'available', 4.6, false),
    (gen_random_uuid(), 'Iced Tea', 'iced-tea', 'Refreshing brewed iced tea.', 25, '/assets/drink-1.png', drinks_id, 200, 20, 'available', 4.3, false),
    (gen_random_uuid(), 'Bottled Water', 'bottled-water', '500ml mineral water.', 15, '/assets/drink-2.png', drinks_id, 300, 30, 'available', 4.0, false);
END $$;

-- Verify with:
-- SELECT p.name, c.name AS category, p.quantity, p.buffer_quantity, p.availability, p.rating
-- FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY c.sort_order, p.name;
