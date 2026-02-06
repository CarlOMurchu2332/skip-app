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

    // Check if job exists
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

    // Prevent deleting completed jobs
    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed jobs' },
        { status: 400 }
      );
    }

    // Delete the job (hard delete)
    const { error: deleteError } = await supabase
      .from('skip_jobs')
      .delete()
      .eq('id', job_id);

    if (deleteError) {
      console.error('Delete job error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
