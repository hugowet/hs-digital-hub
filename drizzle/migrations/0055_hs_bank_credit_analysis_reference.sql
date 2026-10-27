ALTER TABLE public.hs_bank_credit_requests ADD COLUMN estimated_amount numeric(12,2), ADD COLUMN revenue_30_days numeric(12,2), ADD COLUMN consistency_days integer NOT NULL DEFAULT 90 CHECK (consistency_days = 90);
CREATE OR REPLACE FUNCTION public.hs_bank_credit_summary(_store_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_revenue numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.stores WHERE id=_store_id AND owner_id=auth.uid() AND status='approved') THEN RAISE EXCEPTION 'Loja aprovada do titular necessária.'; END IF;
 SELECT COALESCE(sum(gross_amount),0) INTO v_revenue FROM public.payment_transactions WHERE store_id=_store_id AND status='approved' AND paid_at>=now()-interval '30 days' AND paid_at<=now();
 RETURN jsonb_build_object('revenue',v_revenue,'estimate',round(v_revenue*0.30,2),'consistencyDays',90);
END; $$;
REVOKE ALL ON FUNCTION public.hs_bank_credit_summary(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hs_bank_credit_summary(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.hs_bank_request_credit(_store_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_summary jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.hs_bank_credit_eligible(_store_id) THEN RAISE EXCEPTION 'Solicitação disponível somente para lojistas aprovados com vendas pagas nos últimos 30 dias.'; END IF;
 v_summary:=public.hs_bank_credit_summary(_store_id);
 INSERT INTO public.hs_bank_credit_requests(store_id,user_id,estimated_amount,revenue_30_days,consistency_days) VALUES(_store_id,auth.uid(),(v_summary->>'estimate')::numeric,(v_summary->>'revenue')::numeric,90) ON CONFLICT(store_id) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN SELECT id INTO v_id FROM public.hs_bank_credit_requests WHERE store_id=_store_id AND user_id=auth.uid(); END IF;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.hs_bank_request_credit(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hs_bank_request_credit(uuid) TO authenticated;
COMMENT ON COLUMN public.hs_bank_credit_requests.estimated_amount IS 'Non-binding 30 percent reference from paid gross sales in previous 30 days; not approved credit or available money.';
COMMENT ON COLUMN public.hs_bank_credit_requests.consistency_days IS 'Analysis reference only; no automatic approval or disbursement after 90 days.';