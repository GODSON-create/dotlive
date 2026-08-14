-- Add new columns to assessments
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS current_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS potential_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS unicorn_potential NUMERIC DEFAULT 0;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS founder_archetype TEXT;

ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS current_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS potential_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS unicorn_potential NUMERIC DEFAULT 0;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS founder_archetype TEXT;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS university TEXT;

GRANT SELECT ON public.assessments TO authenticated;
GRANT SELECT ON public.founder_profiles TO authenticated;

-- ============ Leaderboards function ============
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(_type text)
RETURNS TABLE (
  group_name text,
  avg_valuation numeric,
  avg_vantage numeric,
  most_improved text,
  most_fundable_count bigint,
  highest_unicorn_potential numeric,
  member_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _type = 'university' THEN
    RETURN QUERY
      SELECT COALESCE(university, 'Unknown University') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(vantage_point), 0), 0) as avg_vantage,
        '-'::text as most_improved,
        count(CASE WHEN fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM founder_profiles
      WHERE university IS NOT NULL AND university <> ''
      GROUP BY university ORDER BY avg_valuation DESC;
  ELSIF _type = 'city' THEN
    RETURN QUERY
      SELECT COALESCE(city, 'Unknown City') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0),
        COALESCE(round(avg(vantage_point), 0), 0),
        '-'::text,
        count(CASE WHEN fundability >= 70 THEN 1 END),
        COALESCE(round(max(unicorn_potential), 1), 0.0),
        count(*)
      FROM founder_profiles
      WHERE city IS NOT NULL AND city <> ''
      GROUP BY city ORDER BY 2 DESC;
  ELSIF _type = 'state' THEN
    RETURN QUERY
      SELECT COALESCE(state, 'Unknown State'),
        COALESCE(round(avg(current_valuation), 0), 0),
        COALESCE(round(avg(vantage_point), 0), 0),
        '-'::text,
        count(CASE WHEN fundability >= 70 THEN 1 END),
        COALESCE(round(max(unicorn_potential), 1), 0.0),
        count(*)
      FROM founder_profiles
      WHERE state IS NOT NULL AND state <> ''
      GROUP BY state ORDER BY 2 DESC;
  ELSIF _type = 'country' THEN
    RETURN QUERY
      SELECT COALESCE(country, 'Unknown Country'),
        COALESCE(round(avg(current_valuation), 0), 0),
        COALESCE(round(avg(vantage_point), 0), 0),
        '-'::text,
        count(CASE WHEN fundability >= 70 THEN 1 END),
        COALESCE(round(max(unicorn_potential), 1), 0.0),
        count(*)
      FROM founder_profiles
      WHERE country IS NOT NULL AND country <> ''
      GROUP BY country ORDER BY 2 DESC;
  ELSIF _type = 'industry' THEN
    RETURN QUERY
      SELECT COALESCE(industry, 'Unknown Industry'),
        COALESCE(round(avg(current_valuation), 0), 0),
        COALESCE(round(avg(vantage_point), 0), 0),
        '-'::text,
        count(CASE WHEN fundability >= 70 THEN 1 END),
        COALESCE(round(max(unicorn_potential), 1), 0.0),
        count(*)
      FROM founder_profiles
      WHERE industry IS NOT NULL AND industry <> ''
      GROUP BY industry ORDER BY 2 DESC;
  ELSIF _type = 'community' THEN
    RETURN QUERY
      SELECT c.name,
        COALESCE(round(avg(fp.current_valuation), 0), 0),
        COALESCE(round(avg(fp.vantage_point), 0), 0),
        '-'::text,
        count(CASE WHEN fp.fundability >= 70 THEN 1 END),
        COALESCE(round(max(fp.unicorn_potential), 1), 0.0),
        count(*)
      FROM community_members cm
      JOIN founder_profiles fp ON cm.founder_id = fp.user_id
      JOIN communities c ON cm.community_id = c.id
      GROUP BY c.id, c.name ORDER BY 2 DESC;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_leaderboard(text) TO authenticated;

-- ============ Runway Challenges function ============
CREATE OR REPLACE FUNCTION public.get_runway_challenges(_type text)
RETURNS TABLE (
  user_id uuid,
  venture_name text,
  logo_url text,
  vantage_point integer,
  current_valuation numeric,
  fundability integer,
  stage text,
  growth_score numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _type = 'pre_seed' THEN
    RETURN QUERY
      SELECT fp.user_id,
        COALESCE(fp.venture_name, 'Unnamed Startup')::text,
        fp.logo_url,
        COALESCE(fp.vantage_point, 0),
        COALESCE(fp.current_valuation, 0::numeric),
        COALESCE(fp.fundability, 0),
        COALESCE(fp.stage, 'Assess')::text,
        round(COALESCE(fp.current_valuation, 0::numeric) * 0.1 + COALESCE(fp.vantage_point, 0) * 10, 0)
      FROM founder_profiles fp
      WHERE fp.stage IN ('Assess', 'Learn', 'Improve', 'Validate') OR fp.current_valuation < 50000000
      ORDER BY 8 DESC LIMIT 100;
  ELSE
    RETURN QUERY
      SELECT fp.user_id,
        COALESCE(fp.venture_name, 'Unnamed Startup')::text,
        fp.logo_url,
        COALESCE(fp.vantage_point, 0),
        COALESCE(fp.current_valuation, 0::numeric),
        COALESCE(fp.fundability, 0),
        COALESCE(fp.stage, 'Assess')::text,
        round(COALESCE(fp.current_valuation, 0::numeric) * 0.1 + COALESCE(fp.vantage_point, 0) * 10, 0)
      FROM founder_profiles fp
      ORDER BY 8 DESC LIMIT 1000;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_runway_challenges(text) TO authenticated;

-- ============ Admin helper function ============
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin', 'moderator')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

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

-- ============ Pitchathon Application Status Trigger ============
CREATE OR REPLACE FUNCTION public.check_pitchathon_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin(auth.uid()) THEN NEW.status := 'pending'; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change the application status';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_pitchathon_application_status ON public.pitchathon_applications;
CREATE TRIGGER enforce_pitchathon_application_status
  BEFORE INSERT OR UPDATE ON public.pitchathon_applications
  FOR EACH ROW EXECUTE FUNCTION public.check_pitchathon_application_status();

-- ============ Meeting Request RLS Fix ============
DROP POLICY IF EXISTS "Investors create requests" ON public.meeting_requests;
CREATE POLICY "Investors create requests" ON public.meeting_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = investor_id AND public.has_role(auth.uid(), 'investor'));

-- ============ Assessments RLS ============
DROP POLICY IF EXISTS "Users manage own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users select own assessments" ON public.assessments;
CREATE POLICY "Users select own assessments" ON public.assessments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own assessments" ON public.assessments;
CREATE POLICY "Users delete own assessments" ON public.assessments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ Secure Wallet Revaluation Charge Function ============
CREATE OR REPLACE FUNCTION public.charge_revaluation_fee(_user_id uuid, _fee numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _current_balance numeric;
BEGIN
  SELECT balance INTO _current_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _current_balance IS NULL OR _current_balance < _fee THEN RETURN false; END IF;
  UPDATE public.wallets SET balance = balance - _fee, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_user_id, -_fee, 'revaluation', 'Vantage assessment revaluation fee');
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.charge_revaluation_fee(uuid, numeric) FROM anon, authenticated;