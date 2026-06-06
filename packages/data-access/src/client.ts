import { createBrowserClient } from "@supabase/ssr";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedSupabaseClient = SupabaseClient<any>;

let serviceClient: TypedSupabaseClient | null = null;

export function createServiceClient(): TypedSupabaseClient {
  if (serviceClient) return serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new Proxy({} as TypedSupabaseClient, {
      get(_target: any, prop: string) {
        if (prop === "then") return undefined;
        if (prop === "from") {
          return () =>
            new Proxy({} as any, {
              get(_t: any, p: string) {
                if (p === "select") return () => ({ data: null, error: null });
                if (p === "insert") return () => ({ data: null, error: null });
                if (p === "update") return () => ({ data: null, error: null });
                if (p === "upsert") return () => ({ data: null, error: null });
                if (p === "delete") return () => ({ data: null, error: null });
                if (p === "eq") return () => ({ data: null, error: null });
                if (p === "single") return () => ({ data: null, error: null });
                if (p === "maybeSingle") return () => ({ data: null, error: null });
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
    }) as TypedSupabaseClient;
  }
  serviceClient = createSupabaseClient(url, key);
  return serviceClient;
}

export function createBrowserTypedClient(): TypedSupabaseClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
  ) as unknown as TypedSupabaseClient;
}

export function createAuthClient(cookieStore: { getAll(): { name: string; value: string }[]; setAll?(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void }): TypedSupabaseClient {
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookieStore.setAll?.(cookiesToSet);
          } catch {
            // setAll called from Server Component — safe to ignore with middleware
          }
        },
      },
    },
  ) as unknown as TypedSupabaseClient;
}
