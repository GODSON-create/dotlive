-- Database Migration: DOT Store System
-- Path: supabase/migrations/20260625010000_dot_store.sql

-- 1. Create store_items table
CREATE TABLE IF NOT EXISTS public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL, -- 'Template', 'Toolkit', 'Prompt Pack', 'Automation', 'Ebook'
  price_dot numeric NOT NULL CHECK (price_dot >= 0),
  file_url text, -- Link to the asset
  download_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_items TO authenticated;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active items are viewable" ON public.store_items;
CREATE POLICY "Active items are viewable" ON public.store_items
  FOR SELECT TO authenticated USING (is_active OR vendor_id = auth.uid());

DROP POLICY IF EXISTS "Vendors manage own items" ON public.store_items;
CREATE POLICY "Vendors manage own items" ON public.store_items
  FOR ALL TO authenticated USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);

-- 2. Create store_orders table
CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_dot numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_orders TO authenticated;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own store orders" ON public.store_orders;
CREATE POLICY "Users view own store orders" ON public.store_orders
  FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR vendor_id = auth.uid());

-- 3. Create purchase_store_item function
CREATE OR REPLACE FUNCTION public.purchase_store_item(_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _buyer uuid := auth.uid();
  _item public.store_items%ROWTYPE;
  _bal numeric;
BEGIN
  IF _buyer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.assert_wallet_active(_buyer);
  
  SELECT * INTO _item FROM public.store_items WHERE id = _item_id;
  IF NOT FOUND OR NOT _item.is_active THEN RAISE EXCEPTION 'Item not available'; END IF;
  IF _item.vendor_id = _buyer THEN RAISE EXCEPTION 'You cannot buy your own item'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_buyer, 0) ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM public.wallets WHERE user_id = _buyer FOR UPDATE;
  
  UPDATE public.wallets SET balance = balance - _item.price_dot WHERE user_id = _buyer RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_item.vendor_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets 
  SET balance = balance + _item.price_dot,
      withdrawable_balance = withdrawable_balance + _item.price_dot
  WHERE user_id = _item.vendor_id;

  INSERT INTO public.store_orders (item_id, buyer_id, vendor_id, amount_dot)
    VALUES (_item_id, _buyer, _item.vendor_id, _item.price_dot);

  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_buyer, -_item.price_dot, 'Spend', 'Purchased: ' || _item.title);
  INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (_item.vendor_id, _item.price_dot, 'Marketplace Earnings', 'Asset sold: ' || _item.title);
END; $$;

GRANT EXECUTE ON FUNCTION public.purchase_store_item(uuid) TO authenticated;
