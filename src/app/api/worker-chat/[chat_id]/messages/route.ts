import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function POST(
  request: Request,
  { params }: { params: { chat_id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: { message: 'Message content is required' } },
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

    // Only workers and administrators can send messages
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only workers and administrators can send messages' } },
        { status: 403 }
      );
    }

    // Verify chat room exists
    const { data: chatRoom, error: chatError } = await supabase
      .from('worker_chat')
      .select('id')
      .eq('id', params.chat_id)
      .single();

    if (chatError || !chatRoom) {
      return NextResponse.json(
        { error: { message: 'Chat room not found' } },
        { status: 404 }
      );
    }

    // Create message
    const { data, error } = await supabase
      .from('worker_chat_messages')
      .insert({
        worker_chat_id: params.chat_id,
        user_id: session.user.id,
        content,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        users:user_id (
          id,
          name,
          role
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
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { chat_id: string } }
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

    // Only workers and administrators can view messages
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only workers and administrators can view messages' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('worker_chat_messages')
      .select(`
        *,
        users:user_id (
          id,
          name,
          role
        )
      `, { count: 'exact' })
      .eq('worker_chat_id', params.chat_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { chat_id: string } }
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
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: { message: 'Message ID is required' } },
        { status: 400 }
      );
    }

    // Get user role and message details
    const [{ data: userData, error: userError }, { data: message, error: messageError }] = await Promise.all([
      supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('worker_chat_messages')
        .select('user_id')
        .eq('id', messageId)
        .eq('worker_chat_id', params.chat_id)
        .single()
    ]);

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    if (messageError || !message) {
      return NextResponse.json(
        { error: { message: 'Message not found' } },
        { status: 404 }
      );
    }

    // Only message author or administrators can delete messages
    if (userData.role !== 'Administrator' && message.user_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to delete this message' } },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('worker_chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('worker_chat_id', params.chat_id);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 