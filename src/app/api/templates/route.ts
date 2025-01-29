import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

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
    const type = searchParams.get('type');
    const teamId = searchParams.get('team_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' });

    if (type) {
      query = query.eq('type', type);
    }

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        pages: totalPages,
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

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

    // Only administrators can create templates
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can create templates' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name: title, type, content, team_id, tags } = body;

    if (!title || !type || !content) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: title, type, and content are required' } },
        { status: 400 }
      );
    }

    // If team_id is provided, verify it exists
    if (team_id) {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', team_id)
        .single();

      if (teamError || !teamData) {
        return NextResponse.json(
          { error: { message: 'Invalid team_id provided' } },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({
        title,
        type,
        content,
        team_id,
        tags: tags || [],
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

export async function PATCH(request: NextRequest) {
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

    // Only administrators can update templates
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can update templates' } },
        { status: 403 }
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

    const updates = await request.json();
    
    // If team_id is being updated, verify it exists
    if (updates.team_id) {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', updates.team_id)
        .single();

      if (teamError || !teamData) {
        return NextResponse.json(
          { error: { message: 'Invalid team_id provided' } },
          { status: 400 }
        );
      }
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

export async function DELETE(request: NextRequest) {
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

    // Only administrators can delete templates
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can delete templates' } },
        { status: 403 }
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

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 