-- ============================================
-- RESET: Wipe jobs + customers, keep drivers
-- Run in Supabase SQL Editor
-- ============================================

BEGIN;

-- 1) Remove all status history
TRUNCATE TABLE skip_job_status_history RESTART IDENTITY CASCADE;

-- 2) Remove all job completion rows
TRUNCATE TABLE skip_job_completion RESTART IDENTITY CASCADE;

-- 3) Remove all jobs
TRUNCATE TABLE skip_jobs RESTART IDENTITY CASCADE;

-- 4) Remove all customers/clients
TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

-- 5) Reset docket counter back to 1
ALTER SEQUENCE docket_seq RESTART WITH 1;

COMMIT;

-- Verify: should all return 0 rows
SELECT 'skip_job_status_history' AS tbl, COUNT(*) FROM skip_job_status_history
UNION ALL
SELECT 'skip_job_completion', COUNT(*) FROM skip_job_completion
UNION ALL
SELECT 'skip_jobs', COUNT(*) FROM skip_jobs
UNION ALL
SELECT 'customers', COUNT(*) FROM customers;

-- Verify: drivers still intact
SELECT 'drivers', COUNT(*) FROM drivers;
