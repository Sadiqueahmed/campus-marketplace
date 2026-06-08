import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { getUnreadNotifications } from "@/lib/messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchUnread = useServerFn(getUnreadNotifications);

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchUnread(),
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as { content: string; listing_id: string };
          toast.message("New message", {
            description: m.content.slice(0, 80),
            action: {
              label: "Open",
              onClick: () => navigate({ to: "/listing/$id", params: { id: m.listing_id } }),
            },
          });
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc, navigate]);

  if (!user) return null;

  const count = data?.count ?? 0;
  const items = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-accent/10"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            You're all caught up 🎉
          </div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-0.5 py-2"
              onClick={() => navigate({ to: "/listing/$id", params: { id: n.listing_id } })}
            >
              <div className="text-sm">
                <strong>{n.sender_name}</strong> on{" "}
                <span className="text-muted-foreground">{n.listing_title}</span>
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">{n.content}</div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}