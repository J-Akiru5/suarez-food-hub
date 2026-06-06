export type { Database, Json } from "./types";
export { createServiceClient, createAuthClient, createBrowserTypedClient } from "./client";
export type { TypedSupabaseClient } from "./client";
export { getUser, getProfile, requireAuth, requireAdmin, requireStaffOrAdmin } from "./auth";
