import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
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
    const { data: existingShifts, error: overlapError } = await supabase
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

export async function GET(request: Request) {
  try {
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

    let query = supabase.from('coverage_shifts').select('*');

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

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
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
        { error: { message: 'Shift ID is required' } },
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
      const { data: shift } = await supabase
        .from('coverage_shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shift) {
        const startTime = updates.start_time || shift.start_time;
        const endTime = updates.end_time || shift.end_time;

        const { data: existingShifts } = await supabase
          .from('coverage_shifts')
          .select('*')
          .eq('worker_id', shift.worker_id)
          .neq('id', shiftId)
          .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

        if (existingShifts && existingShifts.length > 0) {
          return NextResponse.json(
            { error: { message: 'Shift overlaps with existing shifts' } },
            { status: 400 }
          );
        }
      }
    }

    const { data, error } = await supabase
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