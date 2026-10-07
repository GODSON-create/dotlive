-- Additive, security-reviewed restoration of schema the app code already expects.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

-- Prevent users from self-granting verified/suspended flags
CREATE OR REPLACE FUNCTION public.protect_profile_admin_flags()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    NEW.verified := OLD.verified;
    NEW.suspended := OLD.suspended;
    NEW.referred_by_id := OLD.referred_by_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS profiles_protect_admin_flags ON public.profiles;
CREATE TRIGGER profiles_protect_admin_flags BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_flags();

ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS before_value TEXT;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS after_value TEXT;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS withdrawable_balance numeric NOT NULL DEFAULT 0;

-- Spotlight campaigns
CREATE TABLE IF NOT EXISTS public.spotlight_campaigns (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  venture_name TEXT NOT NULL,
  pitch TEXT NOT NULL,
  package_type TEXT NOT NULL,
  cost_dot NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  target_impressions INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  assigned_team_member TEXT,
  published_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.spotlight_campaigns TO authenticated;
GRANT ALL ON public.spotlight_campaigns TO service_role;
ALTER TABLE public.spotlight_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own spotlight campaigns" ON public.spotlight_campaigns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pending spotlight campaigns" ON public.spotlight_campaigns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending' AND impressions = 0 AND clicks = 0 AND leads_generated = 0);
CREATE POLICY "Admins manage all spotlight campaigns" ON public.spotlight_campaigns
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Fee charge bound to the caller (cannot charge another user's wallet)
CREATE OR REPLACE FUNCTION public.charge_spotlight_fee(_user_id uuid, _fee numeric, _package text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _fee IS NULL OR _fee <= 0 THEN RAISE EXCEPTION 'Invalid fee'; END IF;
  PERFORM public.assert_wallet_active(_user_id);
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _bal IS NULL OR _bal < _fee THEN RETURN false; END IF;
  UPDATE public.wallets SET balance = balance - _fee, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_user_id, -_fee, 'spotlight', 'DOT Spotlight campaign fee for ' || _package || ' package');
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.charge_spotlight_fee(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.charge_spotlight_fee(uuid, numeric, text) TO authenticated;

-- Product analytics events
CREATE TABLE IF NOT EXISTS public.pxxl_analytics (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_name TEXT NOT NULL CHECK (length(event_name) BETWEEN 1 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.pxxl_analytics TO anon;
GRANT SELECT, INSERT ON public.pxxl_analytics TO authenticated;
GRANT ALL ON public.pxxl_analytics TO service_role;
ALTER TABLE public.pxxl_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert own or anonymous analytics" ON public.pxxl_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins view analytics" ON public.pxxl_analytics
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_pxxl_analytics_created ON public.pxxl_analytics (created_at);

-- Login audit
CREATE TABLE IF NOT EXISTS public.login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_audit_log TO authenticated;
GRANT ALL ON public.login_audit_log TO service_role;
ALTER TABLE public.login_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own login logs" ON public.login_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all login logs" ON public.login_audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Treasury pools (read-only for admins; movement functions intentionally not added in this release)
CREATE TABLE IF NOT EXISTS public.treasury_pools (
  pool_name text PRIMARY KEY,
  balance numeric NOT NULL,
  total_allocated numeric NOT NULL DEFAULT 0,
  locked_balance numeric NOT NULL DEFAULT 0,
  burned_balance numeric NOT NULL DEFAULT 0,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.treasury_pools TO authenticated;
GRANT ALL ON public.treasury_pools TO service_role;
ALTER TABLE public.treasury_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view treasury pools" ON public.treasury_pools FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Store (future module; listing + own orders only)
CREATE TABLE IF NOT EXISTS public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price_dot numeric NOT NULL CHECK (price_dot >= 0),
  file_url text,
  download_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_items TO authenticated;
GRANT ALL ON public.store_items TO service_role;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active items are viewable" ON public.store_items FOR SELECT TO authenticated USING (is_active OR vendor_id = auth.uid());
CREATE POLICY "Vendors manage own items" ON public.store_items FOR ALL TO authenticated USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  amount_dot numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own store orders" ON public.store_orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR vendor_id = auth.uid());