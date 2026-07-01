// Client-side middleware that attaches the Supabase session bearer token
// on every server function RPC. Registered as `functionMiddleware` in
// `src/start.ts`.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachSupabaseAuth = createMiddleware({
  type: "function",
}).client(async ({ next }) => {
  let token: string | null = null;
  try {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
    }
  } catch {
    // no session
  }
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
