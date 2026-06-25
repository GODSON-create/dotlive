-- Migration: Super Admin Setup, Treasury Pools & Allocation Engine, Referrals and Jobs Marketplace
-- Path: supabase/migrations/20260625030000_admin_roles_and_treasury.sql

-- 1. Support Moderator role in app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- 2. Expand profiles with referred_by_id and force_password_change
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

-- 3. Add locked_balance and burned_balance to treasury_pools
ALTER TABLE public.treasury_pools ADD COLUMN IF NOT EXISTS locked_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.treasury_pools ADD COLUMN IF NOT EXISTS burned_balance numeric NOT NULL DEFAULT 0;

-- 4. Re-initialize four pools (70B strategic treasury, 15B scholarship, 5B community, 10B reward)
DELETE FROM public.treasury_pools;
INSERT INTO public.treasury_pools (pool_name, balance, description) VALUES
  ('treasury', 70000000000, 'Strategic Treasury Wallet'),
  ('scholarship', 15000000000, 'Founder Scholarship Pool'),
  ('community', 5000000000, 'Community Reward Pool'),
  ('reward', 10000000000, 'Reward Pool Wallet');

-- 5. Redefine is_admin to support moderator
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin', 'moderator')
  )
$$;

-- 6. Redefine allocate_from_reserve to map to correct pools
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
  
  -- Check if caller is moderator (moderators cannot allocate)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _caller AND role = 'moderator') THEN
    RAISE EXCEPTION 'Moderators do not have permission to allocate funds';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _purpose IS NULL OR length(trim(_purpose)) = 0 THEN RAISE EXCEPTION 'Purpose is required'; END IF;

  -- Map purpose to pool_name
  _pool := lower(trim(_purpose));
  IF _pool LIKE '%scholarship%' THEN _pool := 'scholarship';
  ELSIF _pool LIKE '%community%' OR _pool LIKE '%leader%' OR _pool LIKE '%referral%' THEN _pool := 'community';
  ELSIF _pool LIKE '%reward%' OR _pool LIKE '%academy%' THEN _pool := 'reward';
  ELSE _pool := 'treasury'; -- default fallback to master treasury
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

  -- Dedicate from reserve_wallet (master treasury tracker)
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

-- 7. Allocation Engine controls: lock, release, burn, transfer
CREATE OR REPLACE FUNCTION public.lock_pool_funds(
  _pool_name text, _amount numeric, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _caller AND role = 'moderator') THEN
    RAISE EXCEPTION 'Moderators do not have permission to lock funds';
  END IF;

  UPDATE public.treasury_pools
  SET balance = balance - _amount,
      locked_balance = locked_balance + _amount,
      updated_at = now()
  WHERE pool_name = _pool_name;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pool not found'; END IF;
  IF (SELECT balance FROM public.treasury_pools WHERE pool_name = _pool_name) < 0 THEN
    RAISE EXCEPTION 'Insufficient active balance to lock';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, amount, reason, metadata)
    VALUES (_caller, 'lock_funds', _amount, _reason, jsonb_build_object('pool_name', _pool_name));
END; $$;

CREATE OR REPLACE FUNCTION public.release_pool_funds(
  _pool_name text, _amount numeric, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _caller AND role = 'moderator') THEN
    RAISE EXCEPTION 'Moderators do not have permission to release funds';
  END IF;

  UPDATE public.treasury_pools
  SET balance = balance + _amount,
      locked_balance = locked_balance - _amount,
      updated_at = now()
  WHERE pool_name = _pool_name;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pool not found'; END IF;
  IF (SELECT locked_balance FROM public.treasury_pools WHERE pool_name = _pool_name) < 0 THEN
    RAISE EXCEPTION 'Insufficient locked balance to release';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, amount, reason, metadata)
    VALUES (_caller, 'release_funds', _amount, _reason, jsonb_build_object('pool_name', _pool_name));
END; $$;

CREATE OR REPLACE FUNCTION public.burn_pool_funds(
  _pool_name text, _amount numeric, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _caller AND role = 'moderator') THEN
    RAISE EXCEPTION 'Moderators do not have permission to burn funds';
  END IF;

  UPDATE public.treasury_pools
  SET balance = balance - _amount,
      burned_balance = burned_balance + _amount,
      updated_at = now()
  WHERE pool_name = _pool_name;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pool not found'; END IF;
  IF (SELECT balance FROM public.treasury_pools WHERE pool_name = _pool_name) < 0 THEN
    RAISE EXCEPTION 'Insufficient active balance to burn';
  END IF;

  -- Also reduce the master reserve wallet balance
  UPDATE public.reserve_wallet SET balance = balance - _amount, updated_at = now() WHERE id = true;

  INSERT INTO public.admin_audit_log (admin_id, action, amount, reason, metadata)
    VALUES (_caller, 'burn_funds', _amount, _reason, jsonb_build_object('pool_name', _pool_name));
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_pool_funds(
  _from_pool text, _to_pool text, _amount numeric, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(_caller) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _caller AND role = 'moderator') THEN
    RAISE EXCEPTION 'Moderators do not have permission to transfer funds';
  END IF;

  -- Deduct from sender pool
  UPDATE public.treasury_pools
  SET balance = balance - _amount,
      updated_at = now()
  WHERE pool_name = _from_pool;

  IF NOT FOUND THEN RAISE EXCEPTION 'Source pool not found'; END IF;
  IF (SELECT balance FROM public.treasury_pools WHERE pool_name = _from_pool) < 0 THEN
    RAISE EXCEPTION 'Insufficient balance in source pool';
  END IF;

  -- Add to recipient pool
  UPDATE public.treasury_pools
  SET balance = balance + _amount,
      updated_at = now()
  WHERE pool_name = _to_pool;

  IF NOT FOUND THEN RAISE EXCEPTION 'Destination pool not found'; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, amount, reason, metadata)
    VALUES (_caller, 'transfer_pools', _amount, _reason, 
            jsonb_build_object('from_pool', _from_pool, 'to_pool', _to_pool));
END; $$;

-- 8. Create login_audit_log table to track device/session tracking
CREATE TABLE IF NOT EXISTS public.login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_audit_log TO authenticated;
ALTER TABLE public.login_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own login logs" ON public.login_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all login logs" ON public.login_audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 9. Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  budget_dot numeric NOT NULL DEFAULT 0,
  application_type text NOT NULL, -- 'whatsapp' | 'email' | 'website'
  application_destination text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs viewable by authenticated" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own jobs" ON public.jobs FOR ALL TO authenticated USING (auth.uid() = poster_id) WITH CHECK (auth.uid() = poster_id);

-- 10. Automated Referral Rewards Trigger Functions
CREATE OR REPLACE FUNCTION public.process_community_member_referral()
RETURNS trigger AS $$
DECLARE
  _leader uuid;
  _leader_name text;
BEGIN
  SELECT leader_id, name INTO _leader, _leader_name FROM public.communities WHERE id = NEW.community_id;
  IF _leader IS NOT NULL AND _leader <> NEW.founder_id THEN
    -- Update referrer (referred_by_id) in profiles
    UPDATE public.profiles SET referred_by_id = _leader WHERE id = NEW.founder_id AND referred_by_id IS NULL;
    
    -- Award leader 500 DOT from community reward pool
    UPDATE public.treasury_pools SET balance = balance - 500, total_allocated = total_allocated + 500 WHERE pool_name = 'community';
    UPDATE public.wallets SET balance = balance + 500 WHERE user_id = _leader;
    INSERT INTO public.transactions (user_id, amount, type, description)
      VALUES (_leader, 500, 'Referral Reward', 'Referral bonus: member joined community');
    
    -- Award new member 200 DOT
    UPDATE public.treasury_pools SET balance = balance - 200, total_allocated = total_allocated + 200 WHERE pool_name = 'community';
    UPDATE public.wallets SET balance = balance + 200 WHERE user_id = NEW.founder_id;
    INSERT INTO public.transactions (user_id, amount, type, description)
      VALUES (NEW.founder_id, 200, 'Signup Reward', 'Welcome bonus: joined community');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_community_member_referral ON public.community_members;
CREATE TRIGGER trg_community_member_referral AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.process_community_member_referral();

CREATE OR REPLACE FUNCTION public.process_wallet_funding_referral()
RETURNS trigger AS $$
DECLARE
  _referrer uuid;
BEGIN
  IF NEW.credited_at IS NOT NULL AND OLD.credited_at IS NULL THEN
    SELECT referred_by_id INTO _referrer FROM public.profiles WHERE id = NEW.user_id;
    IF _referrer IS NOT NULL THEN
      -- Reward referrer with 1000 DOT from community pool
      UPDATE public.treasury_pools SET balance = balance - 1000, total_allocated = total_allocated + 1000 WHERE pool_name = 'community';
      UPDATE public.wallets SET balance = balance + 1000 WHERE user_id = _referrer;
      INSERT INTO public.transactions (user_id, amount, type, description)
        VALUES (_referrer, 1000, 'Referral Reward', 'Referral bonus: referred user funded wallet');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_wallet_funding_referral ON public.payments;
CREATE TRIGGER trg_wallet_funding_referral AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.process_wallet_funding_referral();

CREATE OR REPLACE FUNCTION public.process_academy_completion_referral()
RETURNS trigger AS $$
DECLARE
  _referrer uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    SELECT referred_by_id INTO _referrer FROM public.profiles WHERE id = NEW.user_id;
    IF _referrer IS NOT NULL THEN
      -- Reward referrer with 1000 DOT from reward pool
      UPDATE public.treasury_pools SET balance = balance - 1000, total_allocated = total_allocated + 1000 WHERE pool_name = 'reward';
      UPDATE public.wallets SET balance = balance + 1000 WHERE user_id = _referrer;
      INSERT INTO public.transactions (user_id, amount, type, description)
        VALUES (_referrer, 1000, 'Referral Reward', 'Referral bonus: referred user completed academy course');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_academy_completion_referral ON public.course_enrollments;
CREATE TRIGGER trg_academy_completion_referral AFTER UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.process_academy_completion_referral();

CREATE OR REPLACE FUNCTION public.process_vantage_completion_referral()
RETURNS trigger AS $$
DECLARE
  _referrer uuid;
BEGIN
  SELECT referred_by_id INTO _referrer FROM public.profiles WHERE id = NEW.user_id;
  IF _referrer IS NOT NULL THEN
    -- Reward referrer with 1000 DOT from reward pool
    UPDATE public.treasury_pools SET balance = balance - 1000, total_allocated = total_allocated + 1000 WHERE pool_name = 'reward';
    UPDATE public.wallets SET balance = balance + 1000 WHERE user_id = _referrer;
    INSERT INTO public.transactions (user_id, amount, type, description)
      VALUES (_referrer, 1000, 'Referral Reward', 'Referral bonus: referred user completed Vantage assessment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vantage_completion_referral ON public.assessments;
CREATE TRIGGER trg_vantage_completion_referral AFTER INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.process_vantage_completion_referral();

-- 11. Seed initial Super Admin account
-- Email: admin@dotlive.cv | Password: admin2025
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DO $$
DECLARE
  _admin_id uuid := '00000000-0000-0000-0000-0000000000ad';
  _hash text;
BEGIN
  _hash := public.crypt('admin2025', public.gen_salt('bf', 10));

  -- Insert auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
  )
  VALUES (
    _admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@dotlive.cv',
    _hash,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "admin", "username": "admin"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, name, email, dot_id, username, active_role, force_password_change)
  VALUES (_admin_id, 'Admin', 'admin@dotlive.cv', 'DOT-ADMIN', 'admin', 'super_admin', true)
  ON CONFLICT (id) DO UPDATE SET username = 'admin', active_role = 'super_admin', force_password_change = true;

  -- Ensure super_admin role exists in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_admin_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END; $$;
