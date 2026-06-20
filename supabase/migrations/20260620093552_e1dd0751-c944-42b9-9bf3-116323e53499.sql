-- 1. Unique public DOT ID for every user
CREATE SEQUENCE IF NOT EXISTS public.dot_id_seq START 100000;

CREATE OR REPLACE FUNCTION public.generate_dot_id()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'DOT-' || lpad(nextval('public.dot_id_seq')::text, 6, '0')
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dot_id text;

-- Backfill existing profiles
UPDATE public.profiles SET dot_id = public.generate_dot_id() WHERE dot_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN dot_id SET DEFAULT public.generate_dot_id();
ALTER TABLE public.profiles ALTER COLUMN dot_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_dot_id_key ON public.profiles (dot_id);

-- 2. Safe lookup: returns ONLY the recipient display name for confirmation
CREATE OR REPLACE FUNCTION public.lookup_dot_id(_dot_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name
  FROM public.profiles
  WHERE upper(dot_id) = upper(trim(_dot_id))
  LIMIT 1
$$;

-- 3. Atomic wallet-to-wallet transfer by DOT ID
CREATE OR REPLACE FUNCTION public.transfer_dot(_recipient_dot_id text, _amount numeric, _note text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender uuid := auth.uid();
  _recipient uuid;
  _sender_name text;
  _recipient_name text;
  _new_balance numeric;
BEGIN
  IF _sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT id, name INTO _recipient, _recipient_name
  FROM public.profiles
  WHERE upper(dot_id) = upper(trim(_recipient_dot_id))
  LIMIT 1;

  IF _recipient IS NULL THEN
    RAISE EXCEPTION 'No wallet found for that DOT ID';
  END IF;
  IF _recipient = _sender THEN
    RAISE EXCEPTION 'You cannot transfer to yourself';
  END IF;

  SELECT name INTO _sender_name FROM public.profiles WHERE id = _sender;

  -- Ensure both wallets exist
  INSERT INTO public.wallets (user_id, balance) VALUES (_sender, 0) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance) VALUES (_recipient, 0) ON CONFLICT (user_id) DO NOTHING;

  -- Lock both wallet rows in a deterministic order to avoid deadlocks
  PERFORM 1 FROM public.wallets WHERE user_id = least(_sender, _recipient) FOR UPDATE;
  PERFORM 1 FROM public.wallets WHERE user_id = greatest(_sender, _recipient) FOR UPDATE;

  -- Debit sender, reject if it would go negative
  UPDATE public.wallets SET balance = balance - _amount
  WHERE user_id = _sender
  RETURNING balance INTO _new_balance;

  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient DOT balance';
  END IF;

  -- Credit recipient
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _recipient;

  -- Immutable ledger entries on both sides
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_sender, -_amount, 'Transfer',
          'Sent to ' || COALESCE(_recipient_name, _recipient_dot_id) || COALESCE(' · ' || _note, ''));

  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_recipient, _amount, 'Transfer',
          'Received from ' || COALESCE(_sender_name, 'a DOT user') || COALESCE(' · ' || _note, ''));

  RETURN _new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_dot_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_dot(text, numeric, text) TO authenticated;