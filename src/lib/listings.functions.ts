import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Public listings feed.
 * Filters by type (digital/physical) and optional category.
 * Public read — uses admin client with explicit safe-column projection.
 */
export const getListings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.enum(["DIGITAL_NOTE", "PHYSICAL_ITEM"]).optional(),
        category: z.string().min(1).max(64).optional(),
        limit: z.number().int().min(1).max(48).default(12),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("listings")
      .select(
        "id, type, title, description, price, category, condition, location, images, created_at",
      )
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.type) query = query.eq("type", data.type);
    if (data.category) query = query.eq("category", data.category);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[getListings]", error);
      return { listings: [], error: "Could not load listings" as const };
    }
    return { listings: rows ?? [], error: null };
  });

/**
 * Single listing detail (public).
 */
export const getListingById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .select(
        "id, seller_id, type, title, description, price, category, condition, location, images, file_url, status, created_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getListingById]", error);
      return { listing: null, seller: null, error: "Could not load listing" as const };
    }
    if (!row) return { listing: null, seller: null, error: "Not found" as const };

    const { data: seller } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, college, avatar_url")
      .eq("id", row.seller_id)
      .maybeSingle();

    return { listing: row, seller: seller ?? null, error: null };
  });

/**
 * Create a listing as the signed-in user.
 * Images are passed as base64 data URLs; uploaded via service role then
 * signed URLs (long expiry) are stored on the row so the public feed works
 * even though the bucket is private.
 */
const createListingSchema = z.object({
  type: z.enum(["DIGITAL_NOTE", "PHYSICAL_ITEM"]),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().default(""),
  price: z.number().min(0).max(1_000_000),
  category: z.string().min(1).max(64),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]).optional(),
  location: z.string().max(120).optional().default(""),
  images: z
    .array(
      z.object({
        name: z.string().max(200),
        dataUrl: z.string().startsWith("data:"),
      }),
    )
    .max(6)
    .default([]),
});

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createListingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Upload images
    const uploadedUrls: string[] = [];
    for (const img of data.images) {
      const match = /^data:(.+);base64,(.+)$/.exec(img.dataUrl);
      if (!match) continue;
      const contentType = match[1];
      const bytes = Buffer.from(match[2], "base64");
      const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("listing-images")
        .upload(path, bytes, { contentType, upsert: false });
      if (upErr) {
        console.error("[createListing upload]", upErr);
        continue;
      }
      const { data: signed } = await supabaseAdmin.storage
        .from("listing-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
      if (signed?.signedUrl) uploadedUrls.push(signed.signedUrl);
    }

    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .insert({
        seller_id: userId,
        type: data.type,
        title: data.title,
        description: data.description || null,
        price: data.price,
        category: data.category,
        condition: data.condition ?? null,
        location: data.location || null,
        images: uploadedUrls,
        status: "ACTIVE",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[createListing insert]", error);
      throw new Error("Could not create listing");
    }
    return { id: row.id };
  });

/**
 * Listings I am selling.
 */
export const getMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("listings")
      .select("id, type, title, price, category, condition, location, images, status, created_at, views_count")
      .eq("seller_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[getMyListings]", error);
      return { listings: [], error: "Could not load your listings" as const };
    }
    return { listings: data ?? [], error: null };
  });