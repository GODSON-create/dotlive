-- Migration to update lookup_dot_id to return coalesced name, email, or dot_id to handle users who haven't completed onboarding.
CREATE OR REPLACE FUNCTION public.lookup_dot_id(_dot_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(name, email, dot_id)
  FROM public.profiles
  WHERE upper(dot_id) = upper(trim(_dot_id))
  LIMIT 1
$$;
