import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendJobNotification } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

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

    // Get job with driver info
    const { data: job, error: jobError } = await supabase
      .from('skip_jobs')
      .select(`
        *,
        customer:customers(name),
        driver:drivers(name, phone)
      `)
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'Job already completed' },
        { status: 400 }
      );
    }

    // Build driver link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const driverLink = `${appUrl}/driver/skip/${job.job_token}`;

    // Send SMS notification via Twilio
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
        console.error('Failed to send SMS notification:', result.error);
      }
    } else {
      console.error('Missing driver phone');
    }

    // Update job status to 'sent'
    const { data: updatedJob, error: updateError } = await supabase
      .from('skip_jobs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) {
      console.error('Job update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update job status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      job: updatedJob,
      message_sent: messageSent,
      driver_link: driverLink,
    });
  } catch (error) {
    console.error('Send job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
