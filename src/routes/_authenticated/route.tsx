import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // On the client, check Clerk auth state via the global Clerk instance
    if (typeof window !== "undefined") {
      try {
        // The Clerk script attaches to window.Clerk once ClerkProvider mounts
        const clerk = (window as any).Clerk;
        if (!clerk) {
          // Clerk hasn't loaded yet — wait briefly
          await new Promise<void>((resolve) => {
            const check = () => {
              if ((window as any).Clerk?.loaded) {
                resolve();
              } else {
                setTimeout(check, 50);
              }
            };
            check();
          });
        }

        const loadedClerk = (window as any).Clerk;
        if (!loadedClerk?.user) {
          throw redirect({
            to: "/auth",
            search: { redirect: location.href },
          });
        }
        return { user: { id: loadedClerk.user.id } };
      } catch (err) {
        // Re-throw redirect objects
        if (err && typeof err === "object" && "to" in err) throw err;
        throw redirect({
          to: "/auth",
          search: { redirect: location.href },
        });
      }
    }
    // SSR fallback — redirect to auth
    throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: () => <Outlet />,
});