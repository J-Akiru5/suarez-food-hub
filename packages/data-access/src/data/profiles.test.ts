import { describe, expect, it, vi } from "vitest";
import { getAdminIds, getProfileById } from "./profiles";

function makeChainable(result: unknown) {
  const p = Object.assign(Promise.resolve(result), {
    select: () => p,
    eq: () => p,
    order: () => p,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    update: () => p,
    then: (Promise.resolve(result) as any).then.bind(Promise.resolve(result)),
    catch: (Promise.resolve(result) as any).catch.bind(Promise.resolve(result)),
  });
  return p as any;
}

function mockSupabase(overrides?: Record<string, unknown>): any {
  const singleResult = overrides?.singleResult ?? { data: null, error: null };
  const queryResult = overrides?.queryResult ?? { data: [], error: null };

  return {
    from: vi.fn().mockImplementation((_table: string) => {
      if (overrides?.singleResult) {
        const c = makeChainable(singleResult);
        c.single = () => Promise.resolve(singleResult);
        return c;
      }
      return makeChainable(queryResult);
    }),
  };
}

describe("getAdminIds", () => {
  it("returns array of admin user IDs", async () => {
    const data = [{ id: "u-1" }, { id: "u-2" }];
    const supabase = mockSupabase({ queryResult: { data, error: null } });
    const ids = await getAdminIds(supabase);
    expect(ids).toEqual(data);
  });

  it("returns empty array on no admins", async () => {
    const supabase = mockSupabase({ queryResult: { data: [], error: null } });
    const ids = await getAdminIds(supabase);
    expect(ids).toEqual([]);
  });

  it("returns empty array on null data", async () => {
    const supabase = mockSupabase({ queryResult: { data: null, error: null } });
    const ids = await getAdminIds(supabase);
    expect(ids).toEqual([]);
  });
});

describe("getProfileById", () => {
  it("returns profile when found", async () => {
    const profile = { id: "u-1", name: "Test", role: "customer" };
    const supabase = mockSupabase({ singleResult: { data: profile, error: null } });
    const result = await getProfileById(supabase, "u-1");
    expect(result).toEqual(profile);
  });

  it("returns null when not found", async () => {
    const supabase = mockSupabase({ singleResult: { data: null, error: null } });
    const result = await getProfileById(supabase, "u-missing");
    expect(result).toBeNull();
  });

  it("returns null on error", async () => {
    const supabase = mockSupabase({ singleResult: { data: null, error: new Error("db error") } });
    const result = await getProfileById(supabase, "u-1");
    expect(result).toBeNull();
  });
});
