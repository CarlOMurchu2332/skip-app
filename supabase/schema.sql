-- Skip App Supabase Schema
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- SEQUENCE for docket number counter
-- ============================================
CREATE SEQUENCE IF NOT EXISTS docket_seq START 1;

-- ============================================
-- CUSTOMERS table
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DRIVERS table
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SKIP_JOBS table
-- ============================================
CREATE TABLE IF NOT EXISTS skip_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  job_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  driver_id UUID REFERENCES drivers(id),
  truck_reg TEXT,
  docket_no TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'sent', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  job_token TEXT UNIQUE NOT NULL,
  notes TEXT,
  office_action TEXT CHECK (office_action IS NULL OR office_action IN ('drop', 'pick', 'pick_drop')),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- SKIP_JOB_COMPLETION table
-- ============================================
CREATE TABLE IF NOT EXISTS skip_job_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skip_job_id UUID REFERENCES skip_jobs(id) ON DELETE CASCADE,
  skip_size TEXT NOT NULL CHECK (skip_size IN ('8', '12', '14', '16', '20', '35', '40')),
  action TEXT NOT NULL CHECK (action IN ('drop', 'pick', 'pick_drop')),
  pick_size TEXT CHECK (pick_size IS NULL OR pick_size IN ('8', '12', '14', '16', '20', '35', '40')),
  drop_size TEXT CHECK (drop_size IS NULL OR drop_size IN ('8', '12', '14', '16', '20', '35', '40')),
  customer_signature TEXT,
  pick_lat DOUBLE PRECISION,
  pick_lng DOUBLE PRECISION,
  drop_lat DOUBLE PRECISION,
  drop_lng DOUBLE PRECISION,
  site_company TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  completed_time TIMESTAMPTZ DEFAULT NOW(),
  driver_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTION to generate docket number
-- Format: YYMMDD-####-IMR
-- ============================================
CREATE OR REPLACE FUNCTION generate_docket_number(job_date DATE)
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_part TEXT;
BEGIN
  date_part := TO_CHAR(job_date, 'YYMMDD');
  seq_part := LPAD(nextval('docket_seq')::TEXT, 4, '0');
  RETURN date_part || '-' || seq_part || '-IMR';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_skip_jobs_status ON skip_jobs(status);
CREATE INDEX IF NOT EXISTS idx_skip_jobs_job_date ON skip_jobs(job_date);
CREATE INDEX IF NOT EXISTS idx_skip_jobs_job_token ON skip_jobs(job_token);
CREATE INDEX IF NOT EXISTS idx_skip_jobs_customer_id ON skip_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_skip_jobs_driver_id ON skip_jobs(driver_id);

-- ============================================
-- SAMPLE DATA (optional - remove in production)
-- ============================================
-- INSERT INTO customers (name, address, contact_phone) VALUES
--   ('ABC Construction', '123 Main St, Dublin', '+353 1 234 5678'),
--   ('XYZ Builders', '456 High St, Meath', '+353 1 987 6543');

-- INSERT INTO drivers (name, phone) VALUES
--   ('John Murphy', '+353 87 123 4567'),
--   ('Mike O''Brien', '+353 86 987 6543');

-- ============================================
-- ROW LEVEL SECURITY (optional for MVP)
-- ============================================
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE skip_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE skip_job_completion ENABLE ROW LEVEL SECURITY;
