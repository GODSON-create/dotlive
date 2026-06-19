-- Self-assign: add builder, vendor, capital_partner to the allowed set
DROP POLICY IF EXISTS "Users self-assign basic role" ON public.user_roles;
CREATE POLICY "Users self-assign basic role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = ANY (ARRAY['founder','community_leader','investor','builder','vendor','capital_partner']::app_role[])
  );

-- Admins insert basic roles
DROP POLICY IF EXISTS "Admins manage basic roles" ON public.user_roles;
CREATE POLICY "Admins manage basic roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['founder','community_leader','investor','builder','vendor','capital_partner']::app_role[])
  );

-- Admins update basic roles
DROP POLICY IF EXISTS "Admins update basic roles" ON public.user_roles;
CREATE POLICY "Admins update basic roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['founder','community_leader','investor','builder','vendor','capital_partner']::app_role[])
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['founder','community_leader','investor','builder','vendor','capital_partner']::app_role[])
  );

-- Admins delete basic roles
DROP POLICY IF EXISTS "Admins delete basic roles" ON public.user_roles;
CREATE POLICY "Admins delete basic roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['founder','community_leader','investor','builder','vendor','capital_partner']::app_role[])
  );