-- Add pick_size and drop_size columns to skip_jobs table
-- These store the driver's selected skip sizes for pick/drop actions

ALTER TABLE skip_jobs
ADD COLUMN IF NOT EXISTS pick_size TEXT CHECK (pick_size IS NULL OR pick_size IN ('8', '12', '14', '16', '20', '35', '40')),
ADD COLUMN IF NOT EXISTS drop_size TEXT CHECK (drop_size IS NULL OR drop_size IN ('8', '12', '14', '16', '20', '35', '40'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_skip_jobs_pick_size ON skip_jobs(pick_size) WHERE pick_size IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skip_jobs_drop_size ON skip_jobs(drop_size) WHERE drop_size IS NOT NULL;

-- Comment explaining the columns
COMMENT ON COLUMN skip_jobs.pick_size IS 'Size of skip being picked up (removed from site)';
COMMENT ON COLUMN skip_jobs.drop_size IS 'Size of skip being dropped off (left on site)';
