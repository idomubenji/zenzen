import { NextRequest, NextResponse } from 'next/server';
import { CreateMessageRequest, MessageResponse, MessagesResponse, UpdateMessageRequest } from '@/types/api';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json<MessageResponse>(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateMessageRequest;
    const { ticket_id, content } = body;

    // Validate required fields
    if (!ticket_id || !content) {
      return NextResponse.json<MessageResponse>(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Get user role and ticket
    const [userResponse, ticketResponse] = await Promise.all([
      supabase.from('users').select('role').eq('id', session.user.id).single(),
      supabase.from('tickets').select('*').eq('id', ticket_id).single()
    ]);

    if (userResponse.error || !userResponse.data) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    if (ticketResponse.error || !ticketResponse.data) {
      return NextResponse.json(
        { error: { message: 'Ticket not found' } },
        { status: 404 }
      );
    }

    const userData = userResponse.data;
    const ticket = ticketResponse.data;

    // Customers can only message on their own tickets
    if (userData.role === 'Customer' && ticket.customer_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to message on this ticket' } },
        { status: 403 }
      );
    }

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ticket_id,
        user_id: session.user.id,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    // Update ticket status and timestamps
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // If this is the first response from a worker
    if (userData.role !== 'Customer' && ticket.status === 'UNOPENED') {
      updates.status = 'IN PROGRESS';
      updates.first_response_at = new Date().toISOString();
    }

    await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticket_id);

    return NextResponse.json<MessageResponse>({ data });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json<MessageResponse>(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json<MessagesResponse>(
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
    const ticketId = searchParams.get('ticket_id');
    const userId = searchParams.get('user_id');

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
        { status: 400 }
      );
    }

    // If customer, verify they own the ticket
    if (userData.role === 'Customer') {
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('customer_id')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket || ticket.customer_id !== session.user.id) {
        return NextResponse.json(
          { error: { message: 'Unauthorized to view messages for this ticket' } },
          { status: 403 }
        );
      }
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json<MessagesResponse>({ data });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json<MessagesResponse>(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json<MessageResponse>(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateMessageRequest;
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: { message: 'Message ID is required' } },
        { status: 400 }
      );
    }

    // Get message and user role
    const [messageResponse, userResponse] = await Promise.all([
      supabase.from('messages').select('*').eq('id', id).single(),
      supabase.from('users').select('role').eq('id', session.user.id).single()
    ]);

    if (messageResponse.error || !messageResponse.data) {
      return NextResponse.json(
        { error: { message: 'Message not found' } },
        { status: 404 }
      );
    }

    if (userResponse.error || !userResponse.data) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    const message = messageResponse.data;
    const userData = userResponse.data;

    // Users can only edit their own messages
    if (message.user_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to edit this message' } },
        { status: 403 }
      );
    }

    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: { message: 'Content is required' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json<MessageResponse>({ data });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json<MessageResponse>(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 