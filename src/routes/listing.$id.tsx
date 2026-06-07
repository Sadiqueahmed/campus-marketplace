import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Package, FileText, Loader2, ShieldCheck } from "lucide-react";

import { getListingById } from "@/lib/listings.functions";
import { createOrder } from "@/lib/orders.functions";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({ meta: [{ title: "Listing · CampusScribe" }] }),
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fetchListing = useServerFn(getListingById);
  const buy = useServerFn(createOrder);
  const [activeImg, setActiveImg] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing({ data: { id } }),
  });

  const buyMut = useMutation({
    mutationFn: () => buy({ data: { listingId: id } }),
    onSuccess: () => {
      toast.success("Order placed! Check your dashboard.");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="h-96 animate-pulse rounded-3xl bg-muted" />
      </Shell>
    );
  }

  const listing = data?.listing;
  if (!listing) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <h2 className="font-display text-2xl font-semibold">Listing not found</h2>
          <p className="mt-2 text-muted-foreground">It may have been sold or removed.</p>
          <Button asChild className="mt-6"><Link to="/">Back to marketplace</Link></Button>
        </div>
      </Shell>
    );
  }

  const isDigital = listing.type === "DIGITAL_NOTE";
  const cover = listing.images[activeImg];
  const isOwn = user?.id === listing.seller_id;
  const sellerInitial = (data?.seller?.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <Shell>
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-muted">
            {cover ? (
              <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[image:var(--gradient-warm)] text-muted-foreground">
                {isDigital ? <FileText className="h-16 w-16" /> : <Package className="h-16 w-16" />}
              </div>
            )}
          </div>
          {listing.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {listing.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={"h-16 w-16 overflow-hidden rounded-lg border-2 " + (i === activeImg ? "border-primary" : "border-transparent")}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {isDigital ? <FileText className="h-3 w-3" /> : <Package className="h-3 w-3" />}
              {listing.category}
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">{listing.title}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              {listing.condition && <span>Condition: <strong className="text-foreground">{listing.condition.replace("_", " ").toLowerCase()}</strong></span>}
              {listing.location && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location}</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="font-display text-4xl font-bold text-primary">
              ₹{Number(listing.price).toLocaleString("en-IN")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Includes 5% platform fee · seller receives ₹{(Number(listing.price) * 0.95).toFixed(2)}
            </p>

            {isOwn ? (
              <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">This is your listing.</p>
            ) : !user ? (
              <Button
                onClick={() => navigate({ to: "/auth", search: { redirect: `/listing/${id}` } })}
                className="mt-4 w-full bg-[image:var(--gradient-hero)] text-primary-foreground"
              >
                Sign in to buy
              </Button>
            ) : listing.status !== "ACTIVE" ? (
              <Button disabled className="mt-4 w-full">Sold</Button>
            ) : (
              <Button
                onClick={() => buyMut.mutate()}
                disabled={buyMut.isPending}
                className="mt-4 w-full bg-[image:var(--gradient-hero)] text-primary-foreground"
              >
                {buyMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Buy now
              </Button>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-accent" /> Verified student seller
            </p>
          </div>

          {data?.seller && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[image:var(--gradient-hero)] text-primary-foreground">
                  {sellerInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{data.seller.display_name ?? "Student seller"}</div>
                {data.seller.college && (
                  <div className="text-xs text-muted-foreground">{data.seller.college}</div>
                )}
              </div>
            </div>
          )}

          {listing.description && (
            <div>
              <h2 className="font-display text-lg font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}