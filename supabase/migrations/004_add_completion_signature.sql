-- Add customer signature to completion
ALTER TABLE skip_job_completion
  ADD COLUMN IF NOT EXISTS customer_signature TEXT;
