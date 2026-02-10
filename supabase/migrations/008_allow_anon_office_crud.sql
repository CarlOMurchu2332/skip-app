-- ============================================
-- 008: Allow anon client-side office CRUD paths
-- Fixes 401 from browser Supabase calls in office pages
-- ============================================

-- Customers policies
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers"
  ON customers FOR INSERT
  WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers"
  ON customers FOR UPDATE
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers"
  ON customers FOR DELETE
  USING (auth.role() = 'anon');

-- Drivers policies (used by office UI for driver management)
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers"
  ON drivers FOR INSERT
  WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers"
  ON drivers FOR UPDATE
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers"
  ON drivers FOR DELETE
  USING (auth.role() = 'anon');
