import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Data-integrity tests for the Iloilo City district/barangay seed.
 *
 * These parse the committed migration files (the single source of truth for
 * what reaches the database) so a bad edit — a wrong parent, a dropped
 * barangay, a lost ON CONFLICT guard — fails the test suite instead of
 * silently shipping.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const enumMigrationPath = resolve(repoRoot, "supabase/migrations/20261019120000_location_district_level.sql");
const seedMigrationPath = resolve(repoRoot, "supabase/migrations/20261019120100_seed_iloilo_city_districts.sql");

const enumMigration = readFileSync(enumMigrationPath, "utf8");
const seedMigration = readFileSync(seedMigrationPath, "utf8");

interface SeedRow {
  id: string;
  type: string;
  name: string;
  code: string | null;
  parentId: string | null;
}

// Generated rows are one per line: ('id', 'type', 'name', 'code', 'parent', FALSE),
const ROW_RE = /^\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(NULL|'[^']+'),\s*(NULL|'[^']+'),\s*FALSE\),?\s*$/gm;

function parseSeedRows(sql: string): SeedRow[] {
  const rows: SeedRow[] = [];
  for (const match of sql.matchAll(ROW_RE)) {
    const strip = (v: string) => (v === "NULL" ? null : v.slice(1, -1));
    rows.push({
      id: match[1],
      type: match[2],
      name: match[3],
      code: strip(match[4]),
      parentId: strip(match[5]),
    });
  }
  return rows;
}

const rows = parseSeedRows(seedMigration);
const districts = rows.filter((r) => r.type === "district");
const barangays = rows.filter((r) => r.type === "barangay");
const cityRow = rows.find((r) => r.id === "063022000");

// Official per-district barangay counts for Iloilo City.
const EXPECTED_PER_DISTRICT: Record<string, number> = {
  "063022000-DAREVALO": 13,
  "063022000-DCITYPROPER": 45,
  "063022000-DJARO": 42,
  "063022000-DLAPAZ": 25,
  "063022000-DLAPUZ": 12,
  "063022000-DMANDURRIAO": 18,
  "063022000-DMOLO": 25,
};

describe("Iloilo City district seed migration", () => {
  it("seeds the City of Iloilo ancestor the districts hang from", () => {
    expect(cityRow).toMatchObject({ type: "city", name: "City of Iloilo" });
  });

  it("seeds exactly the 7 official districts under City of Iloilo (063022000)", () => {
    expect(districts).toHaveLength(7);
    expect(districts.map((d) => d.name).sort()).toEqual(
      ["Arevalo", "City Proper", "Jaro", "La Paz", "Lapuz", "Mandurriao", "Molo"].sort(),
    );
    for (const district of districts) {
      expect(district.parentId).toBe("063022000");
      // PSGC publishes no district code for Iloilo City — ids are synthetic.
      expect(district.id).toMatch(/^063022000-D[A-Z]+$/);
      expect(district.code).toBeNull();
    }
  });

  it("makes Jaro selectable with its 42 verified barangays", () => {
    const jaro = districts.find((d) => d.name === "Jaro");
    expect(jaro?.id).toBe("063022000-DJARO");
    const jaroBarangays = barangays.filter((b) => b.parentId === "063022000-DJARO");
    expect(jaroBarangays).toHaveLength(42);
    // Spot checks: well-known Jaro barangays with their PSA PSGC codes.
    for (const [code, name] of [
      ["063022010", "Balabago"],
      ["063022187", "Ungka"],
      ["063022144", "Sambag"],
      ["063022019", "Bito-on"],
      ["063022175", "Tabuc Suba"],
    ]) {
      expect(jaroBarangays).toContainEqual(expect.objectContaining({ id: code, name, parentId: "063022000-DJARO" }));
    }
  });

  it("covers all 180 Iloilo City barangays with PSA PSGC codes", () => {
    expect(barangays).toHaveLength(180);
    const ids = barangays.map((b) => b.id);
    expect(new Set(ids).size).toBe(180); // no duplicates
    for (const b of barangays) {
      expect(b.id).toMatch(/^063022\d{3}$/);
      expect(b.code).toBe(b.id); // code column mirrors the PSGC code
    }
  });

  it("parents every barangay to one of the seeded districts, with official counts", () => {
    const counts = new Map<string, number>();
    for (const b of barangays) {
      const parent = b.parentId ?? "";
      expect(EXPECTED_PER_DISTRICT[parent], `unknown district parent: ${parent}`).toBeDefined();
      counts.set(parent, (counts.get(parent) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual(EXPECTED_PER_DISTRICT);
  });

  it("contains no duplicate barangay names within a district (cross-district names are legitimate)", () => {
    const seen = new Set<string>();
    for (const b of barangays) {
      const key = `${b.parentId}|${b.name.toLowerCase()}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("is idempotent — every insert upserts on the primary key", () => {
    // Districts + 7 barangay inserts all use ON CONFLICT (id) DO UPDATE.
    const updates = seedMigration.match(/ON CONFLICT \(id\) DO UPDATE SET/g) ?? [];
    expect(updates.length).toBe(8);
    expect(seedMigration).toContain("ON CONFLICT (id) DO NOTHING"); // ancestors
  });
});

describe("district level migration", () => {
  it("adds the district enum value and a nullable profiles.district_id", () => {
    expect(enumMigration).toContain("ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'district'");
    expect(enumMigration).toContain("ADD COLUMN IF NOT EXISTS district_id TEXT");
  });
});
