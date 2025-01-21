import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const entities = searchParams.getAll('entities[]') || ['tickets', 'messages', 'help_articles'];
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!query) {
      return NextResponse.json(
        { error: { message: 'Search query is required' } },
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

    const results: any = { data: [] };
    let totalCount = 0;

    // Search tickets if requested
    if (entities.includes('tickets')) {
      let ticketQuery = supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_id (
            id,
            name,
            role
          ),
          assignee:assigned_to (
            id,
            name,
            role
          )
        `, { count: 'exact' })
        .or(`title.ilike.%${query}%,custom_fields->>'description'.ilike.%${query}%`);

      // Apply role-based filters
      if (userData.role === 'Customer') {
        ticketQuery = ticketQuery.eq('customer_id', session.user.id);
      }

      const { data: tickets, count: ticketCount, error: ticketError } = await ticketQuery;

      if (!ticketError && tickets) {
        results.data.push(...tickets.map(ticket => ({
          ...ticket,
          type: 'ticket',
          relevance: 1 // Higher relevance for direct matches
        })));
        totalCount += ticketCount || 0;
      }
    }

    // Search messages if requested
    if (entities.includes('messages')) {
      let messageQuery = supabase
        .from('messages')
        .select(`
          *,
          ticket:ticket_id (
            id,
            title,
            customer_id
          ),
          author:user_id (
            id,
            name,
            role
          )
        `, { count: 'exact' })
        .ilike('content', `%${query}%`);

      // Apply role-based filters for messages
      if (userData.role === 'Customer') {
        messageQuery = messageQuery.in('ticket.customer_id', [session.user.id]);
      }

      const { data: messages, count: messageCount, error: messageError } = await messageQuery;

      if (!messageError && messages) {
        results.data.push(...messages.map(message => ({
          ...message,
          type: 'message',
          relevance: 0.8 // Lower relevance than direct ticket matches
        })));
        totalCount += messageCount || 0;
      }
    }

    // Search help articles if requested
    if (entities.includes('help_articles')) {
      let articleQuery = supabase
        .from('help_articles')
        .select(`
          *,
          author:created_by (
            id,
            name,
            role
          )
        `, { count: 'exact' })
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

      // Customers can only see published articles
      if (userData.role === 'Customer') {
        articleQuery = articleQuery.eq('published', true);
      }

      const { data: articles, count: articleCount, error: articleError } = await articleQuery;

      if (!articleError && articles) {
        results.data.push(...articles.map(article => ({
          ...article,
          type: 'help_article',
          relevance: 0.9 // High relevance for help articles
        })));
        totalCount += articleCount || 0;
      }
    }

    // Sort results by relevance and apply pagination
    results.data.sort((a: any, b: any) => b.relevance - a.relevance);
    results.data = results.data.slice(offset, offset + limit);

    return NextResponse.json({
      data: results.data,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 