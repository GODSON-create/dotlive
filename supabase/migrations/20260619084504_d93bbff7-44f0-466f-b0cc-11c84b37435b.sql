-- =====================================================================
-- 1. PROFILES: restrict email/phone exposure
-- =====================================================================
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 2. PITCHATHON APPLICATIONS: restrict to owner / judges / admins
-- =====================================================================
DROP POLICY IF EXISTS "Applications viewable by authenticated" ON public.pitchathon_applications;

CREATE POLICY "Founders view own applications"
  ON public.pitchathon_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = founder_id);

CREATE POLICY "Judges view assigned applications"
  ON public.pitchathon_applications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pitchathon_judges j
    WHERE j.pitchathon_id = pitchathon_applications.pitchathon_id
      AND j.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all applications"
  ON public.pitchathon_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 3. PITCHATHON SCORES: restrict to judge / founder / admins
-- =====================================================================
DROP POLICY IF EXISTS "Scores viewable by authenticated" ON public.pitchathon_scores;

CREATE POLICY "Judges view own scores"
  ON public.pitchathon_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = judge_id);

CREATE POLICY "Founders view scores on their applications"
  ON public.pitchathon_scores FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pitchathon_applications a
    WHERE a.id = pitchathon_scores.application_id
      AND a.founder_id = auth.uid()
  ));

CREATE POLICY "Admins view all scores"
  ON public.pitchathon_scores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 4. SAFE PUBLIC LEADERBOARD (venture name + avg score only)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_pitchathon_leaderboard(_pitchathon_id uuid)
RETURNS TABLE (application_id uuid, venture_name text, avg_score numeric, score_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.venture_name,
         COALESCE(avg(s.score), 0)::numeric AS avg_score,
         count(s.id) AS score_count
  FROM public.pitchathon_applications a
  LEFT JOIN public.pitchathon_scores s ON s.application_id = a.id
  WHERE a.pitchathon_id = _pitchathon_id
  GROUP BY a.id, a.venture_name
$$;
REVOKE ALL ON FUNCTION public.get_pitchathon_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pitchathon_leaderboard(uuid) TO authenticated;

-- =====================================================================
-- 5. DOCUMENTS BUCKET: read only own folder (+ admins)
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;

CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================================
-- 6. WALLET INTEGRITY: lock down deposit_dot (no self-funding)
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.deposit_dot(numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_dot(numeric, text) TO service_role;

-- =====================================================================
-- 7. COURSE REWARDS: server-verified, idempotent reward path
-- =====================================================================
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS rewarded_at timestamp with time zone;

-- Block direct self-rewarding
REVOKE EXECUTE ON FUNCTION public.reward_dot(numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reward_dot(numeric, text) TO service_role;

-- Idempotent reward claim, callable only by trusted server (service role)
CREATE OR REPLACE FUNCTION public.claim_course_reward(_user_id uuid, _course_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _enr public.course_enrollments%ROWTYPE;
  _reward integer;
  _new_balance numeric;
BEGIN
  SELECT * INTO _enr
  FROM public.course_enrollments
  WHERE user_id = _user_id AND course_id = _course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No enrollment found for this course';
  END IF;

  -- Mark completed (server-verified completion)
  IF _enr.status <> 'completed' THEN
    UPDATE public.course_enrollments
    SET status = 'completed', completed_at = now()
    WHERE id = _enr.id;
  END IF;

  -- Idempotency: only reward once
  IF _enr.rewarded_at IS NOT NULL THEN
    RETURN COALESCE((SELECT balance FROM public.wallets WHERE user_id = _user_id), 0);
  END IF;

  SELECT dot_reward INTO _reward FROM public.courses WHERE id = _course_id;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF COALESCE(_reward, 0) > 0 THEN
    UPDATE public.wallets
    SET balance = balance + _reward
    WHERE user_id = _user_id
    RETURNING balance INTO _new_balance;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_user_id, _reward, 'Academy Reward', 'Course completion reward');
  END IF;

  UPDATE public.course_enrollments
  SET rewarded_at = now()
  WHERE id = _enr.id;

  RETURN COALESCE(_new_balance, (SELECT balance FROM public.wallets WHERE user_id = _user_id), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_course_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_course_reward(uuid, uuid) TO service_role;

-- =====================================================================
-- 8. Lock anon out of privileged SECURITY DEFINER functions
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.spend_dot(numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.elevate_user_to_admin(uuid, app_role, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_role(uuid, app_role, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin(text) TO service_role;