-- ============ Upgrade Profiles Table ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}'::text[];

-- ============ Upgrade Admin Audit Log Table ============
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS before_value TEXT;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS after_value TEXT;

-- ============ Re-define get_founder_rankings to support Community Rank ============
CREATE OR REPLACE FUNCTION public.get_founder_rankings(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _my_vantage integer;
  _my_country text;
  _my_industry text;
  _my_university text;
  _my_community_id uuid;
  _country_rank integer;
  _industry_rank integer;
  _university_rank integer;
  _community_rank integer;
  _total_country integer;
  _total_industry integer;
  _total_university integer;
  _total_community integer;
  _community_name text;
BEGIN
  -- Get user's profile details including community_id
  SELECT vantage_point, country, industry, university, community_id 
  INTO _my_vantage, _my_country, _my_industry, _my_university, _my_community_id
  FROM public.founder_profiles 
  WHERE user_id = _user_id;

  IF _my_vantage IS NULL THEN
    RETURN jsonb_build_object('error', 'Founder profile not found or not initialized');
  END IF;

  -- 1. Country Rank
  IF _my_country IS NOT NULL AND length(trim(_my_country)) > 0 THEN
    SELECT count(*) + 1 INTO _country_rank 
    FROM public.founder_profiles 
    WHERE country = _my_country AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_country 
    FROM public.founder_profiles 
    WHERE country = _my_country;
  ELSE
    _country_rank := NULL;
    _total_country := 0;
  END IF;

  -- 2. Industry Rank
  IF _my_industry IS NOT NULL AND length(trim(_my_industry)) > 0 THEN
    SELECT count(*) + 1 INTO _industry_rank 
    FROM public.founder_profiles 
    WHERE industry = _my_industry AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_industry 
    FROM public.founder_profiles 
    WHERE industry = _my_industry;
  ELSE
    _industry_rank := NULL;
    _total_industry := 0;
  END IF;

  -- 3. University Rank
  IF _my_university IS NOT NULL AND length(trim(_my_university)) > 0 THEN
    SELECT count(*) + 1 INTO _university_rank 
    FROM public.founder_profiles 
    WHERE university = _my_university AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_university 
    FROM public.founder_profiles 
    WHERE university = _my_university;
  ELSE
    _university_rank := NULL;
    _total_university := 0;
  END IF;

  -- 4. Community Rank
  IF _my_community_id IS NOT NULL THEN
    SELECT count(*) + 1 INTO _community_rank 
    FROM public.founder_profiles 
    WHERE community_id = _my_community_id AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_community 
    FROM public.founder_profiles 
    WHERE community_id = _my_community_id;

    SELECT name INTO _community_name
    FROM public.communities
    WHERE id = _my_community_id;
  ELSE
    _community_rank := NULL;
    _total_community := 0;
    _community_name := NULL;
  END IF;

  RETURN jsonb_build_object(
    'country', jsonb_build_object('rank', _country_rank, 'total', _total_country, 'name', _my_country),
    'industry', jsonb_build_object('rank', _industry_rank, 'total', _total_industry, 'name', _my_industry),
    'university', jsonb_build_object('rank', _university_rank, 'total', _total_university, 'name', _my_university),
    'community', jsonb_build_object('rank', _community_rank, 'total', _total_community, 'name', _community_name)
  );
END; $$;
