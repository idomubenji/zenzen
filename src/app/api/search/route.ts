import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: { message: 'Search query is required' } },
        { status: 400 }
      );
    }

    const results: any = {};

    // Search tickets
    if (type === 'all' || type === 'tickets') {
      const { data: tickets, error: ticketError } = await supabaseServer
        .from('tickets')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (!ticketError) {
        results.tickets = tickets;
      }
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users, error: userError } = await supabaseServer
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (!userError) {
        results.users = users;
      }
    }

    // Search teams
    if (type === 'all' || type === 'teams') {
      const { data: teams, error: teamError } = await supabaseServer
        .from('teams')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);

      if (!teamError) {
        results.teams = teams;
      }
    }

    // Search messages
    if (type === 'all' || type === 'messages') {
      const { data: messages, error: messageError } = await supabaseServer
        .from('messages')
        .select('*')
        .ilike('content', `%${query}%`)
        .limit(limit);

      if (!messageError) {
        results.messages = messages;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 