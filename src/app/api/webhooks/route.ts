import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// Available webhook events
const AVAILABLE_EVENTS = [
  'ticket.created',
  'ticket.updated',
  'ticket.deleted',
  'message.created',
  'message.updated',
  'message.deleted'
];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
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

    // Only administrators can create webhooks
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can create webhooks' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, url, events, secret } = body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: name, url, and events array' } },
        { status: 400 }
      );
    }

    // Validate events
    if (!events.every(event => AVAILABLE_EVENTS.includes(event))) {
      return NextResponse.json(
        { error: { message: `Invalid events. Available events are: ${AVAILABLE_EVENTS.join(', ')}` } },
        { status: 400 }
      );
    }

    // Create webhook
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        name,
        url,
        events,
        secret,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        is_active: true
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
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
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

    // Only administrators can view webhooks
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can view webhooks' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('webhooks')
      .select('*', { count: 'exact' })
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
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
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

    // Only administrators can update webhooks
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can update webhooks' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: { message: 'Webhook ID is required' } },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // Validate events if provided
    if (updates.events) {
      if (!Array.isArray(updates.events) || !updates.events.every((event: string) => AVAILABLE_EVENTS.includes(event))) {
        return NextResponse.json(
          { error: { message: `Invalid events. Available events are: ${AVAILABLE_EVENTS.join(', ')}` } },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
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
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
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

    // Only administrators can delete webhooks
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can delete webhooks' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: { message: 'Webhook ID is required' } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 