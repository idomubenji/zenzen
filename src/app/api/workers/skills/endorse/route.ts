import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { worker_id, skill_name } = await request.json();

    // Validate required fields
    if (!worker_id || !skill_name) {
      return NextResponse.json(
        { error: { message: 'Worker ID and skill name are required' } },
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

    // Only administrators and workers can endorse skills
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only administrators and workers can endorse skills' } },
        { status: 403 }
      );
    }

    // Verify worker exists and is actually a worker
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('role')
      .eq('id', worker_id)
      .single();

    if (workerError || !worker) {
      return NextResponse.json(
        { error: { message: 'Worker not found' } },
        { status: 404 }
      );
    }

    if (worker.role !== 'Worker') {
      return NextResponse.json(
        { error: { message: 'Skills can only be endorsed for workers' } },
        { status: 400 }
      );
    }

    // Verify skill exists for the worker
    const { data: existingSkill, error: skillError } = await supabase
      .from('worker_skills')
      .select('id, endorsed_by')
      .eq('worker_id', worker_id)
      .eq('skill_name', skill_name)
      .single();

    if (skillError || !existingSkill) {
      return NextResponse.json(
        { error: { message: 'Skill not found for this worker' } },
        { status: 404 }
      );
    }

    // Check if user has already endorsed this skill
    if (existingSkill.endorsed_by === session.user.id) {
      return NextResponse.json(
        { error: { message: 'You have already endorsed this skill' } },
        { status: 400 }
      );
    }

    // Update the endorsement
    const { data, error } = await supabase
      .from('worker_skills')
      .update({
        endorsed_by: session.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSkill.id)
      .select(`
        *,
        endorser:endorsed_by (
          id,
          name,
          role
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error endorsing skill:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 