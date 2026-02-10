-- ============================================
-- 011: Allow authenticated browser users to perform office CRUD
-- Fixes 403/RLS errors after login (auth.role() = 'authenticated')
-- ============================================

-- Customers policies
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;

CREATE POLICY "client_insert_customers"
  ON customers FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "client_update_customers"
  ON customers FOR UPDATE
  USING (auth.role() IN ('anon', 'authenticated'))
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "client_delete_customers"
  ON customers FOR DELETE
  USING (auth.role() IN ('anon', 'authenticated'));

-- Drivers policies (used by office UI for driver management)
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;

CREATE POLICY "client_insert_drivers"
  ON drivers FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "client_update_drivers"
  ON drivers FOR UPDATE
  USING (auth.role() IN ('anon', 'authenticated'))
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "client_delete_drivers"
  ON drivers FOR DELETE
  USING (auth.role() IN ('anon', 'authenticated'));
