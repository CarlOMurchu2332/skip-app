import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { CreateJobRequest } from '@/lib/types';
import { sendJobNotification } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id, driver_id, truck_reg, job_date, notes, office_action, skip_size, truck_type } = body;

    if (!customer_id || !driver_id || !truck_reg || !job_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Generate docket number using Postgres function
    const { data: docketData, error: docketError } = await supabase.rpc(
      'generate_docket_number',
      { job_date }
    );

    if (docketError) {
      console.error('Docket generation error:', docketError);
      return NextResponse.json(
        { error: 'Failed to generate docket number' },
        { status: 500 }
      );
    }

    const docket_no = docketData;
    const job_token = uuidv4();

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('skip_jobs')
      .insert({
        customer_id,
        driver_id,
        truck_reg,
        job_date,
        docket_no,
        job_token,
        notes,
        office_action,
        skip_size,
        truck_type,
        status: 'created',
      })
      .select(`
        *,
        customer:customers(*),
        driver:drivers(*)
      `)
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    // Send SMS notification to the assigned driver
    let smsSent = false;
    if (job.driver?.phone) {
      const smsResult = await sendJobNotification(
        job.driver.phone,
        job.customer?.name || 'Unknown Customer',
        job.customer?.address,
        docket_no
      );
      smsSent = smsResult.success;
      if (!smsResult.success) {
        console.error('Failed to send SMS notification:', smsResult.error);
      }
    } else {
      console.log('No driver phone number available for SMS notification');
    }

    return NextResponse.json({ job, sms_sent: smsSent }, { status: 201 });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
