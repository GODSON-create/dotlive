CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND NOT p.suspended
  )
$$;
REVOKE ALL ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Founder profiles viewable by authenticated" ON public.founder_profiles;
CREATE POLICY "Founder profiles viewable by active members" ON public.founder_profiles
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "Builder profiles viewable by authenticated" ON public.builder_profiles;
CREATE POLICY "Builder profiles viewable by active members" ON public.builder_profiles
  FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));

-- Suspended members must not be able to lift their own suspension or verify themselves (already enforced by trigger);
-- owners keep reading their own rows via the existing "manage own" policies.