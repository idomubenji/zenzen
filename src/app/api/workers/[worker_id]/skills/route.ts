import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function POST(
  request: Request,
  { params }: { params: { worker_id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { skill_name, proficiency_level } = await request.json();

    // Validate required fields
    if (!skill_name || !proficiency_level) {
      return NextResponse.json(
        { error: { message: 'Skill name and proficiency level are required' } },
        { status: 400 }
      );
    }

    // Validate proficiency level
    if (!['BEGINNER', 'INTERMEDIATE', 'EXPERT'].includes(proficiency_level)) {
      return NextResponse.json(
        { error: { message: 'Invalid proficiency level. Must be BEGINNER, INTERMEDIATE, or EXPERT' } },
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

    // Only administrators can add skills to workers
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can add skills to workers' } },
        { status: 403 }
      );
    }

    // Verify worker exists and is actually a worker
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('role')
      .eq('id', params.worker_id)
      .single();

    if (workerError || !worker) {
      return NextResponse.json(
        { error: { message: 'Worker not found' } },
        { status: 404 }
      );
    }

    if (worker.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Skills can only be added to workers' } },
        { status: 400 }
      );
    }

    // Add skill
    const { data, error } = await supabase
      .from('worker_skills')
      .insert({
        worker_id: params.worker_id,
        skill_name,
        proficiency_level,
        endorsed_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: { message: 'Worker already has this skill' } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding skill:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { worker_id: string } }
) {
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

    // Only administrators and workers can view skills
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only administrators and workers can view skills' } },
        { status: 403 }
      );
    }

    // Get worker's skills with endorser details
    const { data, error } = await supabase
      .from('worker_skills')
      .select(`
        *,
        endorser:endorsed_by (
          id,
          name,
          role
        )
      `)
      .eq('worker_id', params.worker_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { worker_id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { skill_name, proficiency_level } = await request.json();

    if (!skill_name) {
      return NextResponse.json(
        { error: { message: 'Skill name is required' } },
        { status: 400 }
      );
    }

    // Validate proficiency level if provided
    if (proficiency_level && !['BEGINNER', 'INTERMEDIATE', 'EXPERT'].includes(proficiency_level)) {
      return NextResponse.json(
        { error: { message: 'Invalid proficiency level. Must be BEGINNER, INTERMEDIATE, or EXPERT' } },
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

    // Only administrators can update skills
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can update skills' } },
        { status: 403 }
      );
    }

    const updates = {
      proficiency_level,
      endorsed_by: session.user.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('worker_skills')
      .update(updates)
      .eq('worker_id', params.worker_id)
      .eq('skill_name', skill_name)
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
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { worker_id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const skillName = searchParams.get('skill_name');

    if (!skillName) {
      return NextResponse.json(
        { error: { message: 'Skill name is required' } },
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

    // Only administrators can delete skills
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can delete skills' } },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('worker_skills')
      .delete()
      .eq('worker_id', params.worker_id)
      .eq('skill_name', skillName);

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 