import { describe, expect, it, vi } from "vitest";
import { getOrderById, getOrdersByUser, updateOrderStatus } from "./orders";

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
  const maybeSingleResult = overrides?.maybeSingleResult ?? { data: null, error: null };
  const queryResult = overrides?.queryResult ?? { data: [], error: null };
  const updateResult = overrides?.updateResult ?? { error: null };

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue(
          overrides?.getUserResult ?? { data: { user: { id: "user-1", email: "test@test.com" } }, error: null },
        ),
    },
    from: vi.fn().mockImplementation((_table: string) => {
      if (overrides?.singleResult) {
        const c = makeChainable(singleResult);
        c.single = () => Promise.resolve(singleResult);
        c.maybeSingle = () => Promise.resolve(maybeSingleResult);
        return c;
      }
      if (overrides?.updateResult) {
        return makeChainable(updateResult);
      }
      return makeChainable(queryResult);
    }),
  };
}

describe("getOrdersByUser", () => {
  it("returns orders for a user", async () => {
    const orders = [
      { id: "o-1", user_id: "user-1", status: "pending" },
      { id: "o-2", user_id: "user-1", status: "delivered" },
    ];
    const supabase = mockSupabase({ queryResult: { data: orders, error: null } });
    const result = await getOrdersByUser(supabase, "user-1");
    expect(result).toEqual(orders);
  });

  it("returns empty array on error", async () => {
    const supabase = mockSupabase({ queryResult: { data: null, error: new Error("db error") } });
    const result = await getOrdersByUser(supabase, "user-1");
    expect(result).toEqual([]);
  });
});

describe("getOrderById", () => {
  it("returns an order when found", async () => {
    const order = { id: "o-1", user_id: "user-1", status: "pending" };
    const supabase = mockSupabase({ singleResult: { data: order, error: null } });
    const result = await getOrderById(supabase, "o-1");
    expect(result).toEqual(order);
  });

  it("returns null when not found", async () => {
    const supabase = mockSupabase({ singleResult: { data: null, error: null } });
    const result = await getOrderById(supabase, "o-missing");
    expect(result).toBeNull();
  });

  it("returns null on error", async () => {
    const supabase = mockSupabase({ singleResult: { data: null, error: new Error("db error") } });
    const result = await getOrderById(supabase, "o-1");
    expect(result).toBeNull();
  });
});

describe("updateOrderStatus", () => {
  it("updates status and returns result", async () => {
    const supabase = mockSupabase({ updateResult: { error: null } });
    const result = await updateOrderStatus(supabase, "o-1", "confirmed");
    expect(result.error).toBeNull();
  });

  it("returns error on failure", async () => {
    const supabase = mockSupabase({ updateResult: { error: new Error("update failed") } });
    const result = await updateOrderStatus(supabase, "o-1", "confirmed");
    expect(result.error).toBeTruthy();
  });
});
