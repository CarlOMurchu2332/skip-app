-- Migration: Add in_progress status and started_at column
-- Run this on existing databases to support the driver portal

-- Step 1: Add the started_at column if it doesn't exist
ALTER TABLE skip_jobs 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Step 2: Update the status check constraint to include 'in_progress'
-- First, drop the existing constraint
ALTER TABLE skip_jobs 
DROP CONSTRAINT IF EXISTS skip_jobs_status_check;

-- Then add the new constraint with in_progress
ALTER TABLE skip_jobs 
ADD CONSTRAINT skip_jobs_status_check 
CHECK (status IN ('created', 'sent', 'in_progress', 'completed', 'cancelled'));

-- Note: Existing jobs will keep their current status
-- The new 'in_progress' status will only be used for new workflows
