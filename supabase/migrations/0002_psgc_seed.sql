-- =====================================================================
-- PSGC Seed — Regions (top level)
-- Run AFTER 0001_capstone_full.sql
-- =====================================================================
-- Full PSGC data: https://psgc.gitlab.io/api/
-- This seeds all 17 PH regions. Province/city/barangay data is fetched
-- on-demand from the public PSGC API and cached in the locations table.

INSERT INTO locations (id, type, name, code) VALUES
  ('010000000', 'region', 'Ilocos Region', '01'),
  ('020000000', 'region', 'Cagayan Valley', '02'),
  ('030000000', 'region', 'Central Luzon', '03'),
  ('040000000', 'region', 'CALABARZON', '04'),
  ('050000000', 'region', 'Bicol', '05'),
  ('060000000', 'region', 'Western Visayas', '06'),
  ('070000000', 'region', 'Central Visayas', '07'),
  ('080000000', 'region', 'Eastern Visayas', '08'),
  ('090000000', 'region', 'Zamboanga Peninsula', '09'),
  ('100000000', 'region', 'Northern Mindanao', '10'),
  ('110000000', 'region', 'Davao Region', '11'),
  ('120000000', 'region', 'SOCCSKSARGEN', '12'),
  ('130000000', 'region', 'Caraga', '13'),
  ('140000000', 'region', 'BARMM', '14'),
  ('150000000', 'region', 'Cordillera Administrative Region', '15'),
  ('160000000', 'region', 'NCR', '16'),
  ('170000000', 'region', 'MIMAROPA', '17')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Sample provinces (Western Visayas, where Suarez Food Hub is based)
-- =====================================================================
INSERT INTO locations (id, type, name, code, parent_id) VALUES
  ('060040000', 'province', 'Iloilo',             '063',  '060000000'),
  ('060300000', 'province', 'Negros Occidental',  '061',  '060000000'),
  ('060200000', 'province', 'Antique',            '060',  '060000000'),
  ('060500000', 'province', 'Capiz',              '061',  '060000000'),
  ('060600000', 'province', 'Aklan',              '060',  '060000000'),
  ('060790000', 'province', 'Guimaras',           '060',  '060000000')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Sample cities/municipalities (Iloilo)
-- =====================================================================
INSERT INTO locations (id, type, name, code, parent_id) VALUES
  ('063010000', 'city', 'Iloilo City',          '06301', '060040000'),
  ('063020000', 'city', 'Passi City',           '06302', '060040000'),
  ('063030000', 'city', 'Janiuay',              '06303', '060040000'),
  ('063040000', 'city', 'Calinog',              '06304', '060040000'),
  ('063050000', 'city', 'Lambunao',             '06305', '060040000'),
  ('063060000', 'city', 'Maasin',               '06306', '060040000'),
  ('063070000', 'city', 'Miagao',               '06307', '060040000'),
  ('063080000', 'city', 'Oton',                 '06308', '060040000'),
  ('063090000', 'city', 'Pavia',                '06309', '060040000'),
  ('063100000', 'city', 'Santa Barbara',        '06310', '060040000'),
  ('063110000', 'city', 'San Joaquin',          '06311', '060040000'),
  ('063120000', 'city', 'San Miguel',           '06312', '060040000'),
  ('063130000', 'city', 'Tigbauan',             '06313', '060040000'),
  ('063140000', 'city', 'Tubungan',             '06314', '060040000'),
  ('063150000', 'city', 'Zarraga',              '06315', '060040000'),
  ('063160000', 'city', 'Leon',                 '06316', '060040000'),
  ('063170000', 'city', 'Dingle',               '06317', '060040000'),
  ('063180000', 'city', 'Bingawan',             '06318', '060040000'),
  ('063190000', 'city', 'Batad',                '06319', '060040000'),
  ('063200000', 'city', 'Balasan',              '06320', '060040000'),
  ('063210000', 'city', 'Barotac Nuevo',        '06321', '060040000'),
  ('063220000', 'city', 'Barotac Viejo',        '06322', '060040000'),
  ('063230000', 'city', 'Carles',               '06323', '060040000'),
  ('063240000', 'city', 'Concepcion',           '06324', '060040000'),
  ('063250000', 'city', 'Dumangas',             '06325', '060040000'),
  ('063260000', 'city', 'Estancia',             '06326', '060040000'),
  ('063270000', 'city', 'Guimbal',              '06327', '060040000'),
  ('063280000', 'city', 'Igbaras',              '06328', '060040000'),
  ('063290000', 'city', 'Lemery',               '06329', '060040000'),
  ('063300000', 'city', 'Mina',                 '06330', '060040000'),
  ('063310000', 'city', 'New Lucena',           '06331', '060040000'),
  ('063320000', 'city', 'Pototan',              '06332', '060040000'),
  ('063330000', 'city', 'San Dionisio',         '06333', '060040000'),
  ('063340000', 'city', 'San Enrique',          '06334', '060040000'),
  ('063350000', 'city', 'Sara',                 '06335', '060040000'),
  ('063360000', 'city', 'Ajuy',                 '06336', '060040000'),
  ('063370000', 'city', 'Alimodian',            '06337', '060040000'),
  ('063380000', 'city', 'Anilao',               '06338', '060040000'),
  ('063390000', 'city', 'Badiangan',            '06339', '060040000'),
  ('063400000', 'city', 'Banate',               '06340', '060040000'),
  ('063410000', 'city', 'Cabatuan',             '06341', '060040000'),
  ('063420000', 'city', 'San Rafael',           '06342', '060040000')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Sample barangays in Janiuay (where Suarez Food Hub is based)
-- =====================================================================
INSERT INTO locations (id, type, name, code, parent_id) VALUES
  ('063030001', 'barangay', 'Abangay',         '063030001', '063030000'),
  ('063030002', 'barangay', 'Agcarope',        '063030002', '063030000'),
  ('063030003', 'barangay', 'Agbubao',         '063030003', '063030000'),
  ('063030004', 'barangay', 'Alimono',         '063030004', '063030000'),
  ('063030005', 'barangay', 'Badiang',         '063030005', '063030000'),
  ('063030006', 'barangay', 'Balabag',         '063030006', '063030000'),
  ('063030007', 'barangay', 'Baras',           '063030007', '063030000'),
  ('063030008', 'barangay', 'Bungco',          '063030008', '063030000'),
  ('063030009', 'barangay', 'Buy-o',           '063030009', '063030000'),
  ('063030010', 'barangay', 'Cabacanan Proper','063030010', '063030000'),
  ('063030011', 'barangay', 'Cabangcalan',     '063030011', '063030000'),
  ('063030012', 'barangay', 'Cairohan',        '063030012', '063030000'),
  ('063030013', 'barangay', 'Dalipe',          '063030013', '063030000'),
  ('063030014', 'barangay', 'Gines',           '063030014', '063030000'),
  ('063030015', 'barangay', 'Guibuangan',      '063030015', '063030000'),
  ('063030016', 'barangay', 'Ingas',           '063030016', '063030000'),
  ('063030017', 'barangay', 'Layog',           '063030017', '063030000'),
  ('063030018', 'barangay', 'Lico',            '063030018', '063030000'),
  ('063030019', 'barangay', 'Maribong',        '063030019', '063030000'),
  ('063030020', 'barangay', 'Mina',            '063030020', '063030000'),
  ('063030021', 'barangay', 'Naulid',          '063030021', '063030000'),
  ('063030022', 'barangay', 'Paga',            '063030022', '063030000'),
  ('063030023', 'barangay', 'Poblacion',       '063030023', '063030000'),
  ('063030024', 'barangay', 'Quiasan',         '063030024', '063030000'),
  ('063030025', 'barangay', 'Sambag',          '063030025', '063030000'),
  ('063030026', 'barangay', 'Sinuagan',        '063030026', '063030000'),
  ('063030027', 'barangay', 'Talaba',          '063030027', '063030000'),
  ('063030028', 'barangay', 'Tambunac',        '063030028', '063030000'),
  ('063030029', 'barangay', 'Taytay',          '063030029', '063030000'),
  ('063030030', 'barangay', 'Tigbauan',        '063030030', '063030000'),
  ('063030031', 'barangay', 'Tina-an',         '063030031', '063030000')
ON CONFLICT (id) DO NOTHING;

-- After seeding, the app fetches remaining provinces/cities/barangays
-- from https://psgc.gitlab.io/api/ on demand and caches them.
