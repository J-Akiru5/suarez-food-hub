import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createServiceClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new Proxy({} as any, {
      get(_target: any, prop: string) {
        if (prop === "then") return undefined;
        if (prop === "from") {
          return () =>
            new Proxy({} as any, {
              get(_t: any, p: string) {
                if (p === "select") return () => ({ data: null, error: null });
                if (p === "insert") return () => ({ data: null, error: null });
                if (p === "update") return () => ({ data: null, error: null });
                if (p === "delete") return () => ({ data: null, error: null });
                if (p === "eq") return () => ({ data: null, error: null });
                if (p === "single") return () => ({ data: null, error: null });
                if (p === "limit") return () => ({ data: null, error: null });
                if (p === "order") return () => ({ data: null, error: null });
                return () => ({ data: null, error: null });
              },
            });
        }
        if (prop === "storage") {
          return {
            from: () => ({
              upload: () => ({ data: null, error: null }),
              getPublicUrl: () => ({ data: { publicUrl: "" } }),
            }),
          };
        }
        return () => {};
      },
    }) as any;
  }
  client = createSupabaseClient(url, key);
  return client;
}
