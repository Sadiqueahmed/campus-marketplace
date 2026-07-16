import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  redirect: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth_/callback")({
  validateSearch: searchSchema,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing sign in · CampusScribe" },
      {
        name: "description",
        content: "Complete your CampusScribe sign-in securely.",
      },
    ],
  }),
  component: AuthCallbackPage,
});

function getSafeRedirectPath(value?: string) {
  if (typeof window === "undefined") return "/dashboard";
  if (!value) return "/dashboard";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const target = getSafeRedirectPath(search.redirect);

      if (search.error || search.error_description) {
        setError(search.error_description ?? search.error ?? "Sign-in failed");
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          window.history.replaceState(
            {},
            document.title,
            `${window.location.pathname}${window.location.search}`,
          );
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled) return;

        if (data.session) {
          navigate({ to: target as never, replace: true });
        } else {
          navigate({ to: "/auth", search: { redirect: target }, replace: true });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not finish sign-in");
      }
    }

    finishSignIn();
    return () => {
      cancelled = true;
    };
  }, [navigate, search.error, search.error_description, search.redirect]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-sm text-center">
        {error ? (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">Sign-in link expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-6">
              <Link to="/auth" search={{ redirect: getSafeRedirectPath(search.redirect) }}>
                Try signing in again
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
              Finishing sign in
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we securely complete your session.
            </p>
          </>
        )}
      </section>
    </main>
  );
}