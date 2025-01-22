import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

type DbUser = Database['public']['Tables']['users']['Row'];
type TeamMemberResponse = {
  user_id: string;
  users: Pick<DbUser, 'id' | 'name' | 'email' | 'role'>;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { team_id: string } }
) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: { message: 'User ID is required' } },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from('user_teams')
      .insert([
        {
          team_id: params.team_id,
          user_id: user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: { message: 'Failed to add user to team' } },
        { status: 500 }
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
  request: NextRequest,
  { params }: { params: { team_id: string } }
) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: { message: 'User ID is required' } },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('user_teams')
      .delete()
      .eq('team_id', params.team_id)
      .eq('user_id', user_id);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: 'Failed to remove user from team' } },
        { status: 500 }
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
  request: NextRequest,
  { params }: { params: { team_id: string } }
) {
  const cookieStore = cookies();
  const supabase = createClient();

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
      data: (data as unknown as TeamMemberResponse[])
        .map(item => item.users)
        .filter((user): user is Pick<DbUser, 'id' | 'name' | 'email' | 'role'> => user !== null),
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