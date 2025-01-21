import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function POST(
  request: Request,
  { params }: { params: { team_id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: { message: 'User ID is required' } },
        { status: 400 }
      );
    }

    // Get current user's role
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

    // Only administrators can add users to teams
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can manage team members' } },
        { status: 403 }
      );
    }

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', params.team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: { message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Verify user exists and is a worker
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user_id)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: { message: 'Target user not found' } },
        { status: 404 }
      );
    }

    if (targetUser.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can be added to teams' } },
        { status: 400 }
      );
    }

    // Add user to team
    const { error: insertError } = await supabase
      .from('user_teams')
      .insert({
        user_id,
        team_id: params.team_id
      });

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: { message: 'User is already a member of this team' } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: { message: insertError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'User added to team successfully' });
  } catch (error) {
    console.error('Error adding user to team:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { team_id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: { message: 'User ID is required' } },
        { status: 400 }
      );
    }

    // Get current user's role
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

    // Only administrators can remove users from teams
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can manage team members' } },
        { status: 403 }
      );
    }

    // Remove user from team
    const { error: deleteError } = await supabase
      .from('user_teams')
      .delete()
      .eq('team_id', params.team_id)
      .eq('user_id', userId);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'User removed from team successfully' });
  } catch (error) {
    console.error('Error removing user from team:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { team_id: string } }
) {
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

    // Only administrators and workers can view team members
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to view team members' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get team members with user details
    const { data, error, count } = await supabase
      .from('user_teams')
      .select(`
        user_id,
        users:user_id (
          id,
          name,
          email,
          role
        )
      `, { count: 'exact' })
      .eq('team_id', params.team_id)
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: data.map(item => item.users),
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 