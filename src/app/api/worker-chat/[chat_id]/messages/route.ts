import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { chat_id: string } }
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

    // Only workers can view messages
    if (userData.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can view messages' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get messages
    const { data, error, count } = await supabase
      .from('worker_chat_messages')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          role
        )
      `, { count: 'exact' })
      .eq('chat_id', params.chat_id)
      .range(offset, offset + limit - 1)
      .order('timestamp', { ascending: false });

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

export async function POST(
  request: NextRequest,
  { params }: { params: { chat_id: string } }
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

    // Only workers can send messages
    if (userData.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can send messages' } },
        { status: 403 }
      );
    }

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: { message: 'Message content is required' } },
        { status: 400 }
      );
    }

    // Create message
    const { data, error } = await supabase
      .from('worker_chat_messages')
      .insert({
        chat_id: params.chat_id,
        user_id: session.user.id,
        content,
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

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chat_id: string } }
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

    // Only workers can delete messages
    if (userData.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can delete messages' } },
        { status: 403 }
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

    // Verify message exists and belongs to the user
    const { data: message, error: messageError } = await supabase
      .from('worker_chat_messages')
      .select('user_id')
      .eq('id', messageId)
      .eq('chat_id', params.chat_id)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: { message: 'Message not found' } },
        { status: 404 }
      );
    }

    if (message.user_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Not authorized to delete this message' } },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('worker_chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 