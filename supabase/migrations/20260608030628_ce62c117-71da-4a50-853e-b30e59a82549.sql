
-- 1. Contact phone on listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS contact_phone text;

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_thread_idx
  ON public.messages (listing_id, sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS messages_recipient_idx
  ON public.messages (recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "sender can insert"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE POLICY "recipient can mark read"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 4. Storage policies for listing-files bucket
CREATE POLICY "listing-files owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listing-files owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listing-files owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-files' AND (storage.foldername(name))[1] = auth.uid()::text);
