-- ============ Create Spotlight Campaigns Table ============
CREATE TABLE public.spotlight_campaigns (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS & Grants
GRANT SELECT, INSERT ON public.spotlight_campaigns TO authenticated;
GRANT ALL ON public.spotlight_campaigns TO service_role;

ALTER TABLE public.spotlight_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spotlight campaigns" 
  ON public.spotlight_campaigns 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own spotlight campaigns" 
  ON public.spotlight_campaigns 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all spotlight campaigns" 
  ON public.spotlight_campaigns 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============ Secure Wallet Spotlight Charge Function ============
CREATE OR REPLACE FUNCTION public.charge_spotlight_fee(_user_id uuid, _fee numeric, _package text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _current_balance numeric;
BEGIN
  -- Select and lock the wallet row for update
  SELECT balance INTO _current_balance 
  FROM public.wallets 
  WHERE user_id = _user_id 
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _fee THEN
    RETURN false;
  END IF;

  -- Deduct fee
  UPDATE public.wallets 
  SET balance = balance - _fee, updated_at = now() 
  WHERE user_id = _user_id;

  -- Insert transaction record
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_user_id, -_fee, 'spotlight', 'DOT Spotlight campaign fee for ' || _package || ' package');

  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.charge_spotlight_fee TO authenticated;
