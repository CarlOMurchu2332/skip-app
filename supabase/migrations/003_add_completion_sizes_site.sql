-- Add pick/drop sizes and site company to completion
ALTER TABLE skip_job_completion
  ADD COLUMN IF NOT EXISTS pick_size TEXT CHECK (pick_size IS NULL OR pick_size IN ('8','12','14','16','20','35','40')),
  ADD COLUMN IF NOT EXISTS drop_size TEXT CHECK (drop_size IS NULL OR drop_size IN ('8','12','14','16','20','35','40')),
  ADD COLUMN IF NOT EXISTS site_company TEXT;
