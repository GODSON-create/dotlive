-- ============ Wallet status (freeze / suspend) ============
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- ============ DOT Ecosystem Reserve (singleton) ============
CREATE TABLE IF NOT EXISTS public.reserve_wallet (
  id boolean PRIMARY KEY DEFAULT true,
  balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reserve_singleton CHECK (id)
);
GRANT SELECT ON public.reserve_wallet TO authenticated;
GRANT ALL ON public.reserve_wallet TO service_role;
ALTER TABLE public.reserve_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view reserve" ON public.reserve_wallet
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.reserve_wallet (id, balance) VALUES (true, 100000000000)
  ON CONFLICT (id) DO NOTHING;

-- ============ Reserve allocation ledger ============
CREATE TABLE IF NOT EXISTS public.reserve_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  purpose text NOT NULL,
  description text,
  allocated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reserve_allocations TO authenticated;
GRANT ALL ON public.reserve_allocations TO service_role;
ALTER TABLE public.reserve_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view allocations" ON public.reserve_allocations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Admin audit log ============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid,
  amount numeric,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Wallet active guard ============
CREATE OR REPLACE FUNCTION public.assert_wallet_active(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status text;
BEGIN
  SELECT status INTO _status FROM public.wallets WHERE user_id = _user_id;
  IF _status IN ('frozen', 'suspended') THEN
    RAISE EXCEPTION 'Wallet is % — contact support', _status;
  END IF;
END; $$;

-- ============ Allocate from reserve ============
CREATE OR REPLACE FUNCTION public.allocate_from_reserve(
  _recipient uuid, _amount numeric, _purpose text,
  _description text DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid(); _reserve numeric; _new_balance numeric;
BEGIN
  IF NOT public.has_role(_caller, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _purpose IS NULL OR length(trim(_purpose)) = 0 THEN RAISE EXCEPTION 'Purpose is required'; END IF;

  UPDATE public.reserve_wallet SET balance = balance - _amount, updated_at = now()
    WHERE id = true RETURNING balance INTO _reserve;
  IF _reserve < 0 THEN RAISE EXCEPTION 'Insufficient reserve balance'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_recipient, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _recipient
    RETURNING balance INTO _new_balance;

  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_recipient, _amount, _purpose, COALESCE(_description, 'Reserve allocation: ' || _purpose));
  INSERT INTO public.reserve_allocations (recipient_id, amount, purpose, description, allocated_by)
    VALUES (_recipient, _amount, _purpose, _description, _caller);
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, amount, reason, metadata)
    VALUES (_caller, 'reserve_allocation', _recipient, _amount, _reason, jsonb_build_object('purpose', _purpose));

  RETURN _new_balance;
END; $$;

-- ============ Admin ledger adjustment (audited) ============
CREATE OR REPLACE FUNCTION public.admin_ledger_adjust(
  _user_id uuid, _amount numeric, _type text, _description text, _reason text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid(); _new_balance numeric;
BEGIN
  IF NOT public.has_role(_caller, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _user_id
    RETURNING balance INTO _new_balance;
  IF _new_balance < 0 THEN RAISE EXCEPTION 'Balance cannot go negative'; END IF;
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_user_id, _amount, COALESCE(_type, 'Admin Adjustment'), _description);
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, amount, reason, metadata)
    VALUES (_caller, 'wallet_adjustment', _user_id, _amount, _reason,
            jsonb_build_object('type', _type, 'description', _description));
  RETURN _new_balance;
END; $$;

-- ============ Set wallet status (freeze / suspend / restore) ============
CREATE OR REPLACE FUNCTION public.set_wallet_status(
  _user_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_caller, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _status NOT IN ('active', 'frozen', 'suspended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET status = _status WHERE user_id = _user_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, reason, metadata)
    VALUES (_caller, 'wallet_status_change', _user_id, _reason, jsonb_build_object('status', _status));
END; $$;

-- ============ Executive overview metrics ============
CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'new_today', (SELECT count(*) FROM public.profiles WHERE created_at >= date_trunc('day', now())),
      'new_week', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days')
    ),
    'founders', jsonb_build_object(
      'total', (SELECT count(*) FROM public.founder_profiles),
      'completed_vantage', (SELECT count(*) FROM public.founder_profiles WHERE vantage_point > 0),
      'avg_vantage', (SELECT COALESCE(round(avg(vantage_point), 0), 0) FROM public.founder_profiles WHERE vantage_point > 0),
      'fundable', (SELECT count(*) FROM public.founder_profiles WHERE fundability >= 70)
    ),
    'communities', jsonb_build_object(
      'total', (SELECT count(*) FROM public.communities),
      'leaders', (SELECT count(DISTINCT leader_id) FROM public.communities),
      'members', (SELECT count(*) FROM public.community_members)
    ),
    'academy', jsonb_build_object(
      'enrollments', (SELECT count(*) FROM public.course_enrollments),
      'completed', (SELECT count(*) FROM public.course_enrollments WHERE status = 'completed')
    ),
    'financial', jsonb_build_object(
      'total_revenue_ngn', (SELECT COALESCE(sum(naira_amount), 0) FROM public.payments WHERE credited_at IS NOT NULL),
      'total_dot_issued', (SELECT COALESCE(sum(amount), 0) FROM public.transactions WHERE amount > 0),
      'total_dot_spent', (SELECT COALESCE(abs(sum(amount)), 0) FROM public.transactions WHERE amount < 0),
      'wallet_balances', (SELECT COALESCE(sum(balance), 0) FROM public.wallets),
      'reserve_balance', (SELECT balance FROM public.reserve_wallet WHERE id = true)
    ),
    'marketplace', jsonb_build_object(
      'orders_completed', (SELECT count(*) FROM public.service_orders WHERE status = 'completed'),
      'builder_revenue', (SELECT COALESCE(sum(amount_dot), 0) FROM public.service_orders WHERE status = 'completed'),
      'active_services', (SELECT count(*) FROM public.services WHERE is_active)
    ),
    'investors', jsonb_build_object(
      'registered', (SELECT count(*) FROM public.user_roles WHERE role = 'investor'),
      'saves', (SELECT count(*) FROM public.investor_saves),
      'meetings', (SELECT count(*) FROM public.meeting_requests)
    )
  ) INTO _r;
  RETURN _r;
END; $$;

-- ============ Enforce wallet status on spend / transfer / orders ============
CREATE OR REPLACE FUNCTION public.spend_dot(_amount numeric, _description text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _new_balance NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  PERFORM public.assert_wallet_active(_uid);
  INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _uid RETURNING balance INTO _new_balance;
  IF _new_balance < 0 THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;
  INSERT INTO public.transactions (user_id, amount, type, description) VALUES (_uid, -_amount, 'Spend', _description);
  RETURN _new_balance;
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_dot(_recipient_dot_id text, _amount numeric, _note text DEFAULT NULL::text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sender uuid := auth.uid();
  _recipient uuid;
  _sender_name text;
  _recipient_name text;
  _new_balance numeric;
BEGIN
  IF _sender IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  PERFORM public.assert_wallet_active(_sender);

  SELECT id, name INTO _recipient, _recipient_name FROM public.profiles
    WHERE upper(dot_id) = upper(trim(_recipient_dot_id)) LIMIT 1;
  IF _recipient IS NULL THEN RAISE EXCEPTION 'No wallet found for that DOT ID'; END IF;
  IF _recipient = _sender THEN RAISE EXCEPTION 'You cannot transfer to yourself'; END IF;

  SELECT name INTO _sender_name FROM public.profiles WHERE id = _sender;

  INSERT INTO public.wallets (user_id, balance) VALUES (_sender, 0) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance) VALUES (_recipient, 0) ON CONFLICT (user_id) DO NOTHING;

  PERFORM 1 FROM public.wallets WHERE user_id = least(_sender, _recipient) FOR UPDATE;
  PERFORM 1 FROM public.wallets WHERE user_id = greatest(_sender, _recipient) FOR UPDATE;

  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _sender RETURNING balance INTO _new_balance;
  IF _new_balance < 0 THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;

  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _recipient;

  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_sender, -_amount, 'Transfer', 'Sent to ' || COALESCE(_recipient_name, _recipient_dot_id) || COALESCE(' · ' || _note, ''));
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_recipient, _amount, 'Transfer', 'Received from ' || COALESCE(_sender_name, 'a DOT user') || COALESCE(' · ' || _note, ''));

  RETURN _new_balance;
END; $$;

CREATE OR REPLACE FUNCTION public.create_service_order(_service_id uuid, _requirements text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _client uuid := auth.uid();
  _svc public.services%ROWTYPE;
  _order_id uuid;
  _bal numeric;
BEGIN
  IF _client IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.assert_wallet_active(_client);
  SELECT * INTO _svc FROM public.services WHERE id = _service_id;
  IF NOT FOUND OR NOT _svc.is_active THEN RAISE EXCEPTION 'Service not available'; END IF;
  IF _svc.builder_id = _client THEN RAISE EXCEPTION 'You cannot order your own service'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_client, 0) ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM public.wallets WHERE user_id = _client FOR UPDATE;
  UPDATE public.wallets SET balance = balance - _svc.price_dot WHERE user_id = _client RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;

  INSERT INTO public.service_orders (service_id, client_id, builder_id, amount_dot, title, requirements, status)
    VALUES (_service_id, _client, _svc.builder_id, _svc.price_dot, _svc.title, _requirements, 'in_progress')
    RETURNING id INTO _order_id;

  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_client, -_svc.price_dot, 'Marketplace Spend', 'Order: ' || _svc.title);

  RETURN _order_id;
END; $$;

-- ============ Execute grants ============
GRANT EXECUTE ON FUNCTION public.allocate_from_reserve(uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ledger_adjust(uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_wallet_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;