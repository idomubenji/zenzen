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

    // Only administrators and workers can search skills
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only administrators and workers can search skills' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const skills = searchParams.getAll('skills[]');
    const minProficiency = searchParams.get('min_proficiency') || 'BEGINNER';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!skills.length) {
      return NextResponse.json(
        { error: { message: 'At least one skill is required' } },
        { status: 400 }
      );
    }

    // Validate minimum proficiency level
    if (!['BEGINNER', 'INTERMEDIATE', 'EXPERT'].includes(minProficiency)) {
      return NextResponse.json(
        { error: { message: 'Invalid minimum proficiency level' } },
        { status: 400 }
      );
    }

    // Define proficiency level hierarchy
    const proficiencyLevels = {
      'BEGINNER': 1,
      'INTERMEDIATE': 2,
      'EXPERT': 3
    };

    // Get workers with matching skills
    const { data: workers, error: workersError, count } = await supabase
      .from('users')
      .select(`
        id,
        name,
        role,
        worker_skills!inner (
          skill_name,
          proficiency_level,
          endorser:endorsed_by (
            id,
            name,
            role
          )
        )
      `, { count: 'exact' })
      .eq('role', 'Worker')
      .in('worker_skills.skill_name', skills)
      .gte(
        'worker_skills.proficiency_level',
        Object.entries(proficiencyLevels)
          .find(([level]) => level === minProficiency)?.[1] || 1
      )
      .range(offset, offset + limit - 1);

    if (workersError) {
      return NextResponse.json(
        { error: { message: workersError.message } },
        { status: 400 }
      );
    }

    // Group skills by worker
    const workersWithSkills = workers?.map(worker => ({
      worker: {
        id: worker.id,
        name: worker.name,
        role: worker.role
      },
      matching_skills: worker.worker_skills
    }));

    return NextResponse.json({
      data: workersWithSkills,
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        current_page: page,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error searching workers by skills:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 