CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  dot_amount numeric NOT NULL CHECK (dot_amount > 0),
  naira_amount numeric NOT NULL CHECK (naira_amount > 0),
  status text NOT NULL DEFAULT 'pending',
  paystack_reference text,
  channel text,
  paid_at timestamptz,
  credited_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payments" ON public.payments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic, idempotent credit. Service-role only.
CREATE OR REPLACE FUNCTION public.credit_paystack_payment(_reference text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.payments%ROWTYPE;
  _new_balance numeric;
BEGIN
  SELECT * INTO _p FROM public.payments WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', _reference;
  END IF;

  -- Idempotency: already credited
  IF _p.credited_at IS NOT NULL THEN
    RETURN COALESCE((SELECT balance FROM public.wallets WHERE user_id = _p.user_id), 0);
  END IF;

  IF _p.status <> 'success' THEN
    RAISE EXCEPTION 'Payment % is not in success state', _reference;
  END IF;

  INSERT INTO public.wallets (user_id, balance)
    VALUES (_p.user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
    SET balance = balance + _p.dot_amount
    WHERE user_id = _p.user_id
    RETURNING balance INTO _new_balance;

  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_p.user_id, _p.dot_amount, 'Deposit', 'Paystack deposit · ' || _reference);

  UPDATE public.payments
    SET credited_at = now(), updated_at = now()
    WHERE id = _p.id;

  RETURN _new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_paystack_payment(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_paystack_payment(text) TO service_role;