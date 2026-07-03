import { describe, expect, it, vi } from "vitest";
import { getProfile, getUser, requireAdmin, requireAuth, requireStaffOrAdmin } from "./auth";

function mockSupabase(overrides?: Record<string, unknown>) {
  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue(
          overrides?.getUserResult ?? { data: { user: { id: "user-1", email: "test@test.com" } }, error: null },
        ),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue(overrides?.singleResult ?? { data: { id: "user-1", role: "admin" }, error: null }),
    }),
  };
}

type SupabaseMock = ReturnType<typeof mockSupabase>;

describe("getUser", () => {
  it("returns user when authenticated", async () => {
    const supabase = mockSupabase() as any;
    const user = await getUser(supabase);
    expect(user).not.toBeNull();
    expect(user?.id).toBe("user-1");
  });

  it("returns null when not authenticated", async () => {
    const supabase = mockSupabase({ getUserResult: { data: { user: null }, error: null } }) as any;
    const user = await getUser(supabase);
    expect(user).toBeNull();
  });

  it("returns null on error", async () => {
    const supabase = mockSupabase({ getUserResult: { data: { user: null }, error: new Error("auth error") } }) as any;
    const user = await getUser(supabase);
    expect(user).toBeNull();
  });
});

describe("getProfile", () => {
  it("returns profile when found", async () => {
    const supabase = mockSupabase() as any;
    const profile = await getProfile(supabase, "user-1");
    expect(profile).not.toBeNull();
    expect(profile?.id).toBe("user-1");
  });

  it("returns null on error", async () => {
    const supabase = mockSupabase({ singleResult: { data: null, error: new Error("not found") } }) as any;
    const profile = await getProfile(supabase, "user-missing");
    expect(profile).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns user when authenticated", async () => {
    const supabase = mockSupabase() as any;
    const user = await requireAuth(supabase);
    expect(user).not.toBeNull();
  });

  it("returns null when not authenticated", async () => {
    const supabase = mockSupabase({ getUserResult: { data: { user: null }, error: null } }) as any;
    const user = await requireAuth(supabase);
    expect(user).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("returns true for admin user", async () => {
    const supabase = mockSupabase() as any;
    const result = await requireAdmin(supabase, "user-1");
    expect(result).toBe(true);
  });

  it("returns false for non-admin user", async () => {
    const supabase = mockSupabase({ singleResult: { data: { role: "customer" }, error: null } }) as any;
    const result = await requireAdmin(supabase, "user-2");
    expect(result).toBe(false);
  });
});

describe("requireStaffOrAdmin", () => {
  it("returns profile for active staff", async () => {
    const supabase = mockSupabase({
      singleResult: { data: { role: "staff", is_active: true }, error: null },
    }) as any;
    const result = await requireStaffOrAdmin(supabase, "user-3");
    expect(result).not.toBeNull();
    expect(result?.role).toBe("staff");
  });

  it("returns null for inactive staff", async () => {
    const supabase = mockSupabase({
      singleResult: { data: { role: "staff", is_active: false }, error: null },
    }) as any;
    const result = await requireStaffOrAdmin(supabase, "user-3");
    expect(result).toBeNull();
  });

  it("returns null for customer role", async () => {
    const supabase = mockSupabase({
      singleResult: { data: { role: "customer", is_active: true }, error: null },
    }) as any;
    const result = await requireStaffOrAdmin(supabase, "user-4");
    expect(result).toBeNull();
  });
});
