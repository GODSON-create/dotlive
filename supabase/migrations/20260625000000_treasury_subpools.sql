-- Database Migration: Treasury Sub-pools & Withdrawable Balance
-- Path: supabase/migrations/20260625000000_treasury_subpools.sql

-- 1. Add withdrawable_balance column to wallets
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS withdrawable_balance numeric NOT NULL DEFAULT 0;

-- 2. Define clamping function and trigger to ensure withdrawable_balance <= balance
CREATE OR REPLACE FUNCTION public.clamp_withdrawable_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Balance cannot go negative';
  END IF;
  NEW.withdrawable_balance := LEAST(NEW.balance, NEW.withdrawable_balance);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_clamp_withdrawable ON public.wallets;
CREATE TRIGGER wallets_clamp_withdrawable
  BEFORE INSERT OR UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.clamp_withdrawable_balance();

-- 3. Create treasury_pools table to track sub-pool allocations
CREATE TABLE IF NOT EXISTS public.treasury_pools (
  pool_name text PRIMARY KEY,
  balance numeric NOT NULL,
  total_allocated numeric NOT NULL DEFAULT 0,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grant select permission
GRANT SELECT ON public.treasury_pools TO authenticated;
ALTER TABLE public.treasury_pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view treasury pools" ON public.treasury_pools;
CREATE POLICY "Admins view treasury pools" ON public.treasury_pools
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Initialize sub-pools to sum to exactly 100 Billion
INSERT INTO public.treasury_pools (pool_name, balance, description) VALUES
  ('scholarship', 25000000000, 'Founder Scholarship Pool'),
  ('growth', 25000000000, 'Venture Growth Pool'),
  ('work', 15000000000, 'DOT Work Pool'),
  ('community', 10000000000, 'Community Reward Pool'),
  ('reward', 10000000000, 'Reward Pool'),
  ('partner', 10000000000, 'Capital Partner Pool'),
  ('withdrawal', 5000000000, 'Withdrawal Reserve Pool')
ON CONFLICT (pool_name) DO UPDATE SET description = EXCLUDED.description;

-- 4. Redefine allocate_from_reserve to deduct from both master reserve and sub-pools
CREATE OR REPLACE FUNCTION public.allocate_from_reserve(
  _recipient uuid, _amount numeric, _purpose text,
  _description text DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  _caller uuid := auth.uid(); 
  _reserve numeric; 
  _new_balance numeric;
  _pool text;
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _purpose IS NULL OR length(trim(_purpose)) = 0 THEN RAISE EXCEPTION 'Purpose is required'; END IF;

  -- Map purpose to pool_name
  _pool := lower(trim(_purpose));
  IF _pool LIKE '%scholarship%' THEN _pool := 'scholarship';
  ELSIF _pool LIKE '%growth%' OR _pool LIKE '%grant%' THEN _pool := 'growth';
  ELSIF _pool LIKE '%work%' OR _pool LIKE '%incentive%' OR _pool LIKE '%job%' THEN _pool := 'work';
  ELSIF _pool LIKE '%community%' OR _pool LIKE '%leader%' OR _pool LIKE '%referral%' THEN _pool := 'community';
  ELSIF _pool LIKE '%reward%' OR _pool LIKE '%academy%' THEN _pool := 'reward';
  ELSIF _pool LIKE '%partner%' THEN _pool := 'partner';
  ELSIF _pool LIKE '%withdrawal%' THEN _pool := 'withdrawal';
  ELSE _pool := 'growth'; -- default fallback
  END IF;

  -- Verify and update sub-pool
  UPDATE public.treasury_pools
  SET balance = balance - _amount,
      total_allocated = total_allocated + _amount,
      updated_at = now()
  WHERE pool_name = _pool;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treasury sub-pool not found: %', _pool;
  END IF;

  -- Ensure sub-pool balance is non-negative
  IF (SELECT balance FROM public.treasury_pools WHERE pool_name = _pool) < 0 THEN
    RAISE EXCEPTION 'Insufficient balance in treasury sub-pool: %', _pool;
  END IF;

  UPDATE public.reserve_wallet SET balance = balance - _amount, updated_at = now()
    WHERE id = true RETURNING balance INTO _reserve;
  IF _reserve < 0 THEN RAISE EXCEPTION 'Insufficient master reserve balance'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_recipient, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _recipient
    RETURNING balance INTO _new_balance;

  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_recipient, _amount, _purpose, COALESCE(_description, 'Reserve allocation: ' || _purpose));
  INSERT INTO public.reserve_allocations (recipient_id, amount, purpose, description, allocated_by)
    VALUES (_recipient, _amount, _purpose, _description, _caller);
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, amount, reason, metadata)
    VALUES (_caller, 'reserve_allocation', _recipient, _amount, _reason, 
            jsonb_build_object('purpose', _purpose, 'pool_name', _pool));

  RETURN _new_balance;
END; $$;

-- 5. Redefine complete_service_order to credit both total and withdrawable balance
CREATE OR REPLACE FUNCTION public.complete_service_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  _o public.service_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.service_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.client_id <> auth.uid() THEN RAISE EXCEPTION 'Only the client can complete'; END IF;
  IF _o.status NOT IN ('in_progress', 'delivered') THEN RAISE EXCEPTION 'Order already finalized'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_o.builder_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets 
  SET balance = balance + _o.amount_dot,
      withdrawable_balance = withdrawable_balance + _o.amount_dot
  WHERE user_id = _o.builder_id;
  
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_o.builder_id, _o.amount_dot, 'Marketplace Earnings', 'Order completed: ' || _o.title);

  UPDATE public.service_orders SET status = 'completed', completed_at = now() WHERE id = _order_id;
END; $$;
