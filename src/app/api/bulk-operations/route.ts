import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Valid operations and their allowed values
const VALID_OPERATIONS = {
  status: ['UNOPENED', 'IN PROGRESS', 'RESOLVED', 'UNRESOLVED'],
  priority: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
};

export async function POST(request: Request) {
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

    // Only administrators and workers can perform bulk operations
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only administrators and workers can perform bulk operations' } },
        { status: 403 }
      );
    }

    const { ticket_ids, operations } = await request.json();

    // Validate request body
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one ticket ID is required' } },
        { status: 400 }
      );
    }

    if (!operations || typeof operations !== 'object') {
      return NextResponse.json(
        { error: { message: 'Operations object is required' } },
        { status: 400 }
      );
    }

    // Validate operations
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Status update
    if (operations.status) {
      if (!VALID_OPERATIONS.status.includes(operations.status)) {
        return NextResponse.json(
          { error: { message: `Invalid status. Must be one of: ${VALID_OPERATIONS.status.join(', ')}` } },
          { status: 400 }
        );
      }
      updates.status = operations.status;
    }

    // Priority update
    if (operations.priority) {
      if (!VALID_OPERATIONS.priority.includes(operations.priority)) {
        return NextResponse.json(
          { error: { message: `Invalid priority. Must be one of: ${VALID_OPERATIONS.priority.join(', ')}` } },
          { status: 400 }
        );
      }
      updates.priority = operations.priority;
    }

    // Team assignment
    if (operations.team_id) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', operations.team_id)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { error: { message: 'Invalid team ID' } },
          { status: 400 }
        );
      }
      updates.assigned_team = operations.team_id;
    }

    // Worker assignment
    if (operations.worker_id) {
      const { data: worker, error: workerError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', operations.worker_id)
        .single();

      if (workerError || !worker) {
        return NextResponse.json(
          { error: { message: 'Invalid worker ID' } },
          { status: 400 }
        );
      }

      if (worker.role !== 'Worker') {
        return NextResponse.json(
          { error: { message: 'Assigned user must be a worker' } },
          { status: 400 }
        );
      }
      updates.assigned_to = operations.worker_id;
    }

    // Tags update
    if (operations.tags) {
      if (!Array.isArray(operations.tags)) {
        return NextResponse.json(
          { error: { message: 'Tags must be an array' } },
          { status: 400 }
        );
      }
      updates.tags = operations.tags;
    }

    // Custom fields update
    if (operations.custom_fields) {
      if (typeof operations.custom_fields !== 'object') {
        return NextResponse.json(
          { error: { message: 'Custom fields must be an object' } },
          { status: 400 }
        );
      }
      updates.custom_fields = operations.custom_fields;
    }

    // Perform the bulk update
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .in('id', ticket_ids)
      .select();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Bulk operation completed successfully',
      updated_tickets: data
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 