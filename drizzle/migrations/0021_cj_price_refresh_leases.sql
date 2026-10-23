CREATE TABLE public.supplier_price_refresh_jobs (store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE, cursor_id uuid, lease_until timestamptz, lease_token uuid, next_attempt_at timestamptz NOT NULL DEFAULT now(), last_error text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.supplier_price_refresh_jobs TO authenticated;
GRANT ALL ON public.supplier_price_refresh_jobs TO service_role;
ALTER TABLE public.supplier_price_refresh_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read price refresh" ON public.supplier_price_refresh_jobs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id=store_id AND owner_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.claim_cj_price_refresh(_store_id uuid) RETURNS SETOF public.supplier_price_refresh_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.supplier_price_refresh_jobs(store_id) VALUES(_store_id) ON CONFLICT DO NOTHING;
 RETURN QUERY UPDATE public.supplier_price_refresh_jobs SET lease_until=now()+interval '4 minutes',lease_token=gen_random_uuid(),updated_at=now() WHERE store_id=_store_id AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.claim_cj_price_refresh(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_cj_price_refresh(uuid) TO service_role;