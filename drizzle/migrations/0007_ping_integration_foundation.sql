-- DOT <-> Ping integration foundation (DOT side only). No message content is stored.
CREATE TABLE public.ping_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ping_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','error')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ping_identity_links_one_active_per_user ON public.ping_identity_links(user_id) WHERE status = 'active';
CREATE UNIQUE INDEX ping_identity_links_ping_user_unique ON public.ping_identity_links(ping_user_id);
GRANT SELECT ON public.ping_identity_links TO authenticated;
GRANT ALL ON public.ping_identity_links TO service_role;
ALTER TABLE public.ping_identity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own Ping link" ON public.ping_identity_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read Ping links" ON public.ping_identity_links FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.ping_link_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nonce_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ping_link_states_user_idx ON public.ping_link_states(user_id);
GRANT ALL ON public.ping_link_states TO service_role;
ALTER TABLE public.ping_link_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ping_hub_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL UNIQUE REFERENCES public.communities(id) ON DELETE CASCADE,
  ping_hub_id text NOT NULL UNIQUE,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','error','disabled')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ping_hub_links TO authenticated;
GRANT ALL ON public.ping_hub_links TO service_role;
ALTER TABLE public.ping_hub_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Ping hub links" ON public.ping_hub_links FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.ping_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('community.created','community.updated','member.joined','member.left','community.leader_changed')),
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','dead')),
  retry_count int NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX ping_outbox_due_idx ON public.ping_outbox(status, next_attempt_at);
GRANT SELECT ON public.ping_outbox TO authenticated;
GRANT ALL ON public.ping_outbox TO service_role;
ALTER TABLE public.ping_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Ping outbox" ON public.ping_outbox FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.ping_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT ON public.ping_webhook_events TO authenticated;
GRANT ALL ON public.ping_webhook_events TO service_role;
ALTER TABLE public.ping_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Ping webhook events" ON public.ping_webhook_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Outbox triggers fire only after a membership/community row was actually written,
-- i.e. after the authorised RPC succeeded, in the same transaction. RPC semantics unchanged.
CREATE OR REPLACE FUNCTION public.ping_enqueue_member_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ping_outbox(event_type, aggregate_id, payload, idempotency_key)
    VALUES ('member.joined', NEW.community_id,
      jsonb_build_object('community_id', NEW.community_id, 'dot_user_id', NEW.founder_id, 'membership_id', NEW.id),
      'member.joined:' || NEW.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
    RETURN NEW;
  ELSE
    INSERT INTO public.ping_outbox(event_type, aggregate_id, payload, idempotency_key)
    VALUES ('member.left', OLD.community_id,
      jsonb_build_object('community_id', OLD.community_id, 'dot_user_id', OLD.founder_id, 'membership_id', OLD.id),
      'member.left:' || OLD.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
    RETURN OLD;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ping_enqueue_community_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ping_outbox(event_type, aggregate_id, payload, idempotency_key)
    VALUES ('community.created', NEW.id, jsonb_build_object('community_id', NEW.id), 'community.created:' || NEW.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
  ELSE
    IF NEW.leader_id IS DISTINCT FROM OLD.leader_id THEN
      INSERT INTO public.ping_outbox(event_type, aggregate_id, payload, idempotency_key)
      VALUES ('community.leader_changed', NEW.id,
        jsonb_build_object('community_id', NEW.id, 'previous_leader_id', OLD.leader_id, 'leader_id', NEW.leader_id),
        'community.leader_changed:' || NEW.id::text || ':' || txid_current()::text)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    IF (NEW.name, NEW.description, NEW.visibility, NEW.community_type) IS DISTINCT FROM (OLD.name, OLD.description, OLD.visibility, OLD.community_type) THEN
      INSERT INTO public.ping_outbox(event_type, aggregate_id, payload, idempotency_key)
      VALUES ('community.updated', NEW.id, jsonb_build_object('community_id', NEW.id),
        'community.updated:' || NEW.id::text || ':' || txid_current()::text)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ping_enqueue_member_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ping_enqueue_community_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ping_outbox_member_changes AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.ping_enqueue_member_event();
CREATE TRIGGER ping_outbox_community_changes AFTER INSERT OR UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.ping_enqueue_community_event();

-- Safe per-community status for members (no hub IDs or errors exposed).
CREATE OR REPLACE FUNCTION public.get_ping_hub_status(_community_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL
    ELSE COALESCE((SELECT CASE WHEN sync_status = 'synced' THEN 'connected' ELSE 'pending' END FROM public.ping_hub_links WHERE community_id = _community_id), 'not_connected') END
$$;
REVOKE ALL ON FUNCTION public.get_ping_hub_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ping_hub_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ping_integration_admin_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN jsonb_build_object(
    'linked_accounts', (SELECT count(*) FROM public.ping_identity_links WHERE status = 'active'),
    'mapped_hubs', (SELECT count(*) FROM public.ping_hub_links),
    'outbox_pending', (SELECT count(*) FROM public.ping_outbox WHERE status IN ('pending','processing')),
    'outbox_failed', (SELECT count(*) FROM public.ping_outbox WHERE status IN ('failed','dead')),
    'last_successful_sync', (SELECT max(processed_at) FROM public.ping_outbox WHERE status = 'sent'),
    'webhooks_received', (SELECT count(*) FROM public.ping_webhook_events),
    'recent_errors', COALESCE((SELECT jsonb_agg(e) FROM (
        SELECT event_type, last_error, retry_count, created_at FROM public.ping_outbox
        WHERE status IN ('failed','dead') AND last_error IS NOT NULL ORDER BY created_at DESC LIMIT 5) e), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.ping_integration_admin_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ping_integration_admin_summary() TO authenticated;