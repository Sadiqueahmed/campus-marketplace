import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { getThread, sendMessage } from "@/lib/messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export function ChatPanel({
  listingId,
  otherUserId,
  currentUserId,
  otherName,
}: {
  listingId: string;
  otherUserId: string;
  currentUserId: string;
  otherName: string;
}) {
  const qc = useQueryClient();
  const fetchThread = useServerFn(getThread);
  const send = useServerFn(sendMessage);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryKey = ["thread", listingId, otherUserId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchThread({ data: { listingId, otherUserId } }),
  });

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      send({ data: { listingId, recipientId: otherUserId, content } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${listingId}:${currentUserId}:${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          const inThread =
            (m.sender_id === currentUserId && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === currentUserId);
          if (inThread) qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, currentUserId, otherUserId, qc]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages.length]);

  const messages = (data?.messages ?? []) as Msg[];

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">Chat with {otherName}</div>
        <div className="text-xs text-muted-foreground">Real-time · about this listing</div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Say hi 👋 — start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={"flex " + (mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm " +
                    (mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground")
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={"mt-0.5 text-[10px] opacity-70"}>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || sendMut.isPending) return;
          sendMut.mutate(t);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sendMut.isPending}
          className="bg-[image:var(--gradient-hero)] text-primary-foreground"
        >
          {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}