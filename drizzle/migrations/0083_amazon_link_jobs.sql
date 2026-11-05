CREATE TABLE public.amazon_link_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  store_id uuid NOT NULL,
  url text NOT NULL,
  grp text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error','published')),
  data jsonb,
  error text,
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX amazon_link_jobs_queue_idx ON public.amazon_link_jobs (status, created_at);
CREATE INDEX amazon_link_jobs_owner_idx ON public.amazon_link_jobs (owner_id, created_at);
GRANT SELECT, UPDATE, DELETE ON public.amazon_link_jobs TO authenticated;
GRANT ALL ON public.amazon_link_jobs TO service_role;
ALTER TABLE public.amazon_link_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads link jobs" ON public.amazon_link_jobs FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner deletes link jobs" ON public.amazon_link_jobs FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner marks published" ON public.amazon_link_jobs FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND status = 'done') WITH CHECK (owner_id = auth.uid() AND status = 'published');