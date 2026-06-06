import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Search, Sparkles, ShieldCheck, Wallet } from "lucide-react";

import { getListings } from "@/lib/listings.functions";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/hero-marketplace.jpg";

const searchSchema = z.object({
  type: z.enum(["DIGITAL_NOTE", "PHYSICAL_ITEM"]).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "CampusScribe — The Student Marketplace" },
      {
        name: "description",
        content:
          "Buy and sell study notes, books, electronics, and dorm essentials from students at your college. Safe, simple, and built for campus life.",
      },
      { property: "og:title", content: "CampusScribe — The Student Marketplace" },
      {
        property: "og:description",
        content: "Where graduating students pass on what they no longer need.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { type } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const fetchListings = useServerFn(getListings);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", { type }],
    queryFn: () => fetchListings({ data: { type, limit: 12 } }),
  });

  const listings = data?.listings ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-[image:var(--gradient-warm)]">
        <div className="container mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Built for graduating students
            </span>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              The campus marketplace
              <br />
              <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">
                made by students.
              </span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Sell your notes, books, beds, and electronics to juniors at your
              college. Buy what you need at student prices.
            </p>

            <div className="flex max-w-md items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
              <Search className="ml-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search textbooks, mini-fridge, DSA notes…"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button size="sm" className="bg-[image:var(--gradient-hero)] text-primary-foreground">
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Verified college emails
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent" />
                Just 5% platform fee
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-[image:var(--gradient-hero)] opacity-20 blur-2xl" />
            <img
              src={heroImage}
              alt="A student dorm with notes, books, and items for sale"
              width={1536}
              height={1024}
              className="rounded-3xl border border-border shadow-[var(--shadow-elevated)]"
            />
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {type === "DIGITAL_NOTE"
                ? "Study notes & resources"
                : type === "PHYSICAL_ITEM"
                  ? "Things from real dorms"
                  : "Fresh from campus"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              Listings posted by verified students.
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            <FilterPill
              active={!type}
              onClick={() => navigate({ search: {} })}
              label="All"
            />
            <FilterPill
              active={type === "PHYSICAL_ITEM"}
              onClick={() => navigate({ search: { type: "PHYSICAL_ITEM" } })}
              label="Items"
            />
            <FilterPill
              active={type === "DIGITAL_NOTE"}
              onClick={() => navigate({ search: { type: "DIGITAL_NOTE" } })}
              label="Notes"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l as never} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        CampusScribe · Built for graduating students, by students.
      </footer>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
      <h3 className="font-display text-2xl font-semibold">No listings yet</h3>
      <p className="mt-2 text-muted-foreground">
        Be the first to post something. Click <strong>Sell</strong> in the
        header to create a listing.
      </p>
    </div>
  );
}
