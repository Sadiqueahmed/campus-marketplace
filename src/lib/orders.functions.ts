import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COMMISSION = 0.05;

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ listingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listing, error: lErr } = await supabaseAdmin
      .from("listings")
      .select("id, seller_id, price, status")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr || !listing) throw new Error("Listing not found");
    if (listing.status !== "ACTIVE") throw new Error("Listing is not available");
    if (listing.seller_id === context.userId) throw new Error("You can't buy your own listing");

    const total = Number(listing.price);
    const fee = Math.round(total * COMMISSION * 100) / 100;
    const earnings = Math.round((total - fee) * 100) / 100;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        listing_id: listing.id,
        buyer_id: context.userId,
        seller_id: listing.seller_id,
        total_amount: total,
        platform_fee: fee,
        seller_earnings: earnings,
        commission_rate: COMMISSION,
        status: "PENDING",
      })
      .select("id, total_amount, platform_fee, seller_earnings")
      .single();
    if (error) {
      console.error("[createOrder]", error);
      throw new Error("Could not place order");
    }

    // Physical items are one-of-a-kind → mark SOLD so they disappear from the feed.
    // Digital notes can be sold to many buyers → keep ACTIVE.
    const { data: lt } = await supabaseAdmin
      .from("listings")
      .select("type")
      .eq("id", listing.id)
      .maybeSingle();
    if (lt?.type === "PHYSICAL_ITEM") {
      await supabaseAdmin
        .from("listings")
        .update({ status: "SOLD" })
        .eq("id", listing.id);
    }

    return { order };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const [purchases, sales] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, listing_id, total_amount, status, created_at")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("orders")
        .select("id, listing_id, total_amount, platform_fee, seller_earnings, status, created_at")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const ids = Array.from(
      new Set([
        ...(purchases.data ?? []).map((o) => o.listing_id),
        ...(sales.data ?? []).map((o) => o.listing_id),
      ]),
    );
    const { data: listings } = ids.length
      ? await supabaseAdmin.from("listings").select("id, title, images").in("id", ids)
      : { data: [] as { id: string; title: string; images: string[] }[] };
    const lookup = new Map(listings?.map((l) => [l.id, l]) ?? []);

    const totalEarnings = (sales.data ?? [])
      .filter((o) => o.status !== "REFUNDED" && o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.seller_earnings), 0);

    return {
      purchases: (purchases.data ?? []).map((o) => ({ ...o, listing: lookup.get(o.listing_id) ?? null })),
      sales: (sales.data ?? []).map((o) => ({ ...o, listing: lookup.get(o.listing_id) ?? null })),
      totalEarnings,
    };
  });