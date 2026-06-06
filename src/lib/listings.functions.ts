import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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