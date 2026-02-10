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

    if (job.status !== 'sent' && job.status !== 'created') {
      return NextResponse.json(
        { error: `Cannot start job with status: ${job.status}` },
        { status: 400 }
      );
    }

    const oldStatus = job.status;
    const { data: updatedJob, error: updateError } = await supabase
      .from('skip_jobs')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) {
      console.error('[start] Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to start job' }, { status: 500 });
    }

    await recordStatusChange(supabase, job_id, oldStatus, 'in_progress', 'driver');

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('[start] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
