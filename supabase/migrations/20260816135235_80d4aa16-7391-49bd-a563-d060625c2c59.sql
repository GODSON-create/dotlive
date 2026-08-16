
-- ========== PROGRAMS ==========
CREATE TABLE public.academy_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  thumbnail_url text,
  whop_url text,
  estimated_minutes integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_programs TO authenticated;
GRANT SELECT ON public.academy_programs TO anon;
GRANT ALL ON public.academy_programs TO service_role;
ALTER TABLE public.academy_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published programs are viewable" ON public.academy_programs
  FOR SELECT USING (status = 'published' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage programs" ON public.academy_programs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ========== MODULES ==========
CREATE TABLE public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.academy_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  learning_objective text,
  sort_order integer NOT NULL DEFAULT 0,
  whop_url text,
  whop_course_id text,
  whop_module_id text,
  estimated_minutes integer NOT NULL DEFAULT 15,
  passing_score integer NOT NULL DEFAULT 70,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_modules_program ON public.academy_modules(program_id, sort_order);
GRANT SELECT ON public.academy_modules TO authenticated;
GRANT ALL ON public.academy_modules TO service_role;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active modules are viewable" ON public.academy_modules
  FOR SELECT TO authenticated USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage modules" ON public.academy_modules
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ========== QUESTIONS (answers hidden from learners) ==========
CREATE TABLE public.academy_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  explanation text,
  difficulty text NOT NULL DEFAULT 'standard',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_questions_module ON public.academy_questions(module_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_questions TO authenticated;
GRANT ALL ON public.academy_questions TO service_role;
ALTER TABLE public.academy_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage questions" ON public.academy_questions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ========== ENROLLMENTS ==========
CREATE TABLE public.academy_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.academy_programs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);
GRANT SELECT, INSERT, UPDATE ON public.academy_enrollments TO authenticated;
GRANT ALL ON public.academy_enrollments TO service_role;
ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enrollments" ON public.academy_enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users enroll themselves" ON public.academy_enrollments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own enrollment" ON public.academy_enrollments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== MODULE PROGRESS ==========
CREATE TABLE public.academy_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.academy_programs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  best_score integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);
CREATE INDEX idx_academy_progress_user ON public.academy_module_progress(user_id, program_id);
GRANT SELECT ON public.academy_module_progress TO authenticated;
GRANT ALL ON public.academy_module_progress TO service_role;
ALTER TABLE public.academy_module_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own module progress" ON public.academy_module_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ========== QUIZ ATTEMPTS ==========
CREATE TABLE public.academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.academy_programs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  score integer NOT NULL,
  correct_count integer NOT NULL,
  total_questions integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_attempts_user ON public.academy_quiz_attempts(user_id, module_id);
GRANT SELECT ON public.academy_quiz_attempts TO authenticated;
GRANT ALL ON public.academy_quiz_attempts TO service_role;
ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.academy_quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ========== CERTIFICATES ==========
CREATE TABLE public.academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.academy_programs(id) ON DELETE CASCADE,
  certificate_id text NOT NULL UNIQUE,
  average_score integer NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);
GRANT SELECT ON public.academy_certificates TO authenticated;
GRANT SELECT ON public.academy_certificates TO anon;
GRANT ALL ON public.academy_certificates TO service_role;
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certificates are publicly verifiable" ON public.academy_certificates
  FOR SELECT USING (true);

-- ========== TRIGGERS ==========
CREATE TRIGGER trg_academy_programs_updated BEFORE UPDATE ON public.academy_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_academy_modules_updated BEFORE UPDATE ON public.academy_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_academy_questions_updated BEFORE UPDATE ON public.academy_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_academy_enrollments_updated BEFORE UPDATE ON public.academy_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_academy_progress_updated BEFORE UPDATE ON public.academy_module_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== QUIZ DELIVERY (no correct answers) ==========
CREATE OR REPLACE FUNCTION public.get_module_quiz(_module_id uuid)
RETURNS TABLE(id uuid, question text, question_type text, options jsonb, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.question, q.question_type, q.options, q.sort_order
  FROM public.academy_questions q
  JOIN public.academy_modules m ON m.id = q.module_id
  WHERE q.module_id = _module_id AND m.is_active AND auth.uid() IS NOT NULL
  ORDER BY q.sort_order, q.created_at
$$;

-- ========== MODULE UNLOCK CHECK ==========
CREATE OR REPLACE FUNCTION public.academy_module_unlocked(_user_id uuid, _module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.academy_modules m
    JOIN public.academy_modules prev
      ON prev.program_id = m.program_id
     AND prev.sort_order < m.sort_order
     AND prev.is_active
    WHERE m.id = _module_id
      AND NOT EXISTS (
        SELECT 1 FROM public.academy_module_progress p
        WHERE p.user_id = _user_id AND p.module_id = prev.id AND p.status = 'completed'
      )
  )
$$;

-- ========== SUBMIT QUIZ ==========
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_module_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _module public.academy_modules%ROWTYPE;
  _total int;
  _correct int := 0;
  _score int;
  _passed boolean;
  _attempt int;
  _results jsonb := '[]'::jsonb;
  _q record;
  _given text;
  _ok boolean;
  _modules_total int;
  _modules_done int;
  _cert text;
  _avg int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _module FROM public.academy_modules WHERE id = _module_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Module not found'; END IF;

  IF NOT public.academy_module_unlocked(_uid, _module_id) THEN
    RAISE EXCEPTION 'Complete the previous module first';
  END IF;

  SELECT count(*) INTO _total FROM public.academy_questions WHERE module_id = _module_id;
  IF _total = 0 THEN RAISE EXCEPTION 'This module has no quiz questions yet'; END IF;

  FOR _q IN
    SELECT id, correct_answer, explanation FROM public.academy_questions
    WHERE module_id = _module_id ORDER BY sort_order, created_at
  LOOP
    _given := _answers ->> _q.id::text;
    _ok := _given IS NOT NULL AND lower(trim(_given)) = lower(trim(_q.correct_answer));
    IF _ok THEN _correct := _correct + 1; END IF;
    _results := _results || jsonb_build_object(
      'question_id', _q.id,
      'correct', _ok,
      'correct_answer', _q.correct_answer,
      'explanation', _q.explanation
    );
  END LOOP;

  _score := round((_correct::numeric / _total::numeric) * 100);
  _passed := _score >= _module.passing_score;

  INSERT INTO public.academy_enrollments (user_id, program_id)
  VALUES (_uid, _module.program_id)
  ON CONFLICT (user_id, program_id) DO NOTHING;

  SELECT coalesce(max(attempt_number), 0) + 1 INTO _attempt
  FROM public.academy_quiz_attempts WHERE user_id = _uid AND module_id = _module_id;

  INSERT INTO public.academy_quiz_attempts
    (user_id, module_id, program_id, attempt_number, score, correct_count, total_questions, passed, answers)
  VALUES (_uid, _module_id, _module.program_id, _attempt, _score, _correct, _total, _passed, _answers);

  INSERT INTO public.academy_module_progress (user_id, module_id, program_id, status, best_score, attempts, completed_at)
  VALUES (_uid, _module_id, _module.program_id,
          CASE WHEN _passed THEN 'completed' ELSE 'in_progress' END,
          _score, 1, CASE WHEN _passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    attempts = public.academy_module_progress.attempts + 1,
    best_score = greatest(public.academy_module_progress.best_score, excluded.best_score),
    status = CASE WHEN public.academy_module_progress.status = 'completed' OR _passed THEN 'completed' ELSE 'in_progress' END,
    completed_at = coalesce(public.academy_module_progress.completed_at, CASE WHEN _passed THEN now() ELSE NULL END),
    updated_at = now();

  -- program completion + certificate
  SELECT count(*) INTO _modules_total FROM public.academy_modules WHERE program_id = _module.program_id AND is_active;
  SELECT count(*) INTO _modules_done FROM public.academy_module_progress p
    JOIN public.academy_modules m ON m.id = p.module_id AND m.is_active
    WHERE p.user_id = _uid AND p.program_id = _module.program_id AND p.status = 'completed';

  IF _modules_done >= _modules_total AND _modules_total > 0 THEN
    SELECT coalesce(round(avg(best_score)), 0) INTO _avg FROM public.academy_module_progress
      WHERE user_id = _uid AND program_id = _module.program_id;
    UPDATE public.academy_enrollments SET status = 'completed', completed_at = coalesce(completed_at, now())
      WHERE user_id = _uid AND program_id = _module.program_id;
    SELECT 'DOT-' || upper(p.code) || '-' || upper(substr(md5(_uid::text || p.id::text), 1, 6))
      INTO _cert FROM public.academy_programs p WHERE p.id = _module.program_id;
    INSERT INTO public.academy_certificates (user_id, program_id, certificate_id, average_score)
    VALUES (_uid, _module.program_id, _cert, _avg)
    ON CONFLICT (user_id, program_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'score', _score, 'passed', _passed, 'correct', _correct, 'total', _total,
    'attempt', _attempt, 'passing_score', _module.passing_score,
    'results', _results,
    'program_completed', (_modules_done >= _modules_total AND _modules_total > 0)
  );
END;
$$;

-- ========== COMMUNITY LEADER ANALYTICS ==========
CREATE OR REPLACE FUNCTION public.get_community_academy_stats(_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _community uuid;
  _total int; _modules int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO _community FROM public.communities WHERE leader_id = _uid LIMIT 1;
  IF _community IS NULL THEN RETURN jsonb_build_object('has_community', false); END IF;

  SELECT count(*) INTO _total FROM public.community_members WHERE community_id = _community AND status = 'approved';
  SELECT count(*) INTO _modules FROM public.academy_modules WHERE program_id = _program_id AND is_active;

  RETURN (
    WITH members AS (
      SELECT cm.founder_id FROM public.community_members cm
      WHERE cm.community_id = _community AND cm.status = 'approved'
    ), stats AS (
      SELECT m.founder_id,
        coalesce(pr.name, 'Founder') AS name,
        count(p.id) FILTER (WHERE p.status = 'completed') AS done,
        coalesce(round(avg(p.best_score)), 0) AS avg_score,
        bool_or(true) FILTER (WHERE p.id IS NOT NULL) AS started
      FROM members m
      LEFT JOIN public.academy_module_progress p ON p.user_id = m.founder_id AND p.program_id = _program_id
      LEFT JOIN public.profiles pr ON pr.id = m.founder_id
      GROUP BY m.founder_id, pr.name
    )
    SELECT jsonb_build_object(
      'has_community', true,
      'members', _total,
      'modules', _modules,
      'started', count(*) FILTER (WHERE started),
      'completed', count(*) FILTER (WHERE _modules > 0 AND done >= _modules),
      'avg_score', coalesce(round(avg(avg_score) FILTER (WHERE started)), 0),
      'rows', coalesce(jsonb_agg(jsonb_build_object(
          'name', name,
          'progress', CASE WHEN _modules > 0 THEN round(done::numeric * 100 / _modules) ELSE 0 END,
          'score', avg_score,
          'status', CASE WHEN _modules > 0 AND done >= _modules THEN 'Completed'
                         WHEN started AND avg_score < 70 THEN 'Needs attention'
                         WHEN started THEN 'Active' ELSE 'Not started' END
        ) ORDER BY done DESC), '[]'::jsonb)
    ) FROM stats
  );
END;
$$;

-- ========== ADMIN ANALYTICS ==========
CREATE OR REPLACE FUNCTION public.get_academy_analytics(_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN jsonb_build_object(
    'learners', (SELECT count(*) FROM public.academy_enrollments WHERE program_id = _program_id),
    'active_learners', (SELECT count(DISTINCT user_id) FROM public.academy_quiz_attempts
                         WHERE program_id = _program_id AND attempted_at > now() - interval '30 days'),
    'attempts', (SELECT count(*) FROM public.academy_quiz_attempts WHERE program_id = _program_id),
    'failed_attempts', (SELECT count(*) FROM public.academy_quiz_attempts WHERE program_id = _program_id AND NOT passed),
    'avg_score', (SELECT coalesce(round(avg(score)), 0) FROM public.academy_quiz_attempts WHERE program_id = _program_id),
    'certificates', (SELECT count(*) FROM public.academy_certificates WHERE program_id = _program_id),
    'completion_rate', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE
        round(count(*) FILTER (WHERE status = 'completed')::numeric * 100 / count(*)) END
      FROM public.academy_enrollments WHERE program_id = _program_id),
    'modules', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'module', m.title,
        'completions', (SELECT count(*) FROM public.academy_module_progress p WHERE p.module_id = m.id AND p.status = 'completed'),
        'attempts', (SELECT count(*) FROM public.academy_quiz_attempts a WHERE a.module_id = m.id),
        'avg_score', (SELECT coalesce(round(avg(a.score)), 0) FROM public.academy_quiz_attempts a WHERE a.module_id = m.id),
        'fail_rate', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(count(*) FILTER (WHERE NOT passed)::numeric * 100 / count(*)) END
                      FROM public.academy_quiz_attempts a WHERE a.module_id = m.id)
      ) ORDER BY m.sort_order), '[]'::jsonb) FROM public.academy_modules m WHERE m.program_id = _program_id AND m.is_active)
  );
END;
$$;

-- ========== SEED: LEAPFROG ==========
INSERT INTO public.academy_programs (name, code, description, whop_url, estimated_minutes, sort_order, status)
VALUES ('LEAPFROG', 'LF', 'The flagship DOT program: nine plays that help African founders leapfrog the usual startup grind — from problem validation to fundable traction.', NULL, 270, 1, 'published');

INSERT INTO public.academy_modules (program_id, title, description, learning_objective, sort_order, estimated_minutes)
SELECT p.id, v.title, v.descr, v.obj, v.ord, 30
FROM public.academy_programs p,
(VALUES
  ('Module 1 — Introduction', 'What LEAPFROG is, who it is for, and how the nine plays fit together.', 'Understand the LEAPFROG method and how to apply it to your venture.', 1),
  ('Module 2 — Play 1', 'The first LEAPFROG play.', 'Apply Play 1 to your venture.', 2),
  ('Module 3 — Play 2', 'The second LEAPFROG play.', 'Apply Play 2 to your venture.', 3),
  ('Module 4 — Play 3', 'The third LEAPFROG play.', 'Apply Play 3 to your venture.', 4),
  ('Module 5 — Play 4', 'The fourth LEAPFROG play.', 'Apply Play 4 to your venture.', 5),
  ('Module 6 — Play 5', 'The fifth LEAPFROG play.', 'Apply Play 5 to your venture.', 6),
  ('Module 7 — Play 6', 'The sixth LEAPFROG play.', 'Apply Play 6 to your venture.', 7),
  ('Module 8 — Play 7', 'The seventh LEAPFROG play.', 'Apply Play 7 to your venture.', 8),
  ('Module 9 — Closing', 'Bringing the plays together into a progression plan.', 'Build your post-LEAPFROG execution plan.', 9)
) AS v(title, descr, obj, ord)
WHERE p.code = 'LF';

INSERT INTO public.academy_programs (name, code, description, estimated_minutes, sort_order, status)
VALUES ('AI for Founders', 'AIF', 'Practical AI leverage for early-stage African founders: tooling, workflows, and judgement.', 120, 2, 'draft');
