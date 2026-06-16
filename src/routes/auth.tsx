import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { BookOpen } from "lucide-react";
import { SignIn, SignUp } from "@clerk/react";

import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · CampusScribe" },
      {
        name: "description",
        content:
          "Sign in or create a CampusScribe account to buy and sell on your campus.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirect ?? "/dashboard" });
    }
  }, [user, loading, navigate, redirect]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[image:var(--gradient-hero)] p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <span className="font-display text-xl font-bold">CampusScribe</span>
        </Link>
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-bold leading-tight">
            The marketplace where graduating students pass on what they no
            longer need.
          </h1>
          <p className="text-primary-foreground/80">
            Sell books, beds, electronics, and notes. Buy at student prices.
            Keep 95% of every sale.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© CampusScribe</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-display text-lg font-bold">
                CampusScribe
              </span>
            </Link>
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Welcome
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in or create your account.
            </p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <div className="flex justify-center [&_.cl-card]:shadow-none [&_.cl-rootBox]:w-full">
                <SignIn
                  routing="hash"
                  forceRedirectUrl={redirect ?? "/dashboard"}
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0 w-full",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                      socialButtonsBlockButton:
                        "border-border hover:bg-accent/10",
                      formButtonPrimary:
                        "bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-95",
                      footerAction: "hidden",
                    },
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <div className="flex justify-center [&_.cl-card]:shadow-none [&_.cl-rootBox]:w-full">
                <SignUp
                  routing="hash"
                  forceRedirectUrl={redirect ?? "/dashboard"}
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0 w-full",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                      socialButtonsBlockButton:
                        "border-border hover:bg-accent/10",
                      formButtonPrimary:
                        "bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-95",
                      footerAction: "hidden",
                    },
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}