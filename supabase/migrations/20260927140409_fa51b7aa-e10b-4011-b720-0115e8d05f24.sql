CREATE POLICY "service manages mercado pago oauth states"
ON public.mercado_pago_oauth_states
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);