import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        otherUserId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at, read_at")
      .eq("listing_id", data.listingId)
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${data.otherUserId}),and(sender_id.eq.${data.otherUserId},recipient_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) {
      console.error("[getThread]", error);
      return { messages: [], error: "Could not load chat" as const };
    }

    // Mark incoming as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("listing_id", data.listingId)
      .eq("recipient_id", userId)
      .is("read_at", null);

    return { messages: rows ?? [], error: null };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        recipientId: z.string().uuid(),
        content: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.recipientId) throw new Error("Cannot message yourself");
    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        listing_id: data.listingId,
        sender_id: userId,
        recipient_id: data.recipientId,
        content: data.content,
      })
      .select("id, sender_id, recipient_id, content, created_at, read_at")
      .single();
    if (error) {
      console.error("[sendMessage]", error);
      throw new Error("Could not send message");
    }
    return { message: row };
  });

export const getUnreadNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, listing_id, sender_id, content, created_at")
      .eq("recipient_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[getUnreadNotifications]", error);
      return { notifications: [], count: 0 };
    }
    const msgs = rows ?? [];
    if (msgs.length === 0) return { notifications: [], count: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id)));
    const listingIds = Array.from(new Set(msgs.map((m) => m.listing_id)));
    const [{ data: senders }, { data: listings }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name").in("id", senderIds),
      supabaseAdmin.from("listings").select("id, title").in("id", listingIds),
    ]);
    const sMap = new Map((senders ?? []).map((s) => [s.id, s]));
    const lMap = new Map((listings ?? []).map((l) => [l.id, l]));

    return {
      notifications: msgs.map((m) => ({
        ...m,
        sender_name: sMap.get(m.sender_id)?.display_name ?? "Someone",
        listing_title: lMap.get(m.listing_id)?.title ?? "your listing",
      })),
      count: msgs.length,
    };
  });