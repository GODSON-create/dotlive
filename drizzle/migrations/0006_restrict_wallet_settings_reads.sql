REVOKE SELECT ON TABLE public.wallet_settings FROM authenticated;
DROP POLICY IF EXISTS "Signed-in users read wallet settings" ON public.wallet_settings;