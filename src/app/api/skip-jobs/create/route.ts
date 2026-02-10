import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { sendJobNotification } from '@/lib/twilio';
import { ValidationErrors } from '@/lib/validate';
import { recordStatusChange } from '@/lib/status-history';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id, driver_id, truck_reg, job_date, notes, office_action, skip_size, truck_type } = body;

    // Validate required fields
    const v = new ValidationErrors();
    v.requireUUID('customer_id', customer_id);
    v.requireUUID('driver_id', driver_id);
    v.requireNonEmpty('truck_reg', truck_reg);
    v.requireDate('job_date', job_date);
    v.optionalAction('office_action', office_action);
    v.optionalSkipSize('skip_size', skip_size);

    if (v.hasErrors()) {
      return NextResponse.json(v.toResponse(), { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Generate docket number using Postgres function
    const { data: docketData, error: docketError } = await supabase.rpc(
      'generate_docket_number',
      { job_date }
    );

    if (docketError) {
      console.error('[create] Docket generation error:', docketError);
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
        truck_reg: truck_reg.trim(),
        job_date,
        docket_no,
        job_token,
        notes: notes?.trim() || null,
        office_action: office_action || null,
        skip_size: skip_size || null,
        truck_type: truck_type?.trim() || null,
        status: 'created',
      })
      .select(`
        *,
        customer:customers(*),
        driver:drivers(*)
      `)
      .single();

    if (jobError) {
      console.error('[create] Job creation error:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    // Record status history
    await recordStatusChange(supabase, job.id, null, 'created', 'office');

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
        console.error('[create] SMS notification failed:', smsResult.error);
      }
    } else {
      console.warn('[create] No driver phone for SMS notification');
    }

    return NextResponse.json({ job, sms_sent: smsSent }, { status: 201 });
  } catch (error) {
    console.error('[create] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
