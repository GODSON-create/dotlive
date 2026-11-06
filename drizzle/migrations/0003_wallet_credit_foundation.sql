-- ===== Wallet settings (separate purchase price vs service reference) =====
CREATE TABLE public.wallet_settings (
  key text PRIMARY KEY,
  value numeric,
  text_value text,
  label text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_settings TO authenticated;
GRANT ALL ON public.wallet_settings TO service_role;
ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read wallet settings" ON public.wallet_settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.wallet_settings (key, value, text_value, label) VALUES
  ('purchase_price_usd', 5, NULL, 'DOT purchase price (USD per DOT)'),
  ('redemption_value_usd', 5, NULL, 'Service utility reference (USD per DOT, not cash)'),
  ('ngn_per_usd', NULL, NULL, 'NGN per USD exchange rate used for Paystack checkout'),
  ('fx_max_age_hours', 24, NULL, 'Maximum age of the exchange rate before checkout is blocked'),
  ('min_purchase_dot', 200, NULL, 'Minimum DOT per purchase'),
  ('transfer_policy', NULL, 'verified_approval', 'Transfer policy');

CREATE TABLE public.wallet_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  old_value numeric,
  new_value numeric,
  changed_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_settings_audit TO authenticated;
GRANT ALL ON public.wallet_settings_audit TO service_role;
ALTER TABLE public.wallet_settings_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings audit" ON public.wallet_settings_audit FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_finance_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE OR REPLACE FUNCTION public.update_wallet_setting(_key text, _value numeric, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old numeric;
BEGIN
  IF NOT public.is_finance_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _key NOT IN ('purchase_price_usd','redemption_value_usd','ngn_per_usd','fx_max_age_hours','min_purchase_dot') THEN
    RAISE EXCEPTION 'Unknown setting';
  END IF;
  IF _value IS NULL OR _value <= 0 THEN RAISE EXCEPTION 'Value must be positive'; END IF;
  IF _key = 'min_purchase_dot' AND _value <> trunc(_value) THEN RAISE EXCEPTION 'Minimum must be a whole number'; END IF;
  SELECT value INTO _old FROM public.wallet_settings WHERE key = _key FOR UPDATE;
  UPDATE public.wallet_settings SET value = _value, updated_by = auth.uid(), updated_at = now() WHERE key = _key;
  INSERT INTO public.wallet_settings_audit (key, old_value, new_value, changed_by, reason)
    VALUES (_key, _old, _value, auth.uid(), NULLIF(trim(_reason), ''));
END; $$;
REVOKE EXECUTE ON FUNCTION public.update_wallet_setting(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_wallet_setting(text, numeric, text) TO authenticated;

-- ===== Append-only ledger =====
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_ref text NOT NULL UNIQUE DEFAULT ('LE-' || replace(gen_random_uuid()::text, '-', '')),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  entry_type text NOT NULL,
  description text,
  idempotency_key text UNIQUE,
  source_table text,
  source_id uuid,
  balance_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_user_idx ON public.ledger_entries (user_id, created_at);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.ledger_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Ledger entries are immutable'; END; $$;
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.ledger_block_mutation();

-- Opening balances: legacy wallets reconcile exactly with legacy transactions, so carry the balance over once, clearly labelled.
INSERT INTO public.ledger_entries (user_id, amount, entry_type, description, idempotency_key, source_table, balance_after)
SELECT w.user_id, w.balance, 'opening_balance',
  'Opening balance carried over from legacy wallet (reconciled with legacy transaction history)',
  'opening:' || w.user_id::text, 'wallets', w.balance
FROM public.wallets w
WHERE w.balance <> 0
  AND w.balance = COALESCE((SELECT sum(t.amount) FROM public.transactions t WHERE t.user_id = w.user_id), 0);

-- Every new legacy transaction row is mirrored into the ledger
CREATE OR REPLACE FUNCTION public.mirror_transaction_to_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ledger_entries (user_id, amount, entry_type, description, idempotency_key, source_table, source_id, balance_after)
  VALUES (NEW.user_id, NEW.amount, NEW.type, NEW.description, 'tx:' || NEW.id::text, 'transactions', NEW.id,
          (SELECT balance FROM public.wallets WHERE user_id = NEW.user_id));
  RETURN NEW;
END; $$;
CREATE TRIGGER transactions_mirror_ledger AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.mirror_transaction_to_ledger();

CREATE OR REPLACE FUNCTION public.wallet_reconciliation()
RETURNS TABLE(user_id uuid, wallet_balance numeric, ledger_total numeric, difference numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT w.user_id, w.balance, COALESCE(l.total, 0), w.balance - COALESCE(l.total, 0)
  FROM public.wallets w
  LEFT JOIN (SELECT le.user_id, sum(le.amount) total FROM public.ledger_entries le GROUP BY le.user_id) l ON l.user_id = w.user_id
  WHERE w.balance <> COALESCE(l.total, 0);
END; $$;

-- Withdrawals are not supported: keep legacy column inert
COMMENT ON COLUMN public.wallets.withdrawable_balance IS 'DEPRECATED: DOT credits are not cash and cannot be withdrawn. Inert legacy field.';

-- ===== Transfer requests (verified_approval) =====
CREATE TABLE public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('TR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0 AND amount = trunc(amount)),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  idempotency_key text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_reason text,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id),
  UNIQUE (sender_id, idempotency_key)
);
CREATE INDEX transfer_requests_status_idx ON public.transfer_requests (status, created_at);
GRANT SELECT ON public.transfer_requests TO authenticated;
GRANT ALL ON public.transfer_requests TO service_role;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender reads own transfer requests" ON public.transfer_requests FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Admins read transfer requests" ON public.transfer_requests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.transfer_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.transfer_requests(id),
  event text NOT NULL,
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transfer_request_events TO authenticated;
GRANT ALL ON public.transfer_request_events TO service_role;
ALTER TABLE public.transfer_request_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read transfer events" ON public.transfer_request_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER transfer_request_events_immutable BEFORE UPDATE OR DELETE ON public.transfer_request_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_block_mutation();

-- Recipient lookup: only verified members can look up, and only verified recipients are revealed
CREATE OR REPLACE FUNCTION public.lookup_verified_recipient(_dot_id text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name FROM public.profiles p
  WHERE upper(p.dot_id) = upper(trim(_dot_id))
    AND p.verified AND NOT p.suspended
    AND p.id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.verified AND NOT me.suspended)
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_verified_recipient(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_verified_recipient(text) TO authenticated;

-- Legacy lookup no longer discloses unverified members (admins keep full lookup)
CREATE OR REPLACE FUNCTION public.lookup_dot_id(_dot_id text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name FROM public.profiles p
  WHERE upper(p.dot_id) = upper(trim(_dot_id))
    AND (public.is_admin(auth.uid()) OR (p.verified AND NOT p.suspended))
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_dot_id(text) FROM anon;

-- Instant transfers are retired; keep the function but nobody can call it from the app
REVOKE EXECUTE ON FUNCTION public.transfer_dot(text, numeric, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_dot_transfer(_recipient_dot_id text, _amount numeric, _note text, _idempotency_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sender uuid := auth.uid();
  _recipient uuid;
  _existing public.transfer_requests%ROWTYPE;
  _balance numeric;
  _held numeric;
  _id uuid;
BEGIN
  IF _sender IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 8 OR length(_idempotency_key) > 100 THEN
    RAISE EXCEPTION 'Invalid request key';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount <> trunc(_amount) THEN
    RAISE EXCEPTION 'Amount must be a positive whole number';
  END IF;

  -- Serialize this sender's requests (concurrency + double-spend guard)
  INSERT INTO public.wallets (user_id, balance) VALUES (_sender, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _balance FROM public.wallets WHERE user_id = _sender FOR UPDATE;

  -- Replay: same key returns the same request
  SELECT * INTO _existing FROM public.transfer_requests WHERE sender_id = _sender AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    IF _existing.amount <> _amount THEN RAISE EXCEPTION 'Request key already used for a different transfer'; END IF;
    RETURN _existing.id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _sender AND verified AND NOT suspended) THEN
    RAISE EXCEPTION 'Only verified DOT members can send transfers';
  END IF;
  PERFORM public.assert_wallet_active(_sender);

  SELECT id INTO _recipient FROM public.profiles
    WHERE upper(dot_id) = upper(trim(_recipient_dot_id)) AND verified AND NOT suspended LIMIT 1;
  IF _recipient IS NULL THEN RAISE EXCEPTION 'Recipient is not eligible to receive transfers'; END IF;
  IF _recipient = _sender THEN RAISE EXCEPTION 'You cannot transfer to yourself'; END IF;

  SELECT COALESCE(sum(amount), 0) INTO _held FROM public.transfer_requests WHERE sender_id = _sender AND status = 'pending';
  IF _balance - _held < _amount THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;

  INSERT INTO public.transfer_requests (sender_id, recipient_id, amount, note, idempotency_key)
    VALUES (_sender, _recipient, _amount, NULLIF(left(trim(COALESCE(_note, '')), 120), ''), _idempotency_key)
    RETURNING id INTO _id;
  INSERT INTO public.transfer_request_events (request_id, event, actor_id) VALUES (_id, 'requested', _sender);
  RETURN _id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.request_dot_transfer(text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_dot_transfer(text, numeric, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_dot_transfer(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.transfer_requests%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.transfer_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR _r.sender_id <> auth.uid() THEN RAISE EXCEPTION 'Transfer request not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be cancelled'; END IF;
  UPDATE public.transfer_requests SET status = 'cancelled', reviewed_at = now() WHERE id = _request_id;
  INSERT INTO public.transfer_request_events (request_id, event, actor_id) VALUES (_request_id, 'cancelled', auth.uid());
END; $$;
REVOKE EXECUTE ON FUNCTION public.cancel_dot_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_dot_transfer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_dot_transfer(_request_id uuid, _approve boolean, _reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin uuid := auth.uid();
  _r public.transfer_requests%ROWTYPE;
  _sender_bal numeric;
  _sender_name text; _recipient_name text;
BEGIN
  IF NOT public.is_finance_admin(_admin) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _r FROM public.transfer_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer request not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Request already %', _r.status; END IF;
  IF _admin IN (_r.sender_id, _r.recipient_id) THEN RAISE EXCEPTION 'You cannot review your own transfer'; END IF;

  IF NOT _approve THEN
    IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'A reason is required to reject'; END IF;
    UPDATE public.transfer_requests SET status = 'rejected', reviewed_by = _admin, reviewed_at = now(), review_reason = trim(_reason) WHERE id = _request_id;
    INSERT INTO public.transfer_request_events (request_id, event, actor_id, reason) VALUES (_request_id, 'rejected', _admin, trim(_reason));
    RETURN 'rejected';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _r.sender_id AND verified AND NOT suspended)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _r.recipient_id AND verified AND NOT suspended) THEN
    RAISE EXCEPTION 'Sender and recipient must both be verified';
  END IF;
  PERFORM public.assert_wallet_active(_r.sender_id);
  PERFORM public.assert_wallet_active(_r.recipient_id);

  INSERT INTO public.wallets (user_id, balance) VALUES (_r.recipient_id, 0) ON CONFLICT (user_id) DO NOTHING;
  -- Lock both wallets in a fixed order to avoid deadlocks
  PERFORM 1 FROM public.wallets WHERE user_id IN (_r.sender_id, _r.recipient_id) ORDER BY user_id FOR UPDATE;
  SELECT balance INTO _sender_bal FROM public.wallets WHERE user_id = _r.sender_id;
  IF _sender_bal < _r.amount THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;

  SELECT name INTO _sender_name FROM public.profiles WHERE id = _r.sender_id;
  SELECT name INTO _recipient_name FROM public.profiles WHERE id = _r.recipient_id;

  UPDATE public.wallets SET balance = balance - _r.amount, updated_at = now() WHERE user_id = _r.sender_id;
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_r.sender_id, -_r.amount, 'Transfer', 'Sent to ' || COALESCE(_recipient_name, 'member') || ' · ' || _r.reference);
  UPDATE public.wallets SET balance = balance + _r.amount, updated_at = now() WHERE user_id = _r.recipient_id;
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_r.recipient_id, _r.amount, 'Transfer', 'Received from ' || COALESCE(_sender_name, 'member') || ' · ' || _r.reference);

  UPDATE public.transfer_requests SET status = 'approved', reviewed_by = _admin, reviewed_at = now(), settled_at = now(),
    review_reason = NULLIF(trim(COALESCE(_reason, '')), '') WHERE id = _request_id;
  INSERT INTO public.transfer_request_events (request_id, event, actor_id, reason) VALUES (_request_id, 'approved_settled', _admin, NULLIF(trim(COALESCE(_reason, '')), ''));
  RETURN 'approved';
END; $$;
REVOKE EXECUTE ON FUNCTION public.review_dot_transfer(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_dot_transfer(uuid, boolean, text) TO authenticated;

-- ===== Paystack pricing snapshot on each payment =====
ALTER TABLE public.payments ADD COLUMN usd_amount numeric;
ALTER TABLE public.payments ADD COLUMN price_usd_per_dot numeric;
ALTER TABLE public.payments ADD COLUMN fx_ngn_per_usd numeric;
REVOKE EXECUTE ON FUNCTION public.credit_paystack_payment(text) FROM PUBLIC, anon, authenticated;