import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

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

    // Only administrators can perform bulk deletions
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can perform bulk deletions' } },
        { status: 403 }
      );
    }

    const { ticket_ids } = await request.json();

    // Validate request body
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one ticket ID is required' } },
        { status: 400 }
      );
    }

    // Perform the bulk deletion
    const { error } = await supabase
      .from('tickets')
      .delete()
      .in('id', ticket_ids);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Bulk deletion completed successfully',
      deleted_count: ticket_ids.length
    });
  } catch (error) {
    console.error('Error performing bulk deletion:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 