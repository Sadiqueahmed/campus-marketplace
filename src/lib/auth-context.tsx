import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/react";

// Deterministic UUID v5 from Clerk user ID — keeps DB columns as uuid.
// Must match the server-side implementation in auth-middleware.ts.
const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

async function clerkIdToUuid(clerkId: string): Promise<string> {
  const encoder = new TextEncoder();
  const namespaceBytes = uuidToBytes(NAMESPACE);
  const nameBytes = encoder.encode(clerkId);
  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes, 0);
  combined.set(nameBytes, namespaceBytes.length);

  const hashBuffer = await crypto.subtle.digest("SHA-1", combined);
  const hashArray = new Uint8Array(hashBuffer);

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

type AuthContextValue = {
  /** Clerk user mapped to a shape compatible with the rest of the app. */
  user: { id: string; email: string } | null;
  /** The deterministic UUID mapped from the Clerk user ID — matches DB columns. */
  dbUserId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  dbUserId: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerkAuth();
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  useEffect(() => {
    if (clerkUser?.id) {
      clerkIdToUuid(clerkUser.id).then(setDbUserId);
    } else {
      setDbUserId(null);
    }
  }, [clerkUser?.id]);

  const user = clerkUser
    ? {
        id: clerkUser.id,
        email:
          clerkUser.primaryEmailAddress?.emailAddress ??
          clerkUser.emailAddresses[0]?.emailAddress ??
          "",
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUserId,
        loading: !isLoaded,
        signOut: async () => {
          await signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);