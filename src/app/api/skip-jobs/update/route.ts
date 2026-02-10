import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ValidationErrors } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id, customer_id, driver_id, truck_reg, job_date, notes, office_action, skip_size, truck_type } = body;

    const v = new ValidationErrors();
    v.requireUUID('job_id', job_id);
    v.optionalUUID('customer_id', customer_id);
    v.optionalUUID('driver_id', driver_id);
    v.optionalAction('office_action', office_action);
    v.optionalSkipSize('skip_size', skip_size);
    if (job_date !== undefined) v.requireDate('job_date', job_date);

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
      return NextResponse.json({ error: 'Cannot edit completed jobs' }, { status: 400 });
    }

    // Build update object — only include provided fields
    const updateData: Record<string, unknown> = {};
    if (customer_id !== undefined) updateData.customer_id = customer_id;
    if (driver_id !== undefined) updateData.driver_id = driver_id;
    if (truck_reg !== undefined) updateData.truck_reg = truck_reg.trim();
    if (job_date !== undefined) updateData.job_date = job_date;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (office_action !== undefined) updateData.office_action = office_action || null;
    if (skip_size !== undefined) updateData.skip_size = skip_size || null;
    if (truck_type !== undefined) updateData.truck_type = truck_type?.trim() || null;

    const { data: updatedJob, error: updateError } = await supabase
      .from('skip_jobs')
      .update(updateData)
      .eq('id', job_id)
      .select(`
        *,
        customer:customers(*),
        driver:drivers(*)
      `)
      .single();

    if (updateError) {
      console.error('[update] Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error('[update] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
