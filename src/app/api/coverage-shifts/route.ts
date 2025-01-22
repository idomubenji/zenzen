import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();

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
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    // Only administrators can create shifts
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can create shifts' } },
        { status: 403 }
      );
    }

    // Check for overlapping shifts
    const { data: existingShifts, error: overlapError } = await supabaseServer
      .from('coverage_shifts')
      .select('*')
      .eq('worker_id', worker_id)
      .or(`start_time.lte.${end_time},end_time.gte.${start_time}`);

    if (overlapError) {
      return NextResponse.json(
        { error: { message: overlapError.message } },
        { status: 400 }
      );
    }

    if (existingShifts && existingShifts.length > 0) {
      return NextResponse.json(
        { error: { message: 'Shift overlaps with existing shifts' } },
        { status: 400 }
      );
    }

    // Create shift
    const { data, error } = await supabaseServer
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
        { error: { message: error.message } },
        { status: 400 }
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
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    // Only administrators and workers can view shifts
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to view shifts' } },
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

    let query = supabaseServer
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
        { error: { message: error.message } },
        { status: 400 }
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
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();

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
        { error: { message: 'Shift ID is required' } },
        { status: 400 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    // Only administrators can update shifts
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can update shifts' } },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Validate time range if both times are provided
    if (updates.start_time && updates.end_time) {
      if (new Date(updates.start_time) >= new Date(updates.end_time)) {
        return NextResponse.json(
          { error: { message: 'End time must be after start time' } },
          { status: 400 }
        );
      }
    }

    // Check for overlapping shifts if times are being updated
    if (updates.start_time || updates.end_time) {
      const { data: shift } = await supabaseServer
        .from('coverage_shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shift) {
        const startTime = updates.start_time || shift.start_time;
        const endTime = updates.end_time || shift.end_time;

        // Check for overlapping shifts for the same worker
        if (shift.worker_id) {
          const { data: overlappingShifts, error: overlapError } = await supabaseServer
            .from('coverage_shifts')
            .select('*')
            .eq('worker_id', shift.worker_id)
            .neq('id', shiftId)
            .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

          if (overlapError) {
            return NextResponse.json(
              { error: { message: 'Error checking for overlapping shifts' } },
              { status: 500 }
            );
          }

          if (overlappingShifts && overlappingShifts.length > 0) {
            return NextResponse.json(
              { error: { message: 'Worker already has a shift during this time' } },
              { status: 400 }
            );
          }
        }
      }
    }

    const { data, error } = await supabaseServer
      .from('coverage_shifts')
      .update(updates)
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
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