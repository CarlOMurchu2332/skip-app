-- Add skip_size and truck_type columns to skip_jobs table
ALTER TABLE skip_jobs 
ADD COLUMN IF NOT EXISTS skip_size TEXT,
ADD COLUMN IF NOT EXISTS truck_type TEXT;
