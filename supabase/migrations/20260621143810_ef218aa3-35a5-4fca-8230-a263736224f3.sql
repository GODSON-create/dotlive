-- ============ Builder profiles ============
CREATE TABLE public.builder_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text NOT NULL,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_profiles TO authenticated;
GRANT ALL ON public.builder_profiles TO service_role;
ALTER TABLE public.builder_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Builder profiles viewable by authenticated" ON public.builder_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own builder profile" ON public.builder_profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_builder_profiles_updated BEFORE UPDATE ON public.builder_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Services ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price_dot numeric NOT NULL CHECK (price_dot > 0),
  delivery_days integer NOT NULL DEFAULT 3 CHECK (delivery_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active services or own are viewable" ON public.services
  FOR SELECT TO authenticated USING (is_active OR builder_id = auth.uid());
CREATE POLICY "Builders manage own services" ON public.services
  FOR ALL TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE INDEX idx_services_category ON public.services (category) WHERE is_active;
CREATE INDEX idx_services_builder ON public.services (builder_id);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Orders ============
CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_dot numeric NOT NULL,
  title text NOT NULL,
  requirements text,
  delivery_note text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order parties can view their orders" ON public.service_orders
  FOR SELECT TO authenticated USING (auth.uid() = client_id OR auth.uid() = builder_id);
CREATE INDEX idx_orders_client ON public.service_orders (client_id);
CREATE INDEX idx_orders_builder ON public.service_orders (builder_id);
CREATE INDEX idx_orders_service ON public.service_orders (service_id);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Reviews ============
CREATE TABLE public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.service_orders(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL,
  client_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_reviews TO authenticated;
GRANT ALL ON public.service_reviews TO service_role;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by authenticated" ON public.service_reviews
  FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_reviews_builder ON public.service_reviews (builder_id);
CREATE INDEX idx_reviews_service ON public.service_reviews (service_id);

-- ============ Order lifecycle RPCs (atomic, ledger-backed) ============
CREATE OR REPLACE FUNCTION public.create_service_order(_service_id uuid, _requirements text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _client uuid := auth.uid();
  _svc public.services%ROWTYPE;
  _order_id uuid;
  _bal numeric;
BEGIN
  IF _client IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _svc FROM public.services WHERE id = _service_id;
  IF NOT FOUND OR NOT _svc.is_active THEN RAISE EXCEPTION 'Service not available'; END IF;
  IF _svc.builder_id = _client THEN RAISE EXCEPTION 'You cannot order your own service'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_client, 0) ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM public.wallets WHERE user_id = _client FOR UPDATE;
  UPDATE public.wallets SET balance = balance - _svc.price_dot WHERE user_id = _client RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'Insufficient DOT balance'; END IF;

  INSERT INTO public.service_orders (service_id, client_id, builder_id, amount_dot, title, requirements, status)
  VALUES (_service_id, _client, _svc.builder_id, _svc.price_dot, _svc.title, _requirements, 'in_progress')
  RETURNING id INTO _order_id;

  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_client, -_svc.price_dot, 'Marketplace Spend', 'Order: ' || _svc.title);

  RETURN _order_id;
END; $$;

CREATE OR REPLACE FUNCTION public.deliver_service_order(_order_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.service_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.service_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.builder_id <> auth.uid() THEN RAISE EXCEPTION 'Only the builder can deliver'; END IF;
  IF _o.status <> 'in_progress' THEN RAISE EXCEPTION 'Order cannot be delivered'; END IF;
  UPDATE public.service_orders SET status = 'delivered', delivery_note = _note WHERE id = _order_id;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_service_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.service_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.service_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.client_id <> auth.uid() THEN RAISE EXCEPTION 'Only the client can complete'; END IF;
  IF _o.status NOT IN ('in_progress', 'delivered') THEN RAISE EXCEPTION 'Order already finalized'; END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (_o.builder_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _o.amount_dot WHERE user_id = _o.builder_id;
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_o.builder_id, _o.amount_dot, 'Marketplace Earnings', 'Order completed: ' || _o.title);

  UPDATE public.service_orders SET status = 'completed', completed_at = now() WHERE id = _order_id;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_service_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.service_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.service_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF auth.uid() NOT IN (_o.client_id, _o.builder_id) THEN RAISE EXCEPTION 'Not your order'; END IF;
  IF _o.status NOT IN ('in_progress', 'delivered') THEN RAISE EXCEPTION 'Order cannot be cancelled'; END IF;

  UPDATE public.wallets SET balance = balance + _o.amount_dot WHERE user_id = _o.client_id;
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_o.client_id, _o.amount_dot, 'Refund', 'Order cancelled: ' || _o.title);

  UPDATE public.service_orders SET status = 'cancelled' WHERE id = _order_id;
END; $$;

CREATE OR REPLACE FUNCTION public.review_service_order(_order_id uuid, _rating integer, _comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.service_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.service_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.client_id <> auth.uid() THEN RAISE EXCEPTION 'Only the client can review'; END IF;
  IF _o.status <> 'completed' THEN RAISE EXCEPTION 'You can only review completed orders'; END IF;
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  INSERT INTO public.service_reviews (order_id, service_id, builder_id, client_id, rating, comment)
  VALUES (_order_id, _o.service_id, _o.builder_id, _o.client_id, _rating, _comment)
  ON CONFLICT (order_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment;
END; $$;

CREATE OR REPLACE FUNCTION public.get_builder_stats(_builder_id uuid)
RETURNS TABLE(orders_completed bigint, total_earned numeric, avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.service_orders o WHERE o.builder_id = _builder_id AND o.status = 'completed'),
    (SELECT COALESCE(sum(amount_dot), 0) FROM public.service_orders o WHERE o.builder_id = _builder_id AND o.status = 'completed'),
    (SELECT COALESCE(round(avg(rating), 1), 0) FROM public.service_reviews r WHERE r.builder_id = _builder_id),
    (SELECT count(*) FROM public.service_reviews r WHERE r.builder_id = _builder_id)
$$;

GRANT EXECUTE ON FUNCTION public.create_service_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_service_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_service_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_service_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_service_order(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_builder_stats(uuid) TO authenticated;