// Clerk-based auth middleware for TanStack server functions.
// Verifies the Clerk JWT from the Authorization header, extracts the user ID,
// and passes a supabaseAdmin client (service_role) for database operations.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyToken } from "@clerk/backend";
import { createClerkClient } from "@clerk/backend";
import * as dotenv from 'dotenv';

// Deterministic UUID v5 from Clerk user ID — keeps DB columns as uuid.
// Uses a fixed namespace so the same Clerk ID always maps to the same UUID.
const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // RFC 4122 DNS namespace

async function clerkIdToUuid(clerkId: string): Promise<string> {
  const encoder = new TextEncoder();
  const namespaceBytes = uuidToBytes(NAMESPACE);
  const nameBytes = encoder.encode(clerkId);
  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes, 0);
  combined.set(nameBytes, namespaceBytes.length);

  const hashBuffer = await crypto.subtle.digest("SHA-1", combined);
  const hashArray = new Uint8Array(hashBuffer);

  // Set version 5 (0101xxxx) and variant (10xxxxxx) bits
  hashArray[6] = (hashArray[6] & 0x0f) | 0x50;
  hashArray[8] = (hashArray[8] & 0x3f) | 0x80;

  return bytesToUuid(hashArray);
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const requireSupabaseAuth = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  dotenv.config(); // Ensure env vars are loaded

  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
  if (!CLERK_SECRET_KEY) {
    throw new Error(
      "Missing CLERK_SECRET_KEY environment variable. Add it to your .env file."
    );
  }

  const request = getRequest();
  if (!request?.headers) {
    throw new Error("Unauthorized: No request headers available");
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No valid authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  // Verify the Clerk JWT
  let clerkUserId: string;
  let clerkEmail: string | undefined;
  let clerkName: string | undefined;

  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    if (!payload.sub) {
      throw new Error("Unauthorized: No user ID in token");
    }
    clerkUserId = payload.sub;

    // Try to get user details for profile upsert
    try {
      const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
      const user = await clerk.users.getUser(clerkUserId);
      clerkEmail = user.emailAddresses[0]?.emailAddress;
      clerkName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        clerkEmail?.split("@")[0];
    } catch {
      // Non-critical — we can still proceed without name
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[requireSupabaseAuth] Clerk token verification failed:", errMsg);
    console.error("[requireSupabaseAuth] Secret key starts with:", CLERK_SECRET_KEY?.slice(0, 12) + "...");
    throw new Error(`Unauthorized: Invalid token — ${errMsg}`);
  }


  // Map Clerk user ID to a deterministic UUID for database compatibility
  const userId = await clerkIdToUuid(clerkUserId);

  // Get admin client (bypasses RLS)
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  // Auto-upsert profile on first request (replaces the old handle_new_user trigger)
  try {
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name:
            clerkName ?? clerkEmail?.split("@")[0] ?? "Student",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

    // Also ensure they have a buyer role
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "buyer" as const },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
  } catch (err) {
    // Non-critical — profile may already exist
    console.warn("[requireSupabaseAuth] Profile upsert warning:", err);
  }

  return next({
    context: {
      supabase: supabaseAdmin,
      userId,
      clerkUserId,
      claims: { sub: userId },
    },
  });
});
