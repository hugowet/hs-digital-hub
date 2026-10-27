CREATE TABLE public.hs_bank_credit_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 user_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'awaiting_provider' CHECK (status = 'awaiting_provider'),
 repayment_rate numeric NOT NULL DEFAULT 0.15 CHECK (repayment_rate = 0.15),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hs_bank_credit_requests TO authenticated;
GRANT ALL ON public.hs_bank_credit_requests TO service_role;
ALTER TABLE public.hs_bank_credit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY hs_bank_credit_read ON public.hs_bank_credit_requests FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX hs_bank_one_credit_request ON public.hs_bank_credit_requests(store_id);
CREATE OR REPLACE FUNCTION public.hs_bank_credit_eligible(_store_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.stores s WHERE s.id=_store_id AND s.owner_id=auth.uid() AND s.status='approved') AND EXISTS(SELECT 1 FROM public.payment_transactions pt WHERE pt.store_id=_store_id AND pt.status='approved' AND pt.paid_at>=now()-interval '30 days' AND pt.paid_at<=now());
$$;
REVOKE ALL ON FUNCTION public.hs_bank_credit_eligible(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hs_bank_credit_eligible(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.hs_bank_request_credit(_store_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE v_id uuid;
 BEGIN
 IF auth.uid() IS NULL OR NOT public.hs_bank_credit_eligible(_store_id) THEN RAISE EXCEPTION 'Solicitação disponível somente para lojistas aprovados com vendas pagas nos últimos 30 dias.'; END IF;
 INSERT INTO public.hs_bank_credit_requests(store_id,user_id) VALUES(_store_id,auth.uid()) ON CONFLICT(store_id) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN SELECT id INTO v_id FROM public.hs_bank_credit_requests WHERE store_id=_store_id AND user_id=auth.uid(); END IF;
 RETURN v_id;
 END;
$$;
REVOKE ALL ON FUNCTION public.hs_bank_request_credit(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hs_bank_request_credit(uuid) TO authenticated;
COMMENT ON TABLE public.hs_bank_credit_requests IS 'Interest requests only; no debt, disbursement or split withholding is created. Requires authorized lender/provider integration before any offer.';