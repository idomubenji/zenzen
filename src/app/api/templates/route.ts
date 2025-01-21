import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { title, content } = await request.json();

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: { message: 'Title and content are required' } },
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

    // Only workers and administrators can create templates
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only workers and administrators can create templates' } },
        { status: 403 }
      );
    }

    // Create template
    const { data, error } = await supabase
      .from('templates')
      .insert({
        title,
        content,
        created_by: session.user.id,
        created_at: new Date().toISOString()
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
    console.error('Error creating template:', error);
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

    // Only workers and administrators can view templates
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only workers and administrators can view templates' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const createdBy = searchParams.get('created_by');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('templates')
      .select('*, users:created_by (name)', { count: 'exact' });

    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

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
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: { message: 'Template ID is required' } },
        { status: 400 }
      );
    }

    // Get user role and template details
    const [{ data: userData, error: userError }, { data: template, error: templateError }] = await Promise.all([
      supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('templates')
        .select('created_by')
        .eq('id', templateId)
        .single()
    ]);

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    if (templateError || !template) {
      return NextResponse.json(
        { error: { message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Only template creator or administrators can update templates
    if (userData.role !== 'Administrator' && template.created_by !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to update this template' } },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Validate required fields if they're being updated
    if ((updates.title === '' || updates.content === '')) {
      return NextResponse.json(
        { error: { message: 'Title and content cannot be empty' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', templateId)
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
    console.error('Error updating template:', error);
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
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: { message: 'Template ID is required' } },
        { status: 400 }
      );
    }

    // Get user role and template details
    const [{ data: userData, error: userError }, { data: template, error: templateError }] = await Promise.all([
      supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('templates')
        .select('created_by')
        .eq('id', templateId)
        .single()
    ]);

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    if (templateError || !template) {
      return NextResponse.json(
        { error: { message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Only template creator or administrators can delete templates
    if (userData.role !== 'Administrator' && template.created_by !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized to delete this template' } },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 