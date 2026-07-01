// Supabase-based auth middleware for TanStack server functions.
// Verifies the Supabase JWT from the Authorization header and provides a
// user-scoped Supabase client (RLS applies as that user).
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const requireSupabaseAuth = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase server environment variables.");
  }

  const request = getRequest();
  const authHeader = request?.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No authorization header provided");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new Error("Unauthorized: Empty token");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error(`Unauthorized: ${error?.message ?? "Invalid token"}`);
  }

  return next({
    context: {
      supabase,
      userId: data.user.id,
      claims: { sub: data.user.id, email: data.user.email },
    },
  });
});
