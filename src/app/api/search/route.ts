import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

type SearchResponse = {
  tickets?: any[];
  users?: any[];
  teams?: any[];
  messages?: any[];
  error?: {
    message: string;
  };
};

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
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: { message: 'Search query is required' } },
        { status: 400 }
      );
    }

    const results: SearchResponse = {};

    // Search tickets
    if (type === 'all' || type === 'tickets') {
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (!ticketError && tickets) {
        results.tickets = tickets;
      }
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (!userError && users) {
        results.users = users;
      }
    }

    // Search teams
    if (type === 'all' || type === 'teams') {
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);

      if (!teamError && teams) {
        results.teams = teams;
      }
    }

    // Search messages
    if (type === 'all' || type === 'messages') {
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .ilike('content', `%${query}%`)
        .limit(limit);

      if (!messageError && messages) {
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