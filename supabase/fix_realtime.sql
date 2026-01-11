-- ═══════════════════════════════════════════════════════════════
-- SKULL AGENT - REALTIME FIX
-- Execute this AFTER schema.sql in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Remove from publication first (if exists)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.tokens;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.system_status;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.trades;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.positions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.sniper_logs;

-- Set REPLICA IDENTITY (required for UPDATE/DELETE)
ALTER TABLE public.tokens REPLICA IDENTITY FULL;
ALTER TABLE public.system_status REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.positions REPLICA IDENTITY FULL;
ALTER TABLE public.sniper_logs REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sniper_logs;

-- Enable RLS
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sniper_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "public_read" ON public.tokens;
DROP POLICY IF EXISTS "public_read" ON public.system_status;
DROP POLICY IF EXISTS "public_read" ON public.trades;
DROP POLICY IF EXISTS "public_read" ON public.positions;
DROP POLICY IF EXISTS "public_read" ON public.sniper_logs;

DROP POLICY IF EXISTS "service_write" ON public.tokens;
DROP POLICY IF EXISTS "service_write" ON public.system_status;
DROP POLICY IF EXISTS "service_write" ON public.trades;
DROP POLICY IF EXISTS "service_write" ON public.positions;
DROP POLICY IF EXISTS "service_write" ON public.sniper_logs;

-- Create read policies (public)
CREATE POLICY "public_read" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.system_status FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.trades FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.positions FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.sniper_logs FOR SELECT USING (true);

-- Create write policies (service role)
CREATE POLICY "service_write" ON public.tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write" ON public.system_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write" ON public.trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write" ON public.positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_write" ON public.sniper_logs FOR ALL USING (true) WITH CHECK (true);

-- Verify realtime setup
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
