import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Record a status change in the skip_job_status_history table.
 * Fire-and-forget: logs errors but never throws.
 */
export async function recordStatusChange(
  supabase: SupabaseClient,
  skipJobId: string,
  oldStatus: string | null,
  newStatus: string,
  changedBy: string = 'system'
) {
  try {
    const { error } = await supabase
      .from('skip_job_status_history')
      .insert({
        skip_job_id: skipJobId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
      });

    if (error) {
      console.error('[status-history] insert error:', error.message);
    }
  } catch (err) {
    console.error('[status-history] unexpected error:', err);
  }
}
