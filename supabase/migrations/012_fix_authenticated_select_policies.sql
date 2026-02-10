-- ============================================
-- 012: Fix authenticated SELECT policies
-- Migration 011 added INSERT/UPDATE/DELETE but missed SELECT
-- PostgREST's .insert().select() needs SELECT permission too
-- ============================================

-- Ensure RLS enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Reset customers policies (drop old, create new with SELECT included)
DROP POLICY IF EXISTS "anon_read_customers" ON public.customers;
DROP POLICY IF EXISTS "anon_insert_customers" ON public.customers;
DROP POLICY IF EXISTS "anon_update_customers" ON public.customers;
DROP POLICY IF EXISTS "anon_delete_customers" ON public.customers;
DROP POLICY IF EXISTS "client_read_customers" ON public.customers;
DROP POLICY IF EXISTS "client_insert_customers" ON public.customers;
DROP POLICY IF EXISTS "client_update_customers" ON public.customers;
DROP POLICY IF EXISTS "client_delete_customers" ON public.customers;

CREATE POLICY "client_read_customers"
  ON public.customers FOR SELECT
  USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "client_insert_customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "client_update_customers"
  ON public.customers FOR UPDATE
  USING (auth.role() IN ('anon','authenticated'))
  WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "client_delete_customers"
  ON public.customers FOR DELETE
  USING (auth.role() IN ('anon','authenticated'));

-- Reset drivers policies
DROP POLICY IF EXISTS "anon_read_drivers" ON public.drivers;
DROP POLICY IF EXISTS "anon_insert_drivers" ON public.drivers;
DROP POLICY IF EXISTS "anon_update_drivers" ON public.drivers;
DROP POLICY IF EXISTS "anon_delete_drivers" ON public.drivers;
DROP POLICY IF EXISTS "client_read_drivers" ON public.drivers;
DROP POLICY IF EXISTS "client_insert_drivers" ON public.drivers;
DROP POLICY IF EXISTS "client_update_drivers" ON public.drivers;
DROP POLICY IF EXISTS "client_delete_drivers" ON public.drivers;

CREATE POLICY "client_read_drivers"
  ON public.drivers FOR SELECT
  USING (auth.role() IN ('anon','authenticated'));

CREATE POLICY "client_insert_drivers"
  ON public.drivers FOR INSERT
  WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "client_update_drivers"
  ON public.drivers FOR UPDATE
  USING (auth.role() IN ('anon','authenticated'))
  WITH CHECK (auth.role() IN ('anon','authenticated'));

CREATE POLICY "client_delete_drivers"
  ON public.drivers FOR DELETE
  USING (auth.role() IN ('anon','authenticated'));
