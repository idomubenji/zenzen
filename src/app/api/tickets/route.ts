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

    const { title, priority = 'NONE', tags = [], custom_fields = {} } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: { message: 'Title is required' } },
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

    // Only customers can create tickets
    if (userData.role !== 'Customer') {
      return NextResponse.json(
        { error: { message: 'Only customers can create tickets' } },
        { status: 403 }
      );
    }

    // Create ticket
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        customer_id: session.user.id,
        title,
        status: 'UNOPENED',
        priority,
        tags,
        custom_fields,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    console.error('Error creating ticket:', error);
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const customerId = searchParams.get('customer_id');
    const assignedTo = searchParams.get('assigned_to');
    const assignedTeam = searchParams.get('assigned_team');

    let query = supabase.from('tickets').select('*');

    // Customers can only see their own tickets
    if (userData.role === 'Customer') {
      query = query.eq('customer_id', session.user.id);
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (customerId && userData.role !== 'Customer') {
      query = query.eq('customer_id', customerId);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }
    if (assignedTeam) {
      query = query.eq('assigned_team', assignedTeam);
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
    console.error('Error fetching tickets:', error);
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
    const ticketId = searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
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

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: { message: 'Ticket not found' } },
        { status: 404 }
      );
    }

    // Customers can only update their own tickets
    if (userData.role === 'Customer' && ticket.customer_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to update this ticket' } },
        { status: 403 }
      );
    }

    let updates = await request.json();

    // Customers can only update title and custom_fields
    if (userData.role === 'Customer') {
      const { title, custom_fields } = updates;
      updates = { 
        ...(title && { title }), 
        ...(custom_fields && { custom_fields }) 
      };
    }

    // Track first response and resolution
    if (updates.status) {
      if (ticket.status === 'UNOPENED' && updates.status === 'IN PROGRESS') {
        updates.first_response_at = new Date().toISOString();
      }
      if (updates.status === 'RESOLVED' && !ticket.resolved_at) {
        updates.resolved_at = new Date().toISOString();
      }
      if (ticket.status === 'RESOLVED' && updates.status !== 'RESOLVED') {
        updates.reopen_count = (ticket.reopen_count || 0) + 1;
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
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
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 