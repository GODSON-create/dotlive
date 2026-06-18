-- Remove the over-broad policies
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users self-assign non-admin role" ON public.user_roles;

-- Users may self-assign only non-privileged roles
CREATE POLICY "Users self-assign basic role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('founder', 'community_leader', 'investor')
);

-- Admins may manage only non-privileged roles directly.
-- admin / super_admin changes must go through the audited SECURITY DEFINER functions.
CREATE POLICY "Admins manage basic roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role IN ('founder', 'community_leader', 'investor')
);

CREATE POLICY "Admins update basic roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND role IN ('founder', 'community_leader', 'investor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND role IN ('founder', 'community_leader', 'investor'));

CREATE POLICY "Admins delete basic roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND role IN ('founder', 'community_leader', 'investor'));
