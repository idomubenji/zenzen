import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assigned_to');
    const assignedTeam = searchParams.get('assigned_team');
    const customerId = searchParams.get('customer_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

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

    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          role
        ),
        assignee:assigned_to (
          id,
          name,
          email,
          role
        ),
        team:assigned_team (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply role-based filters
    if (userData.role === 'Customer') {
      query = query.eq('customer_id', session.user.id);
    } else if (userData.role === 'Worker') {
      // Get user's teams first
      const { data: userTeams } = await supabase
        .from('user_teams')
        .select('team_id')
        .eq('user_id', session.user.id);

      const teamIds = (userTeams?.map(ut => ut.team_id) || [])
        .filter((id): id is string => id !== null);

      // Get teams data
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      // Get team members
      const { data: teamMembers } = await supabase
        .from('user_teams')
        .select('user_id')
        .in('team_id', teamIds);

      const memberIds = teamMembers
        ?.map((member: { user_id: string | null }) => member.user_id)
        .filter((id): id is string => id !== null) || [];

      // Get workers data
      const { data: workers } = await supabase
        .from('users')
        .select('*')
        .in('id', memberIds)
        .eq('role', 'Worker');

      const workerIds = workers?.map(worker => worker.id) || [];
        
      query = query.or(
        `assigned_to.eq.${session.user.id}${workerIds.length ? `,assigned_team.in.(${workerIds.join(',')})` : ''}`
      );
    }

    // Apply filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (assignedTeam) query = query.eq('assigned_team', assignedTeam);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        pages: totalPages,
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error listing tickets:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { title, description, priority, assigned_to, assigned_team } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: title and description are required' } },
        { status: 400 }
      );
    }

    // Create ticket
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        priority: priority || 'NONE',
        status: 'UNOPENED',
        customer_id: session.user.id,
        assigned_to,
        assigned_team,
        created_at: new Date().toISOString(),
        reopen_count: 0
      })
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          role
        ),
        assignee:assigned_to (
          id,
          name,
          email,
          role
        ),
        team:assigned_team (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating ticket:', error);
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
    const ticketId = searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
        { status: 400 }
      );
    }

    // Get user role and ticket details
    const [{ data: userData, error: userError }, { data: ticket, error: ticketError }] = await Promise.all([
      supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('tickets')
        .select('customer_id, assigned_to, assigned_team')
        .eq('id', ticketId)
        .single()
    ]);

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: { message: 'Ticket not found' } },
        { status: 404 }
      );
    }

    // Check if user has permission to update the ticket
    const canAccess = await Promise.all([
      // Check if user is assigned to ticket
      ticket.assigned_to === session.user.id,
      // Get team member
      ticket.assigned_team && supabase
        .from('user_teams')
        .select('user_id')
        .eq('team_id', ticket.assigned_team)
        .eq('user_id', session.user.id)
        .maybeSingle()
    ]) ||
    (userData.role === 'Customer' && ticket.customer_id === session.user.id);

    if (!canAccess) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to update this ticket' } },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Customers can only update description
    if (userData.role === 'Customer' && Object.keys(updates).some(key => key !== 'description')) {
      return NextResponse.json(
        { error: { message: 'Customers can only update ticket description' } },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          role
        ),
        assignee:assigned_to (
          id,
          name,
          email,
          role
        ),
        team:assigned_team (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    // Only administrators can delete tickets
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can delete tickets' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 