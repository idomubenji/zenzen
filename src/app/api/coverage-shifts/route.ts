import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

type CoverageShift = Database['public']['Tables']['coverage_shifts']['Row'];

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { schedule_id, worker_id, start_time, end_time } = await request.json();

    // Validate required fields
    if (!schedule_id || !worker_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Validate time range
    if (new Date(start_time) >= new Date(end_time)) {
      return NextResponse.json(
        { error: { message: 'End time must be after start time' } },
        { status: 400 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
      );
    }

    // Only admin and manager roles can create shifts
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    // Check for overlapping shifts
    const { data: existingShifts, error: overlapError } = await supabase
      .from('coverage_shifts')
      .select('*')
      .eq('worker_id', worker_id)
      .or(`start_time.lte.${end_time},end_time.gte.${start_time}`);

    if (overlapError) {
      return NextResponse.json(
        { error: { message: 'Failed to check for overlapping shifts' } },
        { status: 500 }
      );
    }

    if (existingShifts && existingShifts.length > 0) {
      return NextResponse.json(
        { error: { message: 'Shift overlaps with existing shifts' } },
        { status: 400 }
      );
    }

    // Create shift
    const { data, error } = await supabase
      .from('coverage_shifts')
      .insert({
        schedule_id,
        worker_id,
        start_time,
        end_time
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: 'Failed to create shift' } },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
      );
    }

    // Only admin, manager, and worker roles can view shifts
    if (!['admin', 'manager', 'worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('schedule_id');
    const workerId = searchParams.get('worker_id');
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('coverage_shifts')
      .select('*, worker:worker_id(*), schedule:schedule_id(*)', { count: 'exact' });

    if (scheduleId) {
      query = query.eq('schedule_id', scheduleId);
    }
    if (workerId) {
      query = query.eq('worker_id', workerId);
    }
    if (startTime) {
      query = query.gte('start_time', startTime);
    }
    if (endTime) {
      query = query.lte('end_time', endTime);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: { message: 'Failed to fetch shifts' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('id');

    if (!shiftId) {
      return NextResponse.json(
        { error: { message: 'Missing shift ID' } },
        { status: 400 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
      );
    }

    // Only admin and manager roles can update shifts
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Validate time range if updating times
    if (updates.start_time && updates.end_time) {
      if (new Date(updates.start_time) >= new Date(updates.end_time)) {
        return NextResponse.json(
          { error: { message: 'End time must be after start time' } },
          { status: 400 }
        );
      }
    }

    // Update shift
    const { data, error } = await supabase
      .from('coverage_shifts')
      .update(updates)
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: 'Failed to update shift' } },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 