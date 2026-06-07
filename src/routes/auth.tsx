import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · CampusScribe" },
      { name: "description", content: "Sign in or create a CampusScribe account to buy and sell on your campus." },
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
            The marketplace where graduating students pass on what they no longer need.
          </h1>
          <p className="text-primary-foreground/80">
            Sell books, beds, electronics, and notes. Buy at student prices. Keep 95% of every sale.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© CampusScribe</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-display text-lg font-bold">CampusScribe</span>
            </Link>
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-3xl font-bold tracking-tight">Welcome</h2>
            <p className="text-sm text-muted-foreground">Sign in or create your account.</p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm />
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <GoogleButton />
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-password">Password</Label>
        <Input id="si-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account.");
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Name</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Campus email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (res.error) {
      toast.error(res.error.message ?? "Could not sign in with Google");
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" onClick={handle} disabled={busy} className="w-full">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.9-.1-1.3H12z"/>
    </svg>
  );
}