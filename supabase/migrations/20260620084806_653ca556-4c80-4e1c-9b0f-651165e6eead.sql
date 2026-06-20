-- 1. Event registrations: add INSERT/DELETE policies scoped to the owner
CREATE POLICY "Users register themselves"
  ON public.event_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own registrations"
  ON public.event_registrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Payments: writes are server-side only (service_role via webhook/handler).
-- Remove any direct write privileges from client roles. RLS already lacks
-- write policies, this removes the underlying grants too for defense-in-depth.
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon;

-- 3. Community referral codes: hide referral_code from broad reads via
-- column-level privileges, and provide secure functions for the two
-- legitimate use cases (leader views own code; join lookup by exact code).
REVOKE SELECT ON public.communities FROM authenticated;
GRANT SELECT (id, name, description, category, region, leader_id, created_at, updated_at)
  ON public.communities TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT referral_code
  FROM public.communities
  WHERE leader_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.find_community_by_referral_code(_code text)
RETURNS TABLE(id uuid, name text, description text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.description
  FROM public.communities c
  WHERE c.referral_code = _code
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_community_by_referral_code(text) TO authenticated;