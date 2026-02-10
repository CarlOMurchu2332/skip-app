import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ValidationErrors } from '@/lib/validate';
import { recordStatusChange } from '@/lib/status-history';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id } = body;

    const v = new ValidationErrors();
    v.requireUUID('job_id', job_id);
    if (v.hasErrors()) {
      return NextResponse.json(v.toResponse(), { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: job, error: fetchError } = await supabase
      .from('skip_jobs')
      .select('id, status')
      .eq('id', job_id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed') {
      return NextResponse.json({ error: 'Cannot delete completed jobs' }, { status: 400 });
    }

    // Record cancellation before deletion
    await recordStatusChange(supabase, job_id, job.status, 'cancelled', 'office');

    const { error: deleteError } = await supabase
      .from('skip_jobs')
      .delete()
      .eq('id', job_id);

    if (deleteError) {
      console.error('[delete] Job delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
