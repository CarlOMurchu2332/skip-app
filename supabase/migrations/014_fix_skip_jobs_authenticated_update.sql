-- ============================================
-- 014: Fix authenticated UPDATE policies for skip_jobs
-- Migration 013 added SELECT but missed UPDATE/INSERT for skip_jobs
-- Drivers need to update job details and complete jobs
-- ============================================

-- Add UPDATE policy for skip_jobs
DROP POLICY IF EXISTS "client_update_skip_jobs" ON public.skip_jobs;
CREATE POLICY "client_update_skip_jobs"
  ON public.skip_jobs FOR UPDATE
  USING (auth.role() IN ('anon','authenticated'))
  WITH CHECK (auth.role() IN ('anon','authenticated'));

-- Add INSERT policy for skip_job_completion
DROP POLICY IF EXISTS "client_insert_completions" ON public.skip_job_completion;
CREATE POLICY "client_insert_completions"
  ON public.skip_job_completion FOR INSERT
  WITH CHECK (auth.role() IN ('anon','authenticated'));
