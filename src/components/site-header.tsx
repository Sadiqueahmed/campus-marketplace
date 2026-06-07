import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Plus, LayoutDashboard, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elevated)]">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            CampusScribe
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link
            to="/"
            search={{ type: "PHYSICAL_ITEM" } as never}
            className="transition-colors hover:text-foreground"
          >
            Marketplace
          </Link>
          <Link
            to="/"
            search={{ type: "DIGITAL_NOTE" } as never}
            className="transition-colors hover:text-foreground"
          >
            Study Notes
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/sell" })}
                className="bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                Sell
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-accent/10">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[image:var(--gradient-hero)] text-primary-foreground text-sm font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/auth" })}
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/auth" })}
                className="bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                Sell
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}