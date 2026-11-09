ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS community_type text NOT NULL DEFAULT 'interest',
  ADD COLUMN IF NOT EXISTS university_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

UPDATE public.communities SET community_type = lower(category)
WHERE lower(coalesce(category,'')) IN ('university','city','industry','interest','builder');

ALTER TABLE public.communities
  ADD CONSTRAINT communities_type_check CHECK (community_type IN ('university','city','industry','interest','builder')),
  ADD CONSTRAINT communities_visibility_check CHECK (visibility IN ('public','invite_only'));

CREATE INDEX IF NOT EXISTS communities_type_idx ON public.communities (community_type);
CREATE INDEX IF NOT EXISTS communities_name_lower_idx ON public.communities (lower(name));
CREATE INDEX IF NOT EXISTS community_members_founder_idx ON public.community_members (founder_id);

-- Referral codes: hide from direct reads; leaders use get_my_referral_code()
REVOKE SELECT ON public.communities FROM authenticated, anon;
GRANT SELECT (id, name, description, leader_id, region, category, created_at, updated_at,
  community_type, university_name, city, country, visibility) ON public.communities TO authenticated;

-- Membership writes go through RPCs only
DROP POLICY IF EXISTS "Founders join communities" ON public.community_members;

CREATE OR REPLACE FUNCTION public.list_communities(_q text DEFAULT NULL, _type text DEFAULT NULL, _region text DEFAULT NULL, _limit int DEFAULT 60, _offset int DEFAULT 0)
RETURNS TABLE(id uuid, name text, description text, community_type text, region text, city text, country text,
  university_name text, visibility text, member_count bigint, is_member boolean, is_leader boolean, leader_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.description, c.community_type, c.region, c.city, c.country, c.university_name, c.visibility,
    (SELECT count(*) FROM public.community_members m WHERE m.community_id = c.id AND m.status = 'active'),
    EXISTS (SELECT 1 FROM public.community_members m WHERE m.community_id = c.id AND m.founder_id = auth.uid()),
    c.leader_id = auth.uid(),
    (SELECT p.name FROM public.profiles p WHERE p.id = c.leader_id),
    c.created_at
  FROM public.communities c
  WHERE public.is_active_member(auth.uid())
    AND (_type IS NULL OR c.community_type = _type)
    AND (_q IS NULL OR _q = '' OR c.name ILIKE '%' || _q || '%' OR c.university_name ILIKE '%' || _q || '%' OR c.description ILIKE '%' || _q || '%')
    AND (_region IS NULL OR _region = '' OR c.region ILIKE '%' || _region || '%' OR c.city ILIKE '%' || _region || '%' OR c.country ILIKE '%' || _region || '%')
  ORDER BY c.created_at DESC
  LIMIT least(greatest(_limit,1),100) OFFSET greatest(_offset,0)
$$;

CREATE OR REPLACE FUNCTION public.join_community(_community_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vis text;
BEGIN
  IF NOT public.is_active_member(auth.uid()) THEN RAISE EXCEPTION 'An active DOT account is required'; END IF;
  SELECT visibility INTO _vis FROM public.communities WHERE id = _community_id;
  IF _vis IS NULL THEN RAISE EXCEPTION 'Community not found'; END IF;
  IF _vis <> 'public' THEN RAISE EXCEPTION 'This community is invite only'; END IF;
  INSERT INTO public.community_members (community_id, founder_id, status)
  VALUES (_community_id, auth.uid(), 'active') ON CONFLICT (community_id, founder_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.join_community_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_active_member(auth.uid()) THEN RAISE EXCEPTION 'An active DOT account is required'; END IF;
  SELECT id INTO _id FROM public.communities WHERE referral_code = _code;
  IF _id IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.community_members (community_id, founder_id, status)
  VALUES (_id, auth.uid(), 'active') ON CONFLICT (community_id, founder_id) DO NOTHING;
  -- referral attribution: set primary community only if not set
  UPDATE public.founder_profiles SET community_id = _id WHERE user_id = auth.uid() AND community_id IS NULL;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.leave_community(_community_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  DELETE FROM public.community_members WHERE community_id = _community_id AND founder_id = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.list_communities(text,text,text,int,int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_community(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_community_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_community(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_communities(text,text,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_community(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_community_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_community(uuid) TO authenticated;