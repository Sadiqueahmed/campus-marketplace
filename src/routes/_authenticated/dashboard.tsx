import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Wallet, Plus } from "lucide-react";

import { getMyListings } from "@/lib/listings.functions";
import { getMyOrders } from "@/lib/orders.functions";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · CampusScribe" }] }),
  component: Dashboard,
});

function Dashboard() {
  const myListingsFn = useServerFn(getMyListings);
  const myOrdersFn = useServerFn(getMyOrders);

  const listingsQ = useQuery({ queryKey: ["my-listings"], queryFn: () => myListingsFn() });
  const ordersQ = useQuery({ queryKey: ["my-orders"], queryFn: () => myOrdersFn() });

  const listings = listingsQ.data?.listings ?? [];
  const sales = ordersQ.data?.sales ?? [];
  const purchases = ordersQ.data?.purchases ?? [];
  const earnings = ordersQ.data?.totalEarnings ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Your dashboard</h1>
            <p className="mt-1 text-muted-foreground">Track listings, sales, and earnings.</p>
          </div>
          <Button asChild className="bg-[image:var(--gradient-hero)] text-primary-foreground">
            <Link to="/sell"><Plus className="h-4 w-4" />New listing</Link>
          </Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package className="h-4 w-4" />} label="Active listings" value={listings.filter((l) => l.status === "ACTIVE").length} />
          <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Items sold" value={sales.length} />
          <Stat icon={<Wallet className="h-4 w-4" />} label="Earnings" value={`₹${earnings.toFixed(2)}`} highlight />
        </div>

        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">My listings</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            {listings.length === 0 ? (
              <EmptyHint message="You haven't listed anything yet." cta="Create your first listing" to="/sell" />
            ) : (
              <div className="grid gap-3">
                {listings.map((l) => (
                  <Link
                    key={l.id}
                    to="/listing/$id"
                    params={{ id: l.id }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                  >
                    <Thumb src={l.images?.[0]} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.title}</div>
                      <div className="text-xs text-muted-foreground">{l.category} · {l.status}</div>
                    </div>
                    <div className="font-display font-semibold text-primary">₹{Number(l.price).toLocaleString("en-IN")}</div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales" className="mt-6">
            {sales.length === 0 ? (
              <EmptyHint message="No sales yet. Share your listings with juniors!" />
            ) : (
              <div className="grid gap-3">
                {sales.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                    <Thumb src={o.listing?.images?.[0]} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{o.listing?.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {o.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-semibold text-primary">+₹{Number(o.seller_earnings).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">fee ₹{Number(o.platform_fee).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="mt-6">
            {purchases.length === 0 ? (
              <EmptyHint message="You haven't bought anything yet." cta="Browse marketplace" to="/" />
            ) : (
              <div className="grid gap-3">
                {purchases.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                    <Thumb src={o.listing?.images?.[0]} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{o.listing?.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {o.status}</div>
                    </div>
                    <div className="font-display font-semibold">₹{Number(o.total_amount).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={"rounded-2xl border border-border p-5 shadow-[var(--shadow-card)] " + (highlight ? "bg-[image:var(--gradient-warm)]" : "bg-card")}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className={"mt-2 font-display text-3xl font-bold " + (highlight ? "text-primary" : "")}>{value}</div>
    </div>
  );
}

function Thumb({ src }: { src?: string | null }) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
    </div>
  );
}

function EmptyHint({ message, cta, to }: { message: string; cta?: string; to?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <p className="text-muted-foreground">{message}</p>
      {cta && to && (
        <Button asChild className="mt-4 bg-[image:var(--gradient-hero)] text-primary-foreground">
          <Link to={to}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}