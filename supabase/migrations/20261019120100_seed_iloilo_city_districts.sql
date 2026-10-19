-- =====================================================================
-- Seed: Iloilo City districts + barangays (delivery-location fix)
-- =====================================================================
-- WHY: Jaro is a DISTRICT of Iloilo City, not a city or barangay. PSGC
-- publishes no district level for Iloilo City, so the customer address
-- flow could never offer it. This seeds the district level plus all 180
-- Iloilo City barangays, each parented to its correct district.
--
-- SOURCES / VALIDATION:
--   * Barangay names + codes: PSA Philippine Standard Geographic Code
--     (PSGC), City of Iloilo (063022000) — 180 barangays:
--     https://psgc.gitlab.io/api/cities-municipalities/063022000/barangays
--   * District grouping: Iloilo City's seven administrative districts
--     (Arevalo, City Proper, Jaro, La Paz, Lapuz, Mandurriao, Molo).
--     PSGC publishes no district level or district codes for Iloilo City,
--     so the groups come from the city's published district barangay
--     lists. They were cross-checked against PSA data: official per-district
--     counts (45/25/42/25/18/13/12 = 180), complete one-to-one coverage of
--     all 180 PSGC codes, and the PSGC oldName district tags that
--     disambiguate repeated names (e.g. 063022199 San Isidro [La Paz] vs
--     063022151 San Isidro [Jaro]; 'Alalasan Lapuz'; 'Poblacion Molo').
--   * Region/province/city codes: https://psgc.gitlab.io/api/regions, .../provinces
--
-- NOTE: PSGC assigns no district codes for Iloilo City, so district ids are
-- synthetic: '<city PSGC code>-D<NAME>' (e.g. 063022000-DJARO). They are
-- deliberately not valid PSGC codes. Barangay ids ARE the official PSA codes.
--
-- Idempotent: rerunning upserts the same rows and creates no duplicates.
-- =====================================================================

-- Ancestors (required by the locations.parent_id FK).
-- DO NOTHING: if a row already exists, its other columns are left alone.
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('060000000', 'region',   'Western Visayas', '060000000', NULL,        FALSE),
  ('063000000', 'province', 'Iloilo',          '063000000', '060000000', FALSE),
  ('063022000', 'city',     'City of Iloilo',  '063022000', '063000000', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Districts of Iloilo City (7). Synthetic ids; code stays NULL because
-- PSGC publishes no district code for Iloilo City.
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022000-DAREVALO', 'district', 'Arevalo', NULL, '063022000', FALSE),
  ('063022000-DCITYPROPER', 'district', 'City Proper', NULL, '063022000', FALSE),
  ('063022000-DJARO', 'district', 'Jaro', NULL, '063022000', FALSE),
  ('063022000-DLAPAZ', 'district', 'La Paz', NULL, '063022000', FALSE),
  ('063022000-DLAPUZ', 'district', 'Lapuz', NULL, '063022000', FALSE),
  ('063022000-DMANDURRIAO', 'district', 'Mandurriao', NULL, '063022000', FALSE),
  ('063022000-DMOLO', 'district', 'Molo', NULL, '063022000', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;

-- Arevalo — 13 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022001', 'barangay', 'Santa Cruz', '063022001', '063022000-DAREVALO', FALSE),
  ('063022023', 'barangay', 'Bonifacio', '063022023', '063022000-DAREVALO', FALSE),
  ('063022031', 'barangay', 'Calaparan', '063022031', '063022000-DAREVALO', FALSE),
  ('063022048', 'barangay', 'Dulonan', '063022048', '063022000-DAREVALO', FALSE),
  ('063022109', 'barangay', 'Mohon', '063022109', '063022000-DAREVALO', FALSE),
  ('063022134', 'barangay', 'Quezon', '063022134', '063022000-DAREVALO', FALSE),
  ('063022155', 'barangay', 'San Jose', '063022155', '063022000-DAREVALO', FALSE),
  ('063022164', 'barangay', 'Santa Filomena', '063022164', '063022000-DAREVALO', FALSE),
  ('063022166', 'barangay', 'Santo Domingo', '063022166', '063022000-DAREVALO', FALSE),
  ('063022167', 'barangay', 'Santo Niño Norte', '063022167', '063022000-DAREVALO', FALSE),
  ('063022168', 'barangay', 'Santo Niño Sur', '063022168', '063022000-DAREVALO', FALSE),
  ('063022171', 'barangay', 'So-oc', '063022171', '063022000-DAREVALO', FALSE),
  ('063022194', 'barangay', 'Yulo Drive', '063022194', '063022000-DAREVALO', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- City Proper — 45 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022007', 'barangay', 'Arsenal Aduana', '063022007', '063022000-DCITYPROPER', FALSE),
  ('063022017', 'barangay', 'Baybay Tanza', '063022017', '063022000-DCITYPROPER', FALSE),
  ('063022020', 'barangay', 'Monica Blumentritt', '063022020', '063022000-DCITYPROPER', FALSE),
  ('063022022', 'barangay', 'Bonifacio Tanza', '063022022', '063022000-DCITYPROPER', FALSE),
  ('063022038', 'barangay', 'Concepcion-Montes', '063022038', '063022000-DCITYPROPER', FALSE),
  ('063022042', 'barangay', 'Danao', '063022042', '063022000-DCITYPROPER', FALSE),
  ('063022043', 'barangay', 'Mabolo-Delgado', '063022043', '063022000-DCITYPROPER', FALSE),
  ('063022054', 'barangay', 'Edganzon', '063022054', '063022000-DCITYPROPER', FALSE),
  ('063022055', 'barangay', 'Tanza-Esperanza', '063022055', '063022000-DCITYPROPER', FALSE),
  ('063022057', 'barangay', 'Flores', '063022057', '063022000-DCITYPROPER', FALSE),
  ('063022061', 'barangay', 'General Hughes-Montes', '063022061', '063022000-DCITYPROPER', FALSE),
  ('063022062', 'barangay', 'Gloria', '063022062', '063022000-DCITYPROPER', FALSE),
  ('063022069', 'barangay', 'Hipodromo', '063022069', '063022000-DCITYPROPER', FALSE),
  ('063022070', 'barangay', 'Inday', '063022070', '063022000-DCITYPROPER', FALSE),
  ('063022074', 'barangay', 'Jalandoni-Wilson', '063022074', '063022000-DCITYPROPER', FALSE),
  ('063022075', 'barangay', 'Delgado-Jalandoni-Bagumbayan', '063022075', '063022000-DCITYPROPER', FALSE),
  ('063022081', 'barangay', 'Kauswagan', '063022081', '063022000-DCITYPROPER', FALSE),
  ('063022089', 'barangay', 'Legaspi dela Rama', '063022089', '063022000-DCITYPROPER', FALSE),
  ('063022090', 'barangay', 'Liberation', '063022090', '063022000-DCITYPROPER', FALSE),
  ('063022102', 'barangay', 'Magsaysay', '063022102', '063022000-DCITYPROPER', FALSE),
  ('063022104', 'barangay', 'Malipayon-Delgado', '063022104', '063022000-DCITYPROPER', FALSE),
  ('063022107', 'barangay', 'Maria Clara', '063022107', '063022000-DCITYPROPER', FALSE),
  ('063022113', 'barangay', 'Muelle Loney-Montes', '063022113', '063022000-DCITYPROPER', FALSE),
  ('063022116', 'barangay', 'Nonoy', '063022116', '063022000-DCITYPROPER', FALSE),
  ('063022122', 'barangay', 'Ortiz', '063022122', '063022000-DCITYPROPER', FALSE),
  ('063022123', 'barangay', 'Osmeña', '063022123', '063022000-DCITYPROPER', FALSE),
  ('063022125', 'barangay', 'Rizal Palapala I', '063022125', '063022000-DCITYPROPER', FALSE),
  ('063022126', 'barangay', 'Rizal Palapala II', '063022126', '063022000-DCITYPROPER', FALSE),
  ('063022131', 'barangay', 'President Roxas', '063022131', '063022000-DCITYPROPER', FALSE),
  ('063022136', 'barangay', 'Rima-Rizal', '063022136', '063022000-DCITYPROPER', FALSE),
  ('063022137', 'barangay', 'Rizal Estanzuela', '063022137', '063022000-DCITYPROPER', FALSE),
  ('063022138', 'barangay', 'Rizal Ibarra', '063022138', '063022000-DCITYPROPER', FALSE),
  ('063022140', 'barangay', 'Roxas Village', '063022140', '063022000-DCITYPROPER', FALSE),
  ('063022146', 'barangay', 'Sampaguita', '063022146', '063022000-DCITYPROPER', FALSE),
  ('063022148', 'barangay', 'San Agustin', '063022148', '063022000-DCITYPROPER', FALSE),
  ('063022150', 'barangay', 'San Felix', '063022150', '063022000-DCITYPROPER', FALSE),
  ('063022169', 'barangay', 'Santo Rosario-Duran', '063022169', '063022000-DCITYPROPER', FALSE),
  ('063022185', 'barangay', 'Timawa Tanza I', '063022185', '063022000-DCITYPROPER', FALSE),
  ('063022186', 'barangay', 'Timawa Tanza II', '063022186', '063022000-DCITYPROPER', FALSE),
  ('063022188', 'barangay', 'Veterans Village', '063022188', '063022000-DCITYPROPER', FALSE),
  ('063022189', 'barangay', 'Villa Anita', '063022189', '063022000-DCITYPROPER', FALSE),
  ('063022193', 'barangay', 'Yulo-Arroyo', '063022193', '063022000-DCITYPROPER', FALSE),
  ('063022195', 'barangay', 'Zamora-Melliza', '063022195', '063022000-DCITYPROPER', FALSE),
  ('063022197', 'barangay', 'Kahirupan', '063022197', '063022000-DCITYPROPER', FALSE),
  ('063022200', 'barangay', 'San Jose', '063022200', '063022000-DCITYPROPER', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- Jaro — 42 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022006', 'barangay', 'Arguelles', '063022006', '063022000-DJARO', FALSE),
  ('063022010', 'barangay', 'Balabago', '063022010', '063022000-DJARO', FALSE),
  ('063022011', 'barangay', 'Balantang', '063022011', '063022000-DJARO', FALSE),
  ('063022018', 'barangay', 'Benedicto', '063022018', '063022000-DJARO', FALSE),
  ('063022019', 'barangay', 'Bito-on', '063022019', '063022000-DJARO', FALSE),
  ('063022024', 'barangay', 'Buhang', '063022024', '063022000-DJARO', FALSE),
  ('063022026', 'barangay', 'Buntatala', '063022026', '063022000-DJARO', FALSE),
  ('063022028', 'barangay', 'Seminario', '063022028', '063022000-DJARO', FALSE),
  ('063022033', 'barangay', 'Camalig', '063022033', '063022000-DJARO', FALSE),
  ('063022034', 'barangay', 'El 98 Castilla', '063022034', '063022000-DJARO', FALSE),
  ('063022040', 'barangay', 'Cuartero', '063022040', '063022000-DJARO', FALSE),
  ('063022041', 'barangay', 'Cubay', '063022041', '063022000-DJARO', FALSE),
  ('063022044', 'barangay', 'Democracia', '063022044', '063022000-DJARO', FALSE),
  ('063022045', 'barangay', 'Desamparados', '063022045', '063022000-DJARO', FALSE),
  ('063022050', 'barangay', 'Dungon A', '063022050', '063022000-DJARO', FALSE),
  ('063022051', 'barangay', 'Dungon B', '063022051', '063022000-DJARO', FALSE),
  ('063022056', 'barangay', 'Fajardo', '063022056', '063022000-DJARO', FALSE),
  ('063022076', 'barangay', 'Javellana', '063022076', '063022000-DJARO', FALSE),
  ('063022078', 'barangay', 'Calubihan', '063022078', '063022000-DJARO', FALSE),
  ('063022084', 'barangay', 'Our Lady Of Fatima', '063022084', '063022000-DJARO', FALSE),
  ('063022086', 'barangay', 'Lanit', '063022086', '063022000-DJARO', FALSE),
  ('063022091', 'barangay', 'Libertad, Santa Isabel', '063022091', '063022000-DJARO', FALSE),
  ('063022093', 'barangay', 'Lopez Jaena', '063022093', '063022000-DJARO', FALSE),
  ('063022097', 'barangay', 'Luna', '063022097', '063022000-DJARO', FALSE),
  ('063022098', 'barangay', 'M. V. Hechanova', '063022098', '063022000-DJARO', FALSE),
  ('063022106', 'barangay', 'Marcelo H. del Pilar', '063022106', '063022000-DJARO', FALSE),
  ('063022108', 'barangay', 'Maria Cristina', '063022108', '063022000-DJARO', FALSE),
  ('063022112', 'barangay', 'Montinola', '063022112', '063022000-DJARO', FALSE),
  ('063022124', 'barangay', 'Our Lady Of Lourdes', '063022124', '063022000-DJARO', FALSE),
  ('063022135', 'barangay', 'Quintin Salas', '063022135', '063022000-DJARO', FALSE),
  ('063022144', 'barangay', 'Sambag', '063022144', '063022000-DJARO', FALSE),
  ('063022151', 'barangay', 'San Isidro', '063022151', '063022000-DJARO', FALSE),
  ('063022154', 'barangay', 'San Jose', '063022154', '063022000-DJARO', FALSE),
  ('063022159', 'barangay', 'San Pedro', '063022159', '063022000-DJARO', FALSE),
  ('063022161', 'barangay', 'San Roque', '063022161', '063022000-DJARO', FALSE),
  ('063022163', 'barangay', 'San Vicente', '063022163', '063022000-DJARO', FALSE),
  ('063022170', 'barangay', 'Simon Ledesma', '063022170', '063022000-DJARO', FALSE),
  ('063022175', 'barangay', 'Tabuc Suba', '063022175', '063022000-DJARO', FALSE),
  ('063022177', 'barangay', 'Tacas', '063022177', '063022000-DJARO', FALSE),
  ('063022179', 'barangay', 'Tagbac', '063022179', '063022000-DJARO', FALSE),
  ('063022182', 'barangay', 'Taytay Zone II', '063022182', '063022000-DJARO', FALSE),
  ('063022187', 'barangay', 'Ungka', '063022187', '063022000-DJARO', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- La Paz — 25 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022003', 'barangay', 'Aguinaldo', '063022003', '063022000-DLAPAZ', FALSE),
  ('063022012', 'barangay', 'Baldoza', '063022012', '063022000-DLAPAZ', FALSE),
  ('063022015', 'barangay', 'Bantud', '063022015', '063022000-DLAPAZ', FALSE),
  ('063022016', 'barangay', 'Banuyao', '063022016', '063022000-DLAPAZ', FALSE),
  ('063022029', 'barangay', 'Caingin', '063022029', '063022000-DLAPAZ', FALSE),
  ('063022046', 'barangay', 'Divinagracia', '063022046', '063022000-DLAPAZ', FALSE),
  ('063022063', 'barangay', 'Gustilo', '063022063', '063022000-DLAPAZ', FALSE),
  ('063022068', 'barangay', 'Hinactacan', '063022068', '063022000-DLAPAZ', FALSE),
  ('063022072', 'barangay', 'Ingore', '063022072', '063022000-DLAPAZ', FALSE),
  ('063022077', 'barangay', 'Jereos', '063022077', '063022000-DLAPAZ', FALSE),
  ('063022085', 'barangay', 'Laguda', '063022085', '063022000-DLAPAZ', FALSE),
  ('063022095', 'barangay', 'Lopez Jaena Norte', '063022095', '063022000-DLAPAZ', FALSE),
  ('063022096', 'barangay', 'Lopez Jaena Sur', '063022096', '063022000-DLAPAZ', FALSE),
  ('063022099', 'barangay', 'Burgos-Mabini-Plaza', '063022099', '063022000-DLAPAZ', FALSE),
  ('063022100', 'barangay', 'Macarthur', '063022100', '063022000-DLAPAZ', FALSE),
  ('063022101', 'barangay', 'Magdalo', '063022101', '063022000-DLAPAZ', FALSE),
  ('063022103', 'barangay', 'Magsaysay Village', '063022103', '063022000-DLAPAZ', FALSE),
  ('063022114', 'barangay', 'Nabitasan', '063022114', '063022000-DLAPAZ', FALSE),
  ('063022139', 'barangay', 'Railway', '063022139', '063022000-DLAPAZ', FALSE),
  ('063022157', 'barangay', 'San Nicolas', '063022157', '063022000-DLAPAZ', FALSE),
  ('063022183', 'barangay', 'Ticud', '063022183', '063022000-DLAPAZ', FALSE),
  ('063022198', 'barangay', 'Luna', '063022198', '063022000-DLAPAZ', FALSE),
  ('063022199', 'barangay', 'San Isidro', '063022199', '063022000-DLAPAZ', FALSE),
  ('063022201', 'barangay', 'Tabuc Suba', '063022201', '063022000-DLAPAZ', FALSE),
  ('063022202', 'barangay', 'Rizal', '063022202', '063022000-DLAPAZ', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- Lapuz — 12 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022005', 'barangay', 'Alalasan Lapuz', '063022005', '063022000-DLAPUZ', FALSE),
  ('063022014', 'barangay', 'Sinikway', '063022014', '063022000-DLAPUZ', FALSE),
  ('063022047', 'barangay', 'Don Esteban-Lapuz', '063022047', '063022000-DLAPUZ', FALSE),
  ('063022073', 'barangay', 'Jalandoni Estate-Lapuz', '063022073', '063022000-DLAPUZ', FALSE),
  ('063022087', 'barangay', 'Lapuz Norte', '063022087', '063022000-DLAPUZ', FALSE),
  ('063022088', 'barangay', 'Lapuz Sur', '063022088', '063022000-DLAPUZ', FALSE),
  ('063022092', 'barangay', 'Libertad-Lapuz', '063022092', '063022000-DLAPUZ', FALSE),
  ('063022094', 'barangay', 'Loboc-Lapuz', '063022094', '063022000-DLAPUZ', FALSE),
  ('063022105', 'barangay', 'Mansaya-Lapuz', '063022105', '063022000-DLAPUZ', FALSE),
  ('063022121', 'barangay', 'Obrero-Lapuz', '063022121', '063022000-DLAPUZ', FALSE),
  ('063022132', 'barangay', 'Progreso-Lapuz', '063022132', '063022000-DLAPUZ', FALSE),
  ('063022133', 'barangay', 'Punong-Lapuz', '063022133', '063022000-DLAPUZ', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- Mandurriao — 18 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022004', 'barangay', 'Airport', '063022004', '063022000-DMANDURRIAO', FALSE),
  ('063022009', 'barangay', 'Bakhaw', '063022009', '063022000-DMANDURRIAO', FALSE),
  ('063022021', 'barangay', 'Bolilao', '063022021', '063022000-DMANDURRIAO', FALSE),
  ('063022025', 'barangay', 'Buhang Taft North', '063022025', '063022000-DMANDURRIAO', FALSE),
  ('063022030', 'barangay', 'Calahunan', '063022030', '063022000-DMANDURRIAO', FALSE),
  ('063022049', 'barangay', 'Dungon', '063022049', '063022000-DMANDURRIAO', FALSE),
  ('063022064', 'barangay', 'Guzman-Jesena', '063022064', '063022000-DMANDURRIAO', FALSE),
  ('063022067', 'barangay', 'Hibao-an Sur', '063022067', '063022000-DMANDURRIAO', FALSE),
  ('063022115', 'barangay', 'Navais', '063022115', '063022000-DMANDURRIAO', FALSE),
  ('063022120', 'barangay', 'Oñate de Leon', '063022120', '063022000-DMANDURRIAO', FALSE),
  ('063022127', 'barangay', 'PHHC Block 17', '063022127', '063022000-DMANDURRIAO', FALSE),
  ('063022128', 'barangay', 'PHHC Block 22 NHA', '063022128', '063022000-DMANDURRIAO', FALSE),
  ('063022152', 'barangay', 'Hibao-an Norte', '063022152', '063022000-DMANDURRIAO', FALSE),
  ('063022160', 'barangay', 'San Rafael', '063022160', '063022000-DMANDURRIAO', FALSE),
  ('063022165', 'barangay', 'Santa Rosa', '063022165', '063022000-DMANDURRIAO', FALSE),
  ('063022176', 'barangay', 'Tabucan', '063022176', '063022000-DMANDURRIAO', FALSE),
  ('063022178', 'barangay', 'Abeto Mirasol Taft South', '063022178', '063022000-DMANDURRIAO', FALSE),
  ('063022196', 'barangay', 'Pale Benedicto Rizal', '063022196', '063022000-DMANDURRIAO', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- Molo — 25 barangays (PSA PSGC codes + official names)
INSERT INTO locations (id, type, name, code, parent_id, is_custom) VALUES
  ('063022008', 'barangay', 'North Avanceña', '063022008', '063022000-DMOLO', FALSE),
  ('063022032', 'barangay', 'Calumpang', '063022032', '063022000-DMOLO', FALSE),
  ('063022035', 'barangay', 'Cochero', '063022035', '063022000-DMOLO', FALSE),
  ('063022036', 'barangay', 'Compania', '063022036', '063022000-DMOLO', FALSE),
  ('063022052', 'barangay', 'East Baluarte', '063022052', '063022000-DMOLO', FALSE),
  ('063022053', 'barangay', 'East Timawa', '063022053', '063022000-DMOLO', FALSE),
  ('063022060', 'barangay', 'South Fundidor', '063022060', '063022000-DMOLO', FALSE),
  ('063022065', 'barangay', 'Habog-habog Salvacion', '063022065', '063022000-DMOLO', FALSE),
  ('063022071', 'barangay', 'Infante', '063022071', '063022000-DMOLO', FALSE),
  ('063022079', 'barangay', 'Kasingkasing', '063022079', '063022000-DMOLO', FALSE),
  ('063022080', 'barangay', 'Katilingban', '063022080', '063022000-DMOLO', FALSE),
  ('063022110', 'barangay', 'Molo Boulevard', '063022110', '063022000-DMOLO', FALSE),
  ('063022117', 'barangay', 'North Fundidor', '063022117', '063022000-DMOLO', FALSE),
  ('063022118', 'barangay', 'North Baluarte', '063022118', '063022000-DMOLO', FALSE),
  ('063022119', 'barangay', 'North San Jose', '063022119', '063022000-DMOLO', FALSE),
  ('063022129', 'barangay', 'Poblacion Molo', '063022129', '063022000-DMOLO', FALSE),
  ('063022149', 'barangay', 'San Antonio', '063022149', '063022000-DMOLO', FALSE),
  ('063022156', 'barangay', 'San Juan', '063022156', '063022000-DMOLO', FALSE),
  ('063022158', 'barangay', 'San Pedro', '063022158', '063022000-DMOLO', FALSE),
  ('063022172', 'barangay', 'South Baluarte', '063022172', '063022000-DMOLO', FALSE),
  ('063022173', 'barangay', 'South San Jose', '063022173', '063022000-DMOLO', FALSE),
  ('063022174', 'barangay', 'Taal', '063022174', '063022000-DMOLO', FALSE),
  ('063022181', 'barangay', 'Tap-oc', '063022181', '063022000-DMOLO', FALSE),
  ('063022191', 'barangay', 'West Habog-habog', '063022191', '063022000-DMOLO', FALSE),
  ('063022192', 'barangay', 'West Timawa', '063022192', '063022000-DMOLO', FALSE)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type, name = EXCLUDED.name, code = EXCLUDED.code, parent_id = EXCLUDED.parent_id;

-- Sanity check (run manually if needed):
--   SELECT parent_id, count(*) FROM locations WHERE type = 'barangay'
--   AND parent_id LIKE '063022000-D%' GROUP BY parent_id ORDER BY parent_id;

-- Backfill the new profiles.district_id for existing Iloilo City customers.
-- Their barangay already identifies the district, so nobody has to re-save
-- their address (and order-time validation keeps accepting it). Only NULL
-- district ids are touched — idempotent and non-destructive.
UPDATE profiles p
   SET district_id = l.parent_id
  FROM locations l
  JOIN locations d ON d.id = l.parent_id AND d.type = 'district'
 WHERE p.barangay_id = l.id
   AND l.type = 'barangay'
   AND p.district_id IS NULL;
