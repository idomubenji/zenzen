import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

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

    // Verify ticket exists and user has access
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('customer_id')
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

    // Generate a unique file name
    const timestamp = new Date().getTime();
    const fileName = `${ticketId}/${timestamp}-${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(fileName, file);

    if (uploadError) {
      return NextResponse.json(
        { error: { message: uploadError.message } },
        { status: 400 }
      );
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName);

    // Record file upload in database
    const startTime = new Date().getTime();
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        ticket_id: ticketId,
        file_url: publicUrl,
        uploaded_at: new Date().toISOString()
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
    await supabase
      .from('file_upload_logs')
      .insert({
        file_id: fileRecord.id,
        file_size_bytes: file.size,
        upload_duration_ms: uploadDuration
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

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json(
        { error: { message: 'Ticket ID is required' } },
        { status: 400 }
      );
    }

    // If user is a customer, verify they own the ticket
    if (userData.role === 'Customer') {
      const { data: ticket, error: ticketError } = await supabase
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

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

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

    // Get file details
    const { data: file, error: fileError } = await supabase
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
      const { data: ticket, error: ticketError } = await supabase
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

    // Extract file path from URL
    const fileUrl = new URL(file.file_url);
    const filePath = fileUrl.pathname.split('/').pop();

    if (!filePath) {
      return NextResponse.json(
        { error: { message: 'Invalid file URL' } },
        { status: 400 }
      );
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('ticket-attachments')
      .remove([filePath]);

    if (storageError) {
      return NextResponse.json(
        { error: { message: storageError.message } },
        { status: 400 }
      );
    }

    // Delete file record from database
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 