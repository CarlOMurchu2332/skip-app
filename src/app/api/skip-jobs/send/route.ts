import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendJobNotification } from '@/lib/twilio';
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

    const { data: job, error: jobError } = await supabase
      .from('skip_jobs')
      .select(`
        *,
        customer:customers(name, address),
        driver:drivers(name, phone)
      `)
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed') {
      return NextResponse.json({ error: 'Job already completed' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const driverLink = `${appUrl}/driver/skip/${job.job_token}`;

    let messageSent = false;
    if (job.driver?.phone) {
      const result = await sendJobNotification(
        job.driver.phone,
        job.customer?.name || 'Unknown Customer',
        job.customer?.address,
        job.docket_no
      );
      messageSent = result.success;
      if (!result.success) {
        console.error('[send] SMS notification failed:', result.error);
      }
    } else {
      console.warn('[send] Missing driver phone');
    }

    const oldStatus = job.status;
    const { data: updatedJob, error: updateError } = await supabase
      .from('skip_jobs')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) {
      console.error('[send] Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
    }

    await recordStatusChange(supabase, job_id, oldStatus, 'sent', 'office');

    return NextResponse.json({
      job: updatedJob,
      message_sent: messageSent,
      driver_link: driverLink,
    });
  } catch (error) {
    console.error('[send] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
