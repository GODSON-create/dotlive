-- Immutable role audit log
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  previous_role TEXT,
  new_role TEXT NOT NULL,
  action TEXT NOT NULL,
  assigned_by UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.role_audit_log TO authenticated;
GRANT ALL ON public.role_audit_log TO service_role;

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins read. No write policies => immutable via Data API.
-- Writes happen only through SECURITY DEFINER functions (owned by postgres, bypass RLS).
CREATE POLICY "Super admins can read audit log"
ON public.role_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Elevate a user to an admin role (admin or super_admin)
CREATE OR REPLACE FUNCTION public.elevate_user_to_admin(
  _target_user_id UUID,
  _new_role app_role DEFAULT 'super_admin',
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller UUID := auth.uid();
  _prev TEXT;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(_caller, 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can elevate users';
  END IF;
  IF _caller = _target_user_id THEN
    RAISE EXCEPTION 'Self-assignment is not allowed';
  END IF;
  IF _new_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid admin role';
  END IF;

  SELECT string_agg(role::text, ',' ORDER BY role::text)
    INTO _prev FROM public.user_roles WHERE user_id = _target_user_id;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _new_role)
    ON CONFLICT (user_id, role) DO NOTHING;

  -- Super admins also get standard admin access so existing admin UI works.
  IF _new_role = 'super_admin' THEN
    INSERT INTO public.user_roles (user_id, role)
      VALUES (_target_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.role_audit_log (target_user_id, previous_role, new_role, action, assigned_by, reason)
    VALUES (_target_user_id, _prev, _new_role::text, 'granted', _caller, _reason);
END;
$$;

-- Revoke an admin role from a user
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  _target_user_id UUID,
  _role app_role DEFAULT 'admin',
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller UUID := auth.uid();
  _prev TEXT;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(_caller, 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can revoke roles';
  END IF;
  IF _caller = _target_user_id THEN
    RAISE EXCEPTION 'You cannot revoke your own role';
  END IF;
  IF _role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid admin role';
  END IF;

  SELECT string_agg(role::text, ',' ORDER BY role::text)
    INTO _prev FROM public.user_roles WHERE user_id = _target_user_id;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;

  INSERT INTO public.role_audit_log (target_user_id, previous_role, new_role, action, assigned_by, reason)
    VALUES (_target_user_id, _prev, _role::text, 'revoked', _caller, _reason);
END;
$$;

-- One-time bootstrap: assign the first super admin by email. Backend-only.
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    RAISE EXCEPTION 'A super admin already exists';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE email = lower(_email);
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', _email;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.role_audit_log (target_user_id, previous_role, new_role, action, assigned_by, reason)
    VALUES (_uid, NULL, 'super_admin', 'bootstrap', _uid, 'Initial super admin bootstrap');

  RETURN _uid;
END;
$$;

-- Lock down the bootstrap function: backend (service_role) only, never callable from the client.
REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin(TEXT) TO service_role;

-- elevate/revoke are guarded internally (super_admin check) but only need authenticated.
REVOKE EXECUTE ON FUNCTION public.elevate_user_to_admin(UUID, app_role, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_role(UUID, app_role, TEXT) FROM anon;
