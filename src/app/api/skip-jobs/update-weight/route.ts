import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { completion_id, net_weight_kg, material_type } = body;

    if (!completion_id) {
      return NextResponse.json(
        { error: 'Missing completion_id' },
        { status: 400 }
      );
    }

    // Validate net_weight_kg is a number or null
    if (net_weight_kg !== null && (typeof net_weight_kg !== 'number' || net_weight_kg < 0)) {
      return NextResponse.json(
        { error: 'Invalid net_weight_kg value' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Update the completion record
    const updateData: { net_weight_kg: number | null; material_type?: string | null } = { net_weight_kg };
    if (material_type !== undefined) {
      updateData.material_type = material_type || null;
    }

    const { data, error } = await supabase
      .from('skip_job_completion')
      .update(updateData)
      .eq('id', completion_id)
      .select()
      .single();

    if (error) {
      console.error('Update weight error:', error);
      return NextResponse.json(
        { error: 'Failed to update weight' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completion: data,
    });
  } catch (error) {
    console.error('Update weight error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
