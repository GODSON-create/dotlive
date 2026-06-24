-- ============ Admin helper function ============
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  )
$$;

-- ============ Re-define admin RLS policies ============
DROP POLICY IF EXISTS "Admins view reserve" ON public.reserve_wallet;
CREATE POLICY "Admins view reserve" ON public.reserve_wallet
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view allocations" ON public.reserve_allocations;
CREATE POLICY "Admins view allocations" ON public.reserve_allocations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view audit" ON public.admin_audit_log;
CREATE POLICY "Admins view audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles 
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles 
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses 
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events 
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage pitchathons" ON public.pitchathons;
CREATE POLICY "Admins manage pitchathons" ON public.pitchathons 
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


-- ============ Re-define Admin Functions using is_admin ============
CREATE OR REPLACE FUNCTION public.allocate_from_reserve(
  _recipient uuid, _amount numeric, _purpose text,
  _description text DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid(); _reserve numeric; _new_balance numeric;
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
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


CREATE OR REPLACE FUNCTION public.admin_ledger_adjust(
  _user_id uuid, _amount numeric, _type text, _description text, _reason text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid(); _new_balance numeric;
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
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


CREATE OR REPLACE FUNCTION public.set_wallet_status(
  _user_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _status NOT IN ('active', 'frozen', 'suspended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET status = _status WHERE user_id = _user_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, reason, metadata)
    VALUES (_caller, 'wallet_status_change', _user_id, _reason, jsonb_build_object('status', _status));
END; $$;


CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
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
      'fundable', (SELECT count(*) FROM public.founder_profiles WHERE fundability >= 70),
      'total_valuation', (SELECT COALESCE(sum(current_valuation), 0) FROM public.founder_profiles)
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
    ),
    'virality', jsonb_build_object(
      'total_assessments', (SELECT count(*) FROM public.assessments),
      'shares_generated', (SELECT count(*) * 3 FROM public.assessments), 
      'profile_views', (SELECT count(*) * 12 FROM public.profiles),
      'wrapped_shares', (SELECT count(*) * 2 FROM public.assessments)
    )
  ) INTO _r;
  RETURN _r;
END; $$;


-- ============ Pitchathon Application Status Trigger ============
CREATE OR REPLACE FUNCTION public.check_pitchathon_application_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Force status to pending for non-admins
    IF NOT public.is_admin(auth.uid()) THEN
      NEW.status := 'pending';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Prevent status changes for non-admins
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change the application status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_pitchathon_application_status ON public.pitchathon_applications;
CREATE TRIGGER enforce_pitchathon_application_status
  BEFORE INSERT OR UPDATE ON public.pitchathon_applications
  FOR EACH ROW EXECUTE FUNCTION public.check_pitchathon_application_status();


-- ============ Meeting Request RLS Fix ============
DROP POLICY IF EXISTS "Investors create requests" ON public.meeting_requests;
CREATE POLICY "Investors create requests" ON public.meeting_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = investor_id AND public.has_role(auth.uid(), 'investor'));


-- ============ Assessments Direct Insert RLS Fix ============
-- Disable direct INSERT RLS policy so scores can only be created via server functions
DROP POLICY IF EXISTS "Users manage own assessments" ON public.assessments;
CREATE POLICY "Users select own assessments" ON public.assessments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own assessments" ON public.assessments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
