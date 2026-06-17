
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('founder', 'community_leader', 'investor', 'admin');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users self-assign non-admin role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role <> 'admin');
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COMMUNITIES ============
CREATE TABLE public.communities (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region TEXT,
  category TEXT,
  referral_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Communities viewable by authenticated" ON public.communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leaders create communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leaders update own communities" ON public.communities FOR UPDATE TO authenticated USING (auth.uid() = leader_id) WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leaders delete own communities" ON public.communities FOR DELETE TO authenticated USING (auth.uid() = leader_id);

-- ============ FOUNDER PROFILES ============
CREATE TABLE public.founder_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  venture_name TEXT,
  industry TEXT,
  stage TEXT DEFAULT 'Assess',
  country TEXT,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  bio TEXT,
  website TEXT,
  funding_goal NUMERIC DEFAULT 0,
  logo_url TEXT,
  vantage_point INTEGER DEFAULT 0,
  fundability INTEGER DEFAULT 0,
  investment_readiness INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_profiles TO authenticated;
GRANT ALL ON public.founder_profiles TO service_role;
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder profiles viewable by authenticated" ON public.founder_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage own profile" ON public.founder_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COMMUNITY MEMBERS ============
CREATE TABLE public.community_members (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, founder_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own membership" ON public.community_members FOR SELECT TO authenticated USING (auth.uid() = founder_id);
CREATE POLICY "Leaders view their community members" ON public.community_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.leader_id = auth.uid()));
CREATE POLICY "Founders join communities" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "Founders leave communities" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = founder_id);

-- ============ WALLETS ============
CREATE TABLE public.wallets (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ ASSESSMENTS ============
CREATE TABLE public.assessments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  vantage_point INTEGER NOT NULL DEFAULT 0,
  fundability INTEGER NOT NULL DEFAULT 0,
  investment_readiness INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessments" ON public.assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COURSES (ACADEMY) ============
CREATE TABLE public.courses (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  whop_url TEXT,
  category TEXT,
  dot_reward INTEGER NOT NULL DEFAULT 0,
  vantage_boost INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses viewable by authenticated" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COURSE ENROLLMENTS ============
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled',
  certificate_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own enrollments" ON public.course_enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EVENTS (SESSIONS) ============
CREATE TABLE public.events (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  speaker TEXT,
  event_date TIMESTAMPTZ,
  dot_cost INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage events" ON public.events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ EVENT REGISTRATIONS ============
CREATE TABLE public.event_registrations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own registrations" ON public.event_registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all registrations" ON public.event_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PITCHATHONS ============
CREATE TABLE public.pitchathons (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitchathons TO authenticated;
GRANT ALL ON public.pitchathons TO service_role;
ALTER TABLE public.pitchathons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pitchathons viewable by authenticated" ON public.pitchathons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pitchathons" ON public.pitchathons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PITCHATHON APPLICATIONS ============
CREATE TABLE public.pitchathon_applications (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  pitchathon_id UUID NOT NULL REFERENCES public.pitchathons(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venture_name TEXT,
  pitch_deck_url TEXT,
  funding_ask NUMERIC,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pitchathon_id, founder_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitchathon_applications TO authenticated;
GRANT ALL ON public.pitchathon_applications TO service_role;
ALTER TABLE public.pitchathon_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applications viewable by authenticated" ON public.pitchathon_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founders manage own applications" ON public.pitchathon_applications FOR ALL TO authenticated USING (auth.uid() = founder_id) WITH CHECK (auth.uid() = founder_id);

-- ============ PITCHATHON JUDGES ============
CREATE TABLE public.pitchathon_judges (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  pitchathon_id UUID NOT NULL REFERENCES public.pitchathons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pitchathon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitchathon_judges TO authenticated;
GRANT ALL ON public.pitchathon_judges TO service_role;
ALTER TABLE public.pitchathon_judges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Judges viewable by authenticated" ON public.pitchathon_judges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage judges" ON public.pitchathon_judges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PITCHATHON SCORES ============
CREATE TABLE public.pitchathon_scores (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.pitchathon_applications(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, judge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitchathon_scores TO authenticated;
GRANT ALL ON public.pitchathon_scores TO service_role;
ALTER TABLE public.pitchathon_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scores viewable by authenticated" ON public.pitchathon_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Judges manage own scores" ON public.pitchathon_scores FOR ALL TO authenticated
  USING (auth.uid() = judge_id AND EXISTS (SELECT 1 FROM public.pitchathon_judges j JOIN public.pitchathon_applications a ON a.pitchathon_id = j.pitchathon_id WHERE a.id = application_id AND j.user_id = auth.uid()))
  WITH CHECK (auth.uid() = judge_id AND EXISTS (SELECT 1 FROM public.pitchathon_judges j JOIN public.pitchathon_applications a ON a.pitchathon_id = j.pitchathon_id WHERE a.id = application_id AND j.user_id = auth.uid()));

-- ============ INVESTOR SAVES ============
CREATE TABLE public.investor_saves (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, founder_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_saves TO authenticated;
GRANT ALL ON public.investor_saves TO service_role;
ALTER TABLE public.investor_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investors manage own saves" ON public.investor_saves FOR ALL TO authenticated USING (auth.uid() = investor_id) WITH CHECK (auth.uid() = investor_id);

-- ============ MEETING REQUESTS ============
CREATE TABLE public.meeting_requests (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_requests TO authenticated;
GRANT ALL ON public.meeting_requests TO service_role;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investors view own requests" ON public.meeting_requests FOR SELECT TO authenticated USING (auth.uid() = investor_id);
CREATE POLICY "Founders view requests to them" ON public.meeting_requests FOR SELECT TO authenticated USING (auth.uid() = founder_id);
CREATE POLICY "Investors create requests" ON public.meeting_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = investor_id);
CREATE POLICY "Founders update request status" ON public.meeting_requests FOR UPDATE TO authenticated USING (auth.uid() = founder_id) WITH CHECK (auth.uid() = founder_id);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_founder_profiles_updated BEFORE UPDATE ON public.founder_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CREDIT FUNCTIONS ============
-- Spend DOT (authenticated user spends own credits)
CREATE OR REPLACE FUNCTION public.spend_dot(_amount NUMERIC, _description TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _new_balance NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _uid RETURNING balance INTO _new_balance;
  IF _new_balance < 0 THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;
  INSERT INTO public.transactions (user_id, amount, type, description) VALUES (_uid, -_amount, 'Spend', _description);
  RETURN _new_balance;
END; $$;
GRANT EXECUTE ON FUNCTION public.spend_dot(NUMERIC, TEXT) TO authenticated;

-- Reward DOT to self (system rewards, e.g. course completion)
CREATE OR REPLACE FUNCTION public.reward_dot(_amount NUMERIC, _description TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _new_balance NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _uid RETURNING balance INTO _new_balance;
  INSERT INTO public.transactions (user_id, amount, type, description) VALUES (_uid, _amount, 'Reward', _description);
  RETURN _new_balance;
END; $$;
GRANT EXECUTE ON FUNCTION public.reward_dot(NUMERIC, TEXT) TO authenticated;

-- Admin adjust balance (admin only)
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id UUID, _amount NUMERIC, _type TEXT, _description TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new_balance NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _user_id RETURNING balance INTO _new_balance;
  IF _new_balance < 0 THEN RAISE EXCEPTION 'Balance cannot go negative'; END IF;
  INSERT INTO public.transactions (user_id, amount, type, description) VALUES (_user_id, _amount, COALESCE(_type, 'Admin Adjustment'), _description);
  RETURN _new_balance;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
