import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function POST(request: NextRequest) {
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

    // Get user role
    const { data: userData, error: userError } = await supabaseServer
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticket_id') as string;

    if (!file || !ticketId) {
      return NextResponse.json(
        { error: { message: 'File and ticket_id are required' } },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { message: 'File size exceeds 5MB limit' } },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'File type not allowed' } },
        { status: 400 }
      );
    }

    // Verify ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabaseServer
      .from('tickets')
      .select('customer_id, assigned_team')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: { message: 'Ticket not found' } },
        { status: 404 }
      );
    }

    // Verify user has access to the ticket
    if (userData.role === 'Customer' && ticket.customer_id !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to upload files to this ticket' } },
        { status: 403 }
      );
    }

    // If user is a worker, verify they are part of the assigned team
    if (userData.role === 'Worker' && ticket.assigned_team) {
      const { data: userTeams } = await supabaseServer
        .from('user_teams')
        .select('team_id')
        .eq('user_id', session.user.id);

      const teamIds = (userTeams?.map(ut => ut.team_id) || []).filter((id): id is string => id !== null);
      if (!teamIds.includes(ticket.assigned_team)) {
        return NextResponse.json(
          { error: { message: 'Unauthorized to upload files to this ticket' } },
          { status: 403 }
        );
      }
    }

    // Sanitize file name and generate a unique path
    const timestamp = new Date().getTime();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${ticketId}/${timestamp}-${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('ticket-attachments')
      .upload(fileName, file);

    if (uploadError) {
      return NextResponse.json(
        { error: { message: uploadError.message } },
        { status: 400 }
      );
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabaseServer.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName);

    // Record file upload in database
    const startTime = new Date().getTime();
    const { data: fileRecord, error: fileError } = await supabaseServer
      .from('files')
      .insert({
        ticket_id: ticketId,
        file_url: publicUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: session.user.id,
        file_name: sanitizedFileName,
        file_size: file.size,
        file_type: file.type
      })
      .select()
      .single();

    if (fileError) {
      return NextResponse.json(
        { error: { message: fileError.message } },
        { status: 400 }
      );
    }

    // Log file upload performance
    const uploadDuration = new Date().getTime() - startTime;
    await supabaseServer
      .from('file_upload_logs')
      .insert({
        file_id: fileRecord.id,
        file_size_bytes: file.size,
        upload_duration_ms: uploadDuration,
        uploaded_by: session.user.id
      });

    return NextResponse.json(fileRecord);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

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

    // Get user role
    const { data: userData, error: userError } = await supabaseServer
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

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
        { status: 400 }
      );
    }

    // If user is a customer, verify they own the ticket
    if (userData.role === 'Customer') {
      const { data: ticket, error: ticketError } = await supabaseServer
        .from('tickets')
        .select('customer_id')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket || ticket.customer_id !== session.user.id) {
        return NextResponse.json(
          { error: { message: 'Unauthorized to view files for this ticket' } },
          { status: 403 }
        );
      }
    }

    // If user is a worker, verify they are part of the assigned team
    if (userData.role === 'Worker') {
      const { data: ticket } = await supabaseServer
        .from('tickets')
        .select('assigned_team')
        .eq('id', ticketId)
        .single();

      if (ticket?.assigned_team) {
        const { data: userTeams } = await supabaseServer
          .from('user_teams')
          .select('team_id')
          .eq('user_id', session.user.id);

        const teamIds = (userTeams?.map(ut => ut.team_id) || []).filter((id): id is string => id !== null);
        if (!teamIds.includes(ticket.assigned_team)) {
          return NextResponse.json(
            { error: { message: 'Unauthorized to view files for this ticket' } },
            { status: 403 }
          );
        }
      }
    }

    const query = supabaseServer
      .from('files')
      .select('*, uploaded_by:uploaded_by(*)', { count: 'exact' })
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

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
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: { message: 'File ID is required' } },
        { status: 400 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabaseServer
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

    // Get file details
    const { data: file, error: fileError } = await supabaseServer
      .from('files')
      .select('ticket_id, file_url')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: { message: 'File not found' } },
        { status: 404 }
      );
    }

    // If user is a customer, verify they own the ticket
    if (userData.role === 'Customer') {
      if (!file.ticket_id) {
        return NextResponse.json(
          { error: { message: 'File must be associated with a ticket' } },
          { status: 400 }
        );
      }

      const { data: ticket, error: ticketError } = await supabaseServer
        .from('tickets')
        .select('customer_id')
        .eq('id', file.ticket_id)
        .single();

      if (ticketError || !ticket || ticket.customer_id !== session.user.id) {
        return NextResponse.json(
          { error: { message: 'Unauthorized to delete this file' } },
          { status: 403 }
        );
      }
    }

    // If user is a worker, verify they are part of the assigned team
    if (userData.role === 'Worker') {
      if (!file.ticket_id) {
        return NextResponse.json(
          { error: { message: 'File must be associated with a ticket' } },
          { status: 400 }
        );
      }

      const { data: ticket } = await supabaseServer
        .from('tickets')
        .select('assigned_team')
        .eq('id', file.ticket_id)
        .single();

      if (ticket?.assigned_team) {
        const { data: userTeams } = await supabaseServer
          .from('user_teams')
          .select('team_id')
          .eq('user_id', session.user.id);

        const teamIds = (userTeams?.map(ut => ut.team_id) || []).filter((id): id is string => id !== null);
        if (!teamIds.includes(ticket.assigned_team)) {
          return NextResponse.json(
            { error: { message: 'Unauthorized to delete this file' } },
            { status: 403 }
          );
        }
      }
    }

    // Extract file path from URL
    const fileUrl = new URL(file.file_url);
    const filePath = fileUrl.pathname.split('/').pop();

    if (!filePath) {
      return NextResponse.json(
        { error: { message: 'Invalid file path' } },
        { status: 400 }
      );
    }

    // Delete file from storage
    const { error: storageError } = await supabaseServer.storage
      .from('ticket-attachments')
      .remove([filePath]);

    if (storageError) {
      return NextResponse.json(
        { error: { message: storageError.message } },
        { status: 400 }
      );
    }

    // Delete file record from database
    const { error: deleteError } = await supabaseServer
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 