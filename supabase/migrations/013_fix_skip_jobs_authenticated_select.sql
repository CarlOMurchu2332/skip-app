-- ============================================
-- 013: Fix authenticated SELECT policies for skip_jobs
-- Migration 012 fixed customers/drivers but missed skip_jobs
-- ============================================

-- Ensure RLS enabled
ALTER TABLE public.skip_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skip_job_completion ENABLE ROW LEVEL SECURITY;

-- Reset skip_jobs policies
DROP POLICY IF EXISTS "anon_read_skip_jobs" ON public.skip_jobs;
DROP POLICY IF EXISTS "client_read_skip_jobs" ON public.skip_jobs;

CREATE POLICY "client_read_skip_jobs"
  ON public.skip_jobs FOR SELECT
  USING (auth.role() IN ('anon','authenticated'));

-- Reset skip_job_completion policies
DROP POLICY IF EXISTS "anon_read_completions" ON public.skip_job_completion;
DROP POLICY IF EXISTS "client_read_completions" ON public.skip_job_completion;

CREATE POLICY "client_read_completions"
  ON public.skip_job_completion FOR SELECT
  USING (auth.role() IN ('anon','authenticated'));
