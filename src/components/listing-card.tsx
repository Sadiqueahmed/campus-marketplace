import { MapPin, FileText, Package } from "lucide-react";

type Listing = {
  id: string;
  type: "DIGITAL_NOTE" | "PHYSICAL_ITEM";
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string | null;
  location: string | null;
  images: string[];
};

const conditionLabel: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export function ListingCard({ listing }: { listing: Listing }) {
  const isDigital = listing.type === "DIGITAL_NOTE";
  const cover = listing.images[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[image:var(--gradient-warm)] text-muted-foreground">
            {isDigital ? <FileText className="h-10 w-10" /> : <Package className="h-10 w-10" />}
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
          {isDigital ? <FileText className="h-3 w-3" /> : <Package className="h-3 w-3" />}
          {isDigital ? "Notes" : listing.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-display text-lg font-semibold leading-tight">
          {listing.title}
        </h3>
        {listing.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="font-display text-xl font-bold text-primary">
              ₹{Number(listing.price).toLocaleString("en-IN")}
            </div>
            {listing.condition && (
              <div className="text-xs text-muted-foreground">
                {conditionLabel[listing.condition] ?? listing.condition}
              </div>
            )}
          </div>
          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {listing.location}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}