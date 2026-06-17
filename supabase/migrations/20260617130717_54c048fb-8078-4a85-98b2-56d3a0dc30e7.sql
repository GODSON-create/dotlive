
CREATE OR REPLACE FUNCTION public.deposit_dot(_amount NUMERIC, _description TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _new_balance NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount < 2000 THEN RAISE EXCEPTION 'Minimum deposit is 2000 DOT'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _uid RETURNING balance INTO _new_balance;
  INSERT INTO public.transactions (user_id, amount, type, description) VALUES (_uid, _amount, 'Deposit', _description);
  RETURN _new_balance;
END; $$;
GRANT EXECUTE ON FUNCTION public.deposit_dot(NUMERIC, TEXT) TO authenticated;
