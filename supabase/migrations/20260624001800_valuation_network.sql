-- Add new columns to assessments
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS current_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS potential_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS unicorn_potential NUMERIC DEFAULT 0;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS founder_archetype TEXT;

-- Add new columns to founder_profiles
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS current_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS potential_valuation NUMERIC DEFAULT 0;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS unicorn_potential NUMERIC DEFAULT 0;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS founder_archetype TEXT;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.founder_profiles ADD COLUMN IF NOT EXISTS university TEXT;

-- Enable grants
GRANT SELECT ON public.assessments TO authenticated;
GRANT SELECT ON public.founder_profiles TO authenticated;
GRANT SELECT ON public.assessments TO anon;
GRANT SELECT ON public.founder_profiles TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.communities TO anon;

-- Allow public read access (for sharing result and profile pages)
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read founder_profiles" ON public.founder_profiles FOR SELECT USING (true);
CREATE POLICY "Public read assessments" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Public read communities" ON public.communities FOR SELECT USING (true);


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
      SELECT 
        COALESCE(university, 'Unknown University') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(vantage_point), 0), 0) as avg_vantage,
        '—'::text as most_improved,
        count(CASE WHEN fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM founder_profiles
      WHERE university IS NOT NULL AND university <> ''
      GROUP BY university
      ORDER BY avg_valuation DESC;
  ELSIF _type = 'city' THEN
    RETURN QUERY
      SELECT 
        COALESCE(city, 'Unknown City') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(vantage_point), 0), 0) as avg_vantage,
        '—'::text as most_improved,
        count(CASE WHEN fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM founder_profiles
      WHERE city IS NOT NULL AND city <> ''
      GROUP BY city
      ORDER BY avg_valuation DESC;
  ELSIF _type = 'state' THEN
    RETURN QUERY
      SELECT 
        COALESCE(state, 'Unknown State') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(vantage_point), 0), 0) as avg_vantage,
        '—'::text as most_improved,
        count(CASE WHEN fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM founder_profiles
      WHERE state IS NOT NULL AND state <> ''
      GROUP BY state
      ORDER BY avg_valuation DESC;
  ELSIF _type = 'country' THEN
    RETURN QUERY
      SELECT 
        COALESCE(country, 'Unknown Country') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(vantage_point), 0), 0) as avg_vantage,
        '—'::text as most_improved,
        count(CASE WHEN fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM founder_profiles
      WHERE country IS NOT NULL AND country <> ''
      GROUP BY country
      ORDER BY avg_valuation DESC;
  ELSIF _type = 'industry' THEN
    RETURN QUERY
      SELECT 
        COALESCE(industry, 'Unknown Industry') as group_name,
        COALESCE(round(avg(current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(vantage_point), 0), 0) as avg_vantage,
        '—'::text as most_improved,
        count(CASE WHEN fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM founder_profiles
      WHERE industry IS NOT NULL AND industry <> ''
      GROUP BY industry
      ORDER BY avg_valuation DESC;
  ELSIF _type = 'community' THEN
    RETURN QUERY
      SELECT 
        c.name as group_name,
        COALESCE(round(avg(fp.current_valuation), 0), 0) as avg_valuation,
        COALESCE(round(avg(fp.vantage_point), 0), 0) as avg_vantage,
        '—'::text as most_improved,
        count(CASE WHEN fp.fundability >= 70 THEN 1 END) as most_fundable_count,
        COALESCE(round(max(fp.unicorn_potential), 1), 0.0) as highest_unicorn_potential,
        count(*) as member_count
      FROM community_members cm
      JOIN founder_profiles fp ON cm.founder_id = fp.user_id
      JOIN communities c ON cm.community_id = c.id
      GROUP BY c.id, c.name
      ORDER BY avg_valuation DESC;
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
      SELECT 
        fp.user_id,
        COALESCE(fp.venture_name, 'Unnamed Startup')::text as venture_name,
        fp.logo_url,
        COALESCE(fp.vantage_point, 0) as vantage_point,
        COALESCE(fp.current_valuation, 0::numeric) as current_valuation,
        COALESCE(fp.fundability, 0) as fundability,
        COALESCE(fp.stage, 'Assess')::text as stage,
        round(COALESCE(fp.current_valuation, 0::numeric) * 0.1 + COALESCE(fp.vantage_point, 0) * 10, 0) as growth_score
      FROM founder_profiles fp
      WHERE fp.stage IN ('Assess', 'Learn', 'Improve', 'Validate') OR fp.current_valuation < 50000000
      ORDER BY growth_score DESC
      LIMIT 100;
  ELSE
    RETURN QUERY
      SELECT 
        fp.user_id,
        COALESCE(fp.venture_name, 'Unnamed Startup')::text as venture_name,
        fp.logo_url,
        COALESCE(fp.vantage_point, 0) as vantage_point,
        COALESCE(fp.current_valuation, 0::numeric) as current_valuation,
        COALESCE(fp.fundability, 0) as fundability,
        COALESCE(fp.stage, 'Assess')::text as stage,
        round(COALESCE(fp.current_valuation, 0::numeric) * 0.1 + COALESCE(fp.vantage_point, 0) * 10, 0) as growth_score
      FROM founder_profiles fp
      ORDER BY growth_score DESC
      LIMIT 1000;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_runway_challenges(text) TO authenticated;

-- ============ Expand Executive Overview Metrics ============
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

GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;
