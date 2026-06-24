-- ============ Create PXXL Analytics Table ============
CREATE TABLE IF NOT EXISTS public.pxxl_analytics (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT ON public.pxxl_analytics TO authenticated;
GRANT SELECT, INSERT ON public.pxxl_analytics TO anon;
GRANT ALL ON public.pxxl_analytics TO service_role;

-- Row Level Security
ALTER TABLE public.pxxl_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert analytics" 
  ON public.pxxl_analytics 
  FOR INSERT 
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins view all analytics" 
  ON public.pxxl_analytics 
  FOR SELECT 
  TO authenticated 
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pxxl_analytics_event ON public.pxxl_analytics (event_name);
CREATE INDEX IF NOT EXISTS idx_pxxl_analytics_user ON public.pxxl_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_pxxl_analytics_created ON public.pxxl_analytics (created_at);
