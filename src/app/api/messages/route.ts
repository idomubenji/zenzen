import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

type MessageResponse = {
  data?: Database['public']['Tables']['messages']['Row'];
  error?: { message: string };
};

type CreateMessageRequest = {
  content: string;
  ticket_id: string;
};

type UpdateMessageRequest = {
  content: string;
};

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

    const body = await request.json() as CreateMessageRequest;

    if (!body.content || !body.ticket_id) {
      return NextResponse.json(
        { error: { message: 'Content and ticket_id are required' } },
        { status: 400 }
      );
    }

    // Get user role and ticket
    const [userResponse, ticketResponse] = await Promise.all([
      supabase.from('users').select('role').eq('id', session.user.id).single(),
      supabase.from('tickets').select('*').eq('id', body.ticket_id).single()
    ]);

    if (userResponse.error || !userResponse.data) {
      return NextResponse.json(
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
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

    // Ensure customers can only message on their own tickets
    if (userData.role === 'customer' && ticket.customer_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Not authorized to message on this ticket' } },
        { status: 403 }
      );
    }

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content: body.content,
        ticket_id: body.ticket_id,
        user_id: session.user.id,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    // Update ticket status and timestamps based on role and current status
    const updates: Partial<Database['public']['Tables']['tickets']['Update']> = {
      updated_at: new Date().toISOString()
    };

    if (userData.role === 'customer' && ticket.status === 'resolved') {
      updates.status = 'reopened';
      updates.reopen_count = (ticket.reopen_count || 0) + 1;
    } else if (userData.role !== 'customer' && !ticket.first_response_at) {
      updates.first_response_at = new Date().toISOString();
      updates.status = 'in_progress';
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('tickets')
        .update(updates)
        .eq('id', body.ticket_id);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating message:', error);
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

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');
    const userId = searchParams.get('user_id');

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
        { status: 400 }
      );
    }

    // Get user role and ticket
    const [userResponse, ticketResponse] = await Promise.all([
      supabase.from('users').select('role').eq('id', session.user.id).single(),
      supabase.from('tickets').select('*').eq('id', ticketId).single()
    ]);

    if (userResponse.error || !userResponse.data) {
      return NextResponse.json(
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
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

    // Ensure customers can only view messages from their own tickets
    if (userData.role === 'customer' && ticket.customer_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Not authorized to view messages for this ticket' } },
        { status: 403 }
      );
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('timestamp', { ascending: true });

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

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching messages:', error);
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
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: { message: 'Message ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json() as UpdateMessageRequest;

    // Get user role and message
    const [userResponse, messageResponse] = await Promise.all([
      supabase.from('users').select('role').eq('id', session.user.id).single(),
      supabase.from('messages').select('*').eq('id', messageId).single()
    ]);

    if (userResponse.error || !userResponse.data) {
      return NextResponse.json(
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
      );
    }

    if (messageResponse.error || !messageResponse.data) {
      return NextResponse.json(
        { error: { message: 'Message not found' } },
        { status: 404 }
      );
    }

    const userData = userResponse.data;
    const message = messageResponse.data;

    // Only message author or administrators can update messages
    if (message.user_id !== session.user.id && userData.role !== 'admin') {
      return NextResponse.json(
        { error: { message: 'Not authorized to update this message' } },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .update(body)
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 