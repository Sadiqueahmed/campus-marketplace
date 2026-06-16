// Client-side middleware that attaches the Clerk session token
// as a Bearer token on every server function RPC.
// Must be registered as a global `functionMiddleware` in `src/start.ts`.
import { createMiddleware } from "@tanstack/react-start";
import { getToken } from "@clerk/react";

export const attachSupabaseAuth = createMiddleware({
  type: "function",
}).client(async ({ next }) => {
  let token: string | null = null;
  try {
    if (typeof window !== "undefined") {
      token = await getToken();
    }
  } catch {
    // Silent — no token means unauthenticated request
  }

  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
