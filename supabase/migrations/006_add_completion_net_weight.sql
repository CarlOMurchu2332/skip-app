-- Add net_weight_kg and material_type columns to skip_job_completion table

ALTER TABLE skip_job_completion
ADD COLUMN IF NOT EXISTS net_weight_kg NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS material_type TEXT;

-- Add comment to describe the columns
COMMENT ON COLUMN skip_job_completion.net_weight_kg IS 'Net weight of the skip contents in kilograms';
COMMENT ON COLUMN skip_job_completion.material_type IS 'Type of material in the skip (e.g., Metal, Wood, General Waste)';
