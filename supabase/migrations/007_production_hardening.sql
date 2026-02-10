-- ============================================
-- 007: Production Hardening
-- Audit fields, RLS, indexes, constraints
-- ============================================

-- 1) AUDIT FIELDS
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE drivers   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE skip_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE skip_jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2) AUTO-UPDATE TRIGGER for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_drivers_updated ON drivers;
CREATE TRIGGER trg_drivers_updated
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_skip_jobs_updated ON skip_jobs;
CREATE TRIGGER trg_skip_jobs_updated
  BEFORE UPDATE ON skip_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3) ROW LEVEL SECURITY
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE skip_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skip_job_completion ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to run if they don't exist)
DROP POLICY IF EXISTS "service_role_all_customers" ON customers;
DROP POLICY IF EXISTS "service_role_all_drivers" ON drivers;
DROP POLICY IF EXISTS "service_role_all_skip_jobs" ON skip_jobs;
DROP POLICY IF EXISTS "service_role_all_completions" ON skip_job_completion;
DROP POLICY IF EXISTS "anon_read_customers" ON customers;
DROP POLICY IF EXISTS "anon_read_drivers" ON drivers;
DROP POLICY IF EXISTS "anon_read_skip_jobs" ON skip_jobs;
DROP POLICY IF EXISTS "anon_read_completions" ON skip_job_completion;

-- Service role full access
CREATE POLICY "service_role_all_customers"
  ON customers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_drivers"
  ON drivers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_skip_jobs"
  ON skip_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_completions"
  ON skip_job_completion FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon role read-only
CREATE POLICY "anon_read_customers"
  ON customers FOR SELECT
  USING (auth.role() = 'anon');

CREATE POLICY "anon_read_drivers"
  ON drivers FOR SELECT
  USING (auth.role() = 'anon');

CREATE POLICY "anon_read_skip_jobs"
  ON skip_jobs FOR SELECT
  USING (auth.role() = 'anon');

CREATE POLICY "anon_read_completions"
  ON skip_job_completion FOR SELECT
  USING (auth.role() = 'anon');

-- 4) ADDITIONAL INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_skip_jobs_deleted_at ON skip_jobs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_skip_jobs_completed_at ON skip_jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_skip_job_completion_skip_job_id ON skip_job_completion(skip_job_id);

-- 5) STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS skip_job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skip_job_id UUID NOT NULL REFERENCES skip_jobs(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_status_history_job ON skip_job_status_history(skip_job_id);

ALTER TABLE skip_job_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_status_history" ON skip_job_status_history;
CREATE POLICY "service_role_all_status_history"
  ON skip_job_status_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "anon_read_status_history" ON skip_job_status_history;
CREATE POLICY "anon_read_status_history"
  ON skip_job_status_history FOR SELECT
  USING (auth.role() = 'anon');
