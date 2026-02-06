import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id } = body;

    if (!job_id) {
      return NextResponse.json(
        { error: 'Missing job_id' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get the job first to check its status
    const { data: job, error: fetchError } = await supabase
      .from('skip_jobs')
      .select('id, status')
      .eq('id', job_id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only allow starting jobs that are 'sent' or 'created'
    if (job.status !== 'sent' && job.status !== 'created') {
      return NextResponse.json(
        { error: `Cannot start job with status: ${job.status}` },
        { status: 400 }
      );
    }

    const startedAt = new Date().toISOString();

    // Update job status to in_progress
    const { data: updatedJob, error: updateError } = await supabase
      .from('skip_jobs')
      .update({
        status: 'in_progress',
        started_at: startedAt,
      })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) {
      console.error('Job update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to start job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Start job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
