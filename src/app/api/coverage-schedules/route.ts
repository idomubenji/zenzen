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

    const { team_id, start_date, end_date, timezone } = await request.json();

    // Validate required fields
    if (!start_date || !end_date || !timezone) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Validate date range
    if (new Date(start_date) >= new Date(end_date)) {
      return NextResponse.json(
        { error: { message: 'End date must be after start date' } },
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

    // Only administrators can create schedules
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can create schedules' } },
        { status: 403 }
      );
    }

    // Check for overlapping schedules if team_id is provided
    if (team_id) {
      const { data: existingSchedules, error: overlapError } = await supabaseServer
        .from('coverage_schedules')
        .select('*')
        .eq('team_id', team_id)
        .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

      if (overlapError) {
        return NextResponse.json(
          { error: { message: overlapError.message } },
          { status: 400 }
        );
      }

      if (existingSchedules && existingSchedules.length > 0) {
        return NextResponse.json(
          { error: { message: 'Schedule overlaps with existing schedules for this team' } },
          { status: 400 }
        );
      }
    }

    // Create schedule
    const { data, error } = await supabaseServer
      .from('coverage_schedules')
      .insert({
        team_id,
        start_date,
        end_date,
        timezone,
        created_by: session.user.id
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
    console.error('Error creating schedule:', error);
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

    // Only administrators and workers can view schedules
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to view schedules' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('coverage_schedules')
      .select('*, team:team_id(*), created_by:created_by(*)', { count: 'exact' });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('end_date', endDate);
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
    console.error('Error fetching schedules:', error);
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
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: { message: 'Schedule ID is required' } },
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

    // Only administrators can update schedules
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can update schedules' } },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Validate date range if both dates are provided
    if (updates.start_date && updates.end_date) {
      if (new Date(updates.start_date) >= new Date(updates.end_date)) {
        return NextResponse.json(
          { error: { message: 'End date must be after start date' } },
          { status: 400 }
        );
      }
    }

    // Check for overlapping schedules if dates are being updated
    if (updates.start_date || updates.end_date || updates.team_id) {
      const { data: schedule } = await supabaseServer
        .from('coverage_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (schedule) {
        const startDate = updates.start_date || schedule.start_date;
        const endDate = updates.end_date || schedule.end_date;
        const teamId = updates.team_id || schedule.team_id;

        if (teamId) {
          const { data: overlappingSchedules, error: overlapError } = await supabaseServer
            .from('coverage_schedules')
            .select('*')
            .eq('team_id', teamId)
            .neq('id', scheduleId)
            .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

          if (overlapError) {
            return NextResponse.json(
              { error: { message: 'Error checking for overlapping schedules' } },
              { status: 500 }
            );
          }

          if (overlappingSchedules && overlappingSchedules.length > 0) {
            return NextResponse.json(
              { error: { message: 'Schedule overlaps with existing schedules for this team' } },
              { status: 400 }
            );
          }
        }
      }
    }

    const { data, error } = await supabaseServer
      .from('coverage_schedules')
      .update(updates)
      .eq('id', scheduleId)
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
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 