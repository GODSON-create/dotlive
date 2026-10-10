CREATE TABLE public.acquisition_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL CHECK (visitor_id ~ '^[A-Za-z0-9-]{8,64}$'),
  source text NOT NULL CHECK (source IN ('instagram','arise','whatsapp','telegram','whop','varsityscape','dot','referral','foundry','other')),
  campaign text CHECK (campaign IS NULL OR length(campaign) <= 80),
  ref_code text CHECK (ref_code IS NULL OR length(ref_code) <= 40),
  foundry_slug text CHECK (foundry_slug IS NULL OR foundry_slug ~ '^[a-z0-9-]{1,40}$'),
  landing_path text CHECK (landing_path IS NULL OR length(landing_path) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acquisition_visits TO service_role;
GRANT SELECT ON public.acquisition_visits TO authenticated;
ALTER TABLE public.acquisition_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view acquisition visits" ON public.acquisition_visits
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_acq_visits_source_created ON public.acquisition_visits (source, created_at);
CREATE INDEX idx_acq_visits_visitor ON public.acquisition_visits (visitor_id);

CREATE TABLE public.member_attributions (
  user_id uuid PRIMARY KEY,
  visitor_id text,
  source text NOT NULL CHECK (source IN ('instagram','arise','whatsapp','telegram','whop','varsityscape','dot','referral','foundry','other')),
  campaign text CHECK (campaign IS NULL OR length(campaign) <= 80),
  ref_code text CHECK (ref_code IS NULL OR length(ref_code) <= 40),
  foundry_slug text CHECK (foundry_slug IS NULL OR foundry_slug ~ '^[a-z0-9-]{1,40}$'),
  landing_path text CHECK (landing_path IS NULL OR length(landing_path) <= 200),
  first_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_attributions TO service_role;
GRANT SELECT ON public.member_attributions TO authenticated;
ALTER TABLE public.member_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own attribution" ON public.member_attributions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view attributions" ON public.member_attributions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Anonymous-safe visit logging (validated by table constraints)
CREATE OR REPLACE FUNCTION public.record_acquisition_visit(
  _visitor_id text, _source text, _campaign text DEFAULT NULL, _ref_code text DEFAULT NULL,
  _foundry_slug text DEFAULT NULL, _landing_path text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- de-duplicate: one visit per visitor/source/campaign per 30 minutes
  IF EXISTS (SELECT 1 FROM public.acquisition_visits WHERE visitor_id = _visitor_id AND source = _source
     AND campaign IS NOT DISTINCT FROM _campaign AND created_at > now() - interval '30 minutes') THEN
    RETURN;
  END IF;
  INSERT INTO public.acquisition_visits (visitor_id, source, campaign, ref_code, foundry_slug, landing_path)
  VALUES (_visitor_id, _source, NULLIF(trim(_campaign), ''), NULLIF(trim(_ref_code), ''), NULLIF(trim(_foundry_slug), ''), _landing_path);
END; $$;
REVOKE ALL ON FUNCTION public.record_acquisition_visit(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_acquisition_visit(text,text,text,text,text,text) TO anon, authenticated;

-- First-touch attribution bound to the signed-in member; never overwrites
CREATE OR REPLACE FUNCTION public.claim_acquisition_attribution(
  _visitor_id text, _source text, _campaign text DEFAULT NULL, _ref_code text DEFAULT NULL,
  _foundry_slug text DEFAULT NULL, _landing_path text DEFAULT NULL, _first_seen_at timestamptz DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.member_attributions (user_id, visitor_id, source, campaign, ref_code, foundry_slug, landing_path, first_seen_at)
  VALUES (_uid, _visitor_id, _source, NULLIF(trim(_campaign), ''), NULLIF(trim(_ref_code), ''), NULLIF(trim(_foundry_slug), ''), _landing_path,
          LEAST(COALESCE(_first_seen_at, now()), now()))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_acquisition_attribution(text,text,text,text,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_acquisition_attribution(text,text,text,text,text,text,timestamptz) TO authenticated;

-- Admin funnel: visits -> visitors -> members -> founders -> ventures, per source
CREATE OR REPLACE FUNCTION public.get_acquisition_overview(_days integer DEFAULT 30)
RETURNS TABLE (source text, visits bigint, visitors bigint, members bigint, founders bigint, ventures bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
  WITH v AS (
    SELECT av.source, count(*) AS visits, count(DISTINCT av.visitor_id) AS visitors
    FROM public.acquisition_visits av
    WHERE av.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 3650)))
    GROUP BY av.source
  ), m AS (
    SELECT ma.source, count(*) AS members,
      count(fp.user_id) AS founders,
      count(fp.user_id) FILTER (WHERE coalesce(trim(fp.venture_name), '') <> '') AS ventures
    FROM public.member_attributions ma
    LEFT JOIN public.founder_profiles fp ON fp.user_id = ma.user_id
    WHERE ma.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 3650)))
    GROUP BY ma.source
  )
  SELECT coalesce(v.source, m.source), coalesce(v.visits, 0), coalesce(v.visitors, 0),
         coalesce(m.members, 0), coalesce(m.founders, 0), coalesce(m.ventures, 0)
  FROM v FULL OUTER JOIN m ON m.source = v.source
  ORDER BY 2 DESC, 4 DESC;
END; $$;
REVOKE ALL ON FUNCTION public.get_acquisition_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_acquisition_overview(integer) TO authenticated;