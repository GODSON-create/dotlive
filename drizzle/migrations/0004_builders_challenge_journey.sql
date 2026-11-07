CREATE TABLE public.challenge_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 registration_enabled boolean NOT NULL DEFAULT false,
 standard_price_usd numeric NOT NULL DEFAULT 20 CHECK (standard_price_usd > 0),
 sponsored_contribution_usd numeric NOT NULL DEFAULT 2 CHECK (sponsored_contribution_usd > 0 AND sponsored_contribution_usd <= standard_price_usd),
 duration_days integer NOT NULL DEFAULT 90 CHECK (duration_days BETWEEN 1 AND 366),
 start_rule text NOT NULL DEFAULT 'confirmed_individual' CHECK (start_rule = 'confirmed_individual'),
 benefit_catalogue_visible boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
GRANT SELECT ON public.challenge_settings TO authenticated;
GRANT ALL ON public.challenge_settings TO service_role;
ALTER TABLE public.challenge_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_settings_read ON public.challenge_settings FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));

CREATE TABLE public.challenge_enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), participant_id uuid NOT NULL REFERENCES public.profiles(id),
 pass_type text NOT NULL CHECK (pass_type IN ('standard','sponsored')),
 contribution_usd numeric NOT NULL CHECK (contribution_usd > 0), programme_price_usd numeric NOT NULL CHECK (programme_price_usd >= contribution_usd),
 duration_days integer NOT NULL DEFAULT 90 CHECK (duration_days BETWEEN 1 AND 366),
 payment_state text NOT NULL DEFAULT 'pending' CHECK (payment_state IN ('pending','confirmed','failed')),
 sponsorship_state text NOT NULL DEFAULT 'not_required' CHECK (sponsorship_state IN ('not_required','requested','confirmed','rejected')),
 status text NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation','active','completed','rejected','cancelled')),
 community_id uuid REFERENCES public.communities(id), region text,
 source text NOT NULL DEFAULT 'dot', campaign text, ref_code text, foundry_slug text,
 payment_reference text UNIQUE, sponsorship_reference text,
 eligibility_confirmed_at timestamptz, confirmed_at timestamptz, start_at timestamptz, end_at timestamptz,
 onboarding_completed_at timestamptz, ping_profile_url text,
 credit_state text NOT NULL DEFAULT 'not_issued' CHECK (credit_state IN ('not_issued','confirmed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), reviewed_by uuid, review_note text,
 CHECK ((status NOT IN ('active','completed')) OR (payment_state = 'confirmed' AND (pass_type='standard' OR sponsorship_state='confirmed') AND eligibility_confirmed_at IS NOT NULL AND confirmed_at IS NOT NULL AND start_at IS NOT NULL AND end_at IS NOT NULL)),
 CHECK (end_at IS NULL OR (start_at IS NOT NULL AND end_at = start_at + duration_days * interval '1 day')),
 CHECK (ping_profile_url IS NULL OR ping_profile_url ~ '^https://[^[:space:]]+$')
);
GRANT SELECT ON public.challenge_enrollments TO authenticated;
GRANT ALL ON public.challenge_enrollments TO service_role;
ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX challenge_one_open_enrollment ON public.challenge_enrollments(participant_id) WHERE status IN ('pending_confirmation','active');
CREATE INDEX challenge_community_status ON public.challenge_enrollments(community_id,status);

CREATE FUNCTION public.challenge_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.is_active_member(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
$$;
REVOKE ALL ON FUNCTION public.challenge_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.challenge_is_admin() TO authenticated,service_role;
CREATE FUNCTION public.challenge_can_read(_enrollment uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.is_active_member(auth.uid()) AND EXISTS (
 SELECT 1 FROM public.challenge_enrollments e WHERE e.id=_enrollment AND (
 e.participant_id=auth.uid() OR public.challenge_is_admin() OR (
 public.has_role(auth.uid(),'community_leader') AND EXISTS(SELECT 1 FROM public.communities c WHERE c.id=e.community_id AND c.leader_id=auth.uid())
 )));
$$;
REVOKE ALL ON FUNCTION public.challenge_can_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.challenge_can_read(uuid) TO authenticated,service_role;
CREATE POLICY challenge_enrollment_read ON public.challenge_enrollments FOR SELECT TO authenticated USING (public.challenge_can_read(id));

CREATE TABLE public.challenge_milestones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES public.challenge_enrollments(id),
 milestone_key text NOT NULL CHECK (milestone_key IN ('onboarding','baseline','learning','progress','review','pitch','completion')),
 evidence_url text CHECK (evidence_url IS NULL OR evidence_url ~ '^https://[^[:space:]]+$'),
 participant_note text, submitted_at timestamptz NOT NULL DEFAULT now(),
 review_state text NOT NULL DEFAULT 'submitted' CHECK (review_state IN ('submitted','accepted','changes_requested')),
 reviewed_at timestamptz, reviewed_by uuid, review_note text,
 UNIQUE(enrollment_id,milestone_key)
);
GRANT SELECT ON public.challenge_milestones TO authenticated;
GRANT ALL ON public.challenge_milestones TO service_role;
ALTER TABLE public.challenge_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_milestone_read ON public.challenge_milestones FOR SELECT TO authenticated USING (public.challenge_can_read(enrollment_id));

CREATE TABLE public.challenge_checkins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES public.challenge_enrollments(id),
 week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 53),
 progress_note text NOT NULL CHECK (length(progress_note) BETWEEN 1 AND 4000),
 evidence_url text CHECK (evidence_url IS NULL OR evidence_url ~ '^https://[^[:space:]]+$'),
 ping_update_url text CHECK (ping_update_url IS NULL OR ping_update_url ~ '^https://[^[:space:]]+$'),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(enrollment_id,week_number)
);
GRANT SELECT ON public.challenge_checkins TO authenticated;
GRANT ALL ON public.challenge_checkins TO service_role;
ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_checkin_read ON public.challenge_checkins FOR SELECT TO authenticated USING (public.challenge_can_read(enrollment_id));

CREATE TABLE public.challenge_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid REFERENCES public.challenge_enrollments(id), actor_id uuid,
 action text NOT NULL, before_value jsonb, after_value jsonb, reason text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenge_audit TO authenticated;
GRANT ALL ON public.challenge_audit TO service_role;
ALTER TABLE public.challenge_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_audit_read ON public.challenge_audit FOR SELECT TO authenticated USING (public.challenge_is_admin() OR (enrollment_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.challenge_enrollments e WHERE e.id=enrollment_id AND e.participant_id=auth.uid())));
CREATE FUNCTION public.challenge_audit_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Challenge audit entries are append-only'; END; $$;
CREATE TRIGGER challenge_audit_immutable BEFORE UPDATE OR DELETE ON public.challenge_audit FOR EACH ROW EXECUTE FUNCTION public.challenge_audit_immutable();

CREATE FUNCTION public.request_challenge_enrollment(_pass_type text, _community_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.challenge_settings%ROWTYPE; e public.challenge_enrollments%ROWTYPE; a public.member_attributions%ROWTYPE; r text;
BEGIN
 IF NOT public.is_active_member(auth.uid()) THEN RAISE EXCEPTION 'Active DOT membership required'; END IF;
 SELECT * INTO s FROM public.challenge_settings WHERE id=true;
 IF NOT coalesce(s.registration_enabled,false) THEN RAISE EXCEPTION 'Registration is not open yet'; END IF;
 IF _pass_type NOT IN ('standard','sponsored') OR _pass_type IS NULL THEN RAISE EXCEPTION 'Invalid pass type'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 SELECT * INTO e FROM public.challenge_enrollments WHERE participant_id=auth.uid() AND status IN ('pending_confirmation','active');
 IF FOUND THEN RETURN e.id; END IF;
 IF _community_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.community_members WHERE community_id=_community_id AND founder_id=auth.uid()) THEN RAISE EXCEPTION 'Choose a community you belong to'; END IF;
 SELECT region INTO r FROM public.communities WHERE id=_community_id;
 SELECT * INTO a FROM public.member_attributions WHERE user_id=auth.uid();
 INSERT INTO public.challenge_enrollments(participant_id,pass_type,contribution_usd,programme_price_usd,duration_days,sponsorship_state,community_id,region,source,campaign,ref_code,foundry_slug)
 VALUES(auth.uid(),_pass_type,CASE WHEN _pass_type='standard' THEN s.standard_price_usd ELSE s.sponsored_contribution_usd END,s.standard_price_usd,s.duration_days,CASE WHEN _pass_type='sponsored' THEN 'requested' ELSE 'not_required' END,_community_id,r,coalesce(a.source,'dot'),a.campaign,a.ref_code,a.foundry_slug) RETURNING * INTO e;
 INSERT INTO public.challenge_audit(enrollment_id,actor_id,action,after_value) VALUES(e.id,auth.uid(),'enrollment_requested',to_jsonb(e));
 RETURN e.id;
END; $$;
REVOKE ALL ON FUNCTION public.request_challenge_enrollment(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_challenge_enrollment(text,uuid) TO authenticated;

CREATE FUNCTION public.configure_challenge(_registration boolean,_standard numeric,_sponsored numeric,_duration integer,_catalogue boolean,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b jsonb; a jsonb;
BEGIN
 IF NOT public.challenge_is_admin() THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
 IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
 PERFORM pg_advisory_xact_lock(740091);
 SELECT to_jsonb(s) INTO b FROM public.challenge_settings s WHERE id=true;
 INSERT INTO public.challenge_settings(id,registration_enabled,standard_price_usd,sponsored_contribution_usd,duration_days,benefit_catalogue_visible,updated_by)
 VALUES(true,_registration,_standard,_sponsored,_duration,_catalogue,auth.uid())
 ON CONFLICT(id) DO UPDATE SET registration_enabled=excluded.registration_enabled,standard_price_usd=excluded.standard_price_usd,sponsored_contribution_usd=excluded.sponsored_contribution_usd,duration_days=excluded.duration_days,benefit_catalogue_visible=excluded.benefit_catalogue_visible,updated_at=now(),updated_by=auth.uid();
 SELECT to_jsonb(s) INTO a FROM public.challenge_settings s WHERE id=true;
 INSERT INTO public.challenge_audit(actor_id,action,before_value,after_value,reason) VALUES(auth.uid(),'settings_changed',b,a,_reason);
END; $$;
REVOKE ALL ON FUNCTION public.configure_challenge(boolean,numeric,numeric,integer,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.configure_challenge(boolean,numeric,numeric,integer,boolean,text) TO authenticated;

CREATE FUNCTION public.challenge_transition(_id uuid,_action text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.challenge_enrollments%ROWTYPE; b jsonb;
BEGIN
 SELECT * INTO e FROM public.challenge_enrollments WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT public.is_active_member(auth.uid()) THEN RAISE EXCEPTION 'Enrollment unavailable'; END IF;
 b=to_jsonb(e);
 IF _action='cancel' THEN
 IF e.participant_id<>auth.uid() OR e.status<>'pending_confirmation' THEN RAISE EXCEPTION 'Only your pending enrollment can be cancelled'; END IF;
 UPDATE public.challenge_enrollments SET status='cancelled',updated_at=now() WHERE id=_id;
 ELSIF _action='reject' THEN
 IF NOT public.challenge_is_admin() OR e.status<>'pending_confirmation' THEN RAISE EXCEPTION 'Admin authorization and pending enrollment required'; END IF;
 IF length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
 UPDATE public.challenge_enrollments SET status='rejected',reviewed_by=auth.uid(),review_note=_reason,updated_at=now() WHERE id=_id;
 ELSIF _action='complete' THEN
 IF NOT public.challenge_is_admin() OR e.status<>'active' OR now()<e.end_at THEN RAISE EXCEPTION 'An ended active journey and admin review are required'; END IF;
 IF length(trim(coalesce(_reason,'')))<3 OR (SELECT count(*) FROM public.challenge_milestones WHERE enrollment_id=_id AND review_state='accepted')<>7 THEN RAISE EXCEPTION 'All milestones and review reason required'; END IF;
 UPDATE public.challenge_enrollments SET status='completed',reviewed_by=auth.uid(),review_note=_reason,updated_at=now() WHERE id=_id;
 ELSE
 RAISE EXCEPTION 'Payment confirmation and activation are disabled until payment and credit readiness are verified';
 END IF;
 SELECT * INTO e FROM public.challenge_enrollments WHERE id=_id;
 INSERT INTO public.challenge_audit(enrollment_id,actor_id,action,before_value,after_value,reason) VALUES(_id,auth.uid(),_action,b,to_jsonb(e),_reason);
END; $$;
REVOKE ALL ON FUNCTION public.challenge_transition(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.challenge_transition(uuid,text,text) TO authenticated;

CREATE FUNCTION public.save_challenge_progress(_id uuid,_kind text,_key text,_note text,_evidence text DEFAULT NULL,_ping text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.challenge_enrollments%ROWTYPE; w integer; b jsonb; a jsonb;
BEGIN
 SELECT * INTO e FROM public.challenge_enrollments WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR e.participant_id<>auth.uid() OR NOT public.is_active_member(auth.uid()) OR e.status<>'active' OR now()<e.start_at OR now()>=e.end_at THEN RAISE EXCEPTION 'Your active journey is required'; END IF;
 IF length(coalesce(_note,''))>4000 THEN RAISE EXCEPTION 'Note too long'; END IF;
 IF (_evidence IS NOT NULL AND (_evidence !~ '^https://[^[:space:]]+$' OR length(_evidence)>2000)) OR (_ping IS NOT NULL AND (_ping !~ '^https://[^[:space:]]+$' OR length(_ping)>2000)) THEN RAISE EXCEPTION 'Use an HTTPS evidence link'; END IF;
 IF _kind='checkin' THEN
 w=least(ceil(e.duration_days/7.0)::int,floor(extract(epoch FROM (now()-e.start_at))/604800)::int+1);
 SELECT to_jsonb(c) INTO b FROM public.challenge_checkins c WHERE enrollment_id=_id AND week_number=w;
 INSERT INTO public.challenge_checkins(enrollment_id,week_number,progress_note,evidence_url,ping_update_url) VALUES(_id,w,_note,_evidence,_ping)
 ON CONFLICT(enrollment_id,week_number) DO UPDATE SET progress_note=excluded.progress_note,evidence_url=excluded.evidence_url,ping_update_url=excluded.ping_update_url,updated_at=now();
 SELECT to_jsonb(c) INTO a FROM public.challenge_checkins c WHERE enrollment_id=_id AND week_number=w;
 ELSIF _kind='milestone' THEN
 IF _key='baseline' AND NOT EXISTS(SELECT 1 FROM public.assessments WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Complete AVA first'; END IF;
 IF _key='onboarding' AND NOT EXISTS(SELECT 1 FROM public.founder_profiles WHERE user_id=auth.uid() AND nullif(trim(venture_name),'') IS NOT NULL) THEN RAISE EXCEPTION 'Complete your venture profile first'; END IF;
 IF nullif(trim(_note),'') IS NULL AND _evidence IS NULL THEN RAISE EXCEPTION 'Provide progress evidence'; END IF;
 SELECT to_jsonb(m) INTO b FROM public.challenge_milestones m WHERE enrollment_id=_id AND milestone_key=_key;
 INSERT INTO public.challenge_milestones(enrollment_id,milestone_key,participant_note,evidence_url) VALUES(_id,_key,_note,_evidence)
 ON CONFLICT(enrollment_id,milestone_key) DO UPDATE SET participant_note=excluded.participant_note,evidence_url=excluded.evidence_url,submitted_at=now(),review_state='submitted',reviewed_at=NULL,reviewed_by=NULL,review_note=NULL;
 IF _key='onboarding' THEN UPDATE public.challenge_enrollments SET onboarding_completed_at=now() WHERE id=_id; END IF;
 SELECT to_jsonb(m) INTO a FROM public.challenge_milestones m WHERE enrollment_id=_id AND milestone_key=_key;
 ELSIF _kind='ping_profile' THEN
 b=jsonb_build_object('ping_profile_url',e.ping_profile_url);
 UPDATE public.challenge_enrollments SET ping_profile_url=_ping,updated_at=now() WHERE id=_id;
 a=jsonb_build_object('ping_profile_url',_ping);
 ELSE RAISE EXCEPTION 'Invalid progress action'; END IF;
 INSERT INTO public.challenge_audit(enrollment_id,actor_id,action,before_value,after_value) VALUES(_id,auth.uid(),_kind,b,a);
END; $$;
REVOKE ALL ON FUNCTION public.save_challenge_progress(uuid,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_challenge_progress(uuid,text,text,text,text,text) TO authenticated;

CREATE FUNCTION public.review_challenge_milestone(_id uuid,_state text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.challenge_milestones%ROWTYPE; b jsonb;
BEGIN
 IF NOT public.challenge_is_admin() THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
 IF _state NOT IN ('accepted','changes_requested') OR length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'Review state and reason required'; END IF;
 SELECT * INTO m FROM public.challenge_milestones WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Milestone unavailable'; END IF;
 b=to_jsonb(m);
 UPDATE public.challenge_milestones SET review_state=_state,reviewed_at=now(),reviewed_by=auth.uid(),review_note=_reason WHERE id=_id RETURNING * INTO m;
 INSERT INTO public.challenge_audit(enrollment_id,actor_id,action,before_value,after_value,reason) VALUES(m.enrollment_id,auth.uid(),'milestone_review',b,to_jsonb(m),_reason);
END; $$;
REVOKE ALL ON FUNCTION public.review_challenge_milestone(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_challenge_milestone(uuid,text,text) TO authenticated;

COMMENT ON TABLE public.challenge_enrollments IS 'Additive participant journey; no payment confirmation, credit issuance or activation integration in this release. Existing wallet infrastructure is untouched.';
COMMENT ON COLUMN public.challenge_enrollments.credit_state IS 'Read-only programme status, not a balance or issuance instruction. No credits issued by this module.';
COMMENT ON TABLE public.challenge_settings IS 'No seed row: safe effective defaults are registration off, USD 20/2, 90 days, confirmed individual starts and hidden benefit catalogue. Checkout cannot be enabled here.';