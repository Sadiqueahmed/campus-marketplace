import { Link } from "@tanstack/react-router";
import { BookOpen, ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
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
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            <ShoppingBag className="h-4 w-4" />
            Cart
          </Button>
          <Button size="sm" className="bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-95">
            <Plus className="h-4 w-4" />
            Sell
          </Button>
        </div>
      </div>
    </header>
  );
}