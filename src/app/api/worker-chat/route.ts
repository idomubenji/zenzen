import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

type WorkerChat = Database['public']['Tables']['worker_chat']['Row'];

export async function POST(request: NextRequest) {
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

    // Only workers can create chat rooms
    if (userData.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can create chat rooms' } },
        { status: 403 }
      );
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: { message: 'Chat room title is required' } },
        { status: 400 }
      );
    }

    // Create chat room
    const { data, error } = await supabase
      .from('worker_chat')
      .insert({
        title,
        creation_date: new Date().toISOString()
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
    console.error('Error creating chat room:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Only workers can view chat rooms
    if (userData.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can view chat rooms' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('worker_chat')
      .select(`
        *,
        creator:created_by (
          id,
          name,
          email,
          role
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

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
    console.error('Error listing chat rooms:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Only workers can delete chat rooms
    if (userData.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Only workers can delete chat rooms' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('id');

    if (!chatId) {
      return NextResponse.json(
        { error: { message: 'Chat room ID is required' } },
        { status: 400 }
      );
    }

    // Verify chat room exists and belongs to the user
    const { data: chatRoom, error: chatError } = await supabase
      .from('worker_chat')
      .select('creation_date')
      .eq('id', chatId)
      .single();

    if (chatError || !chatRoom) {
      return NextResponse.json(
        { error: { message: 'Chat room not found' } },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('worker_chat')
      .delete()
      .eq('id', chatId);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat room:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 