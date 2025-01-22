import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

type WorkerSkill = {
  skill_name: string;
  proficiency_level: string;
  endorser: {
    id: string;
    name: string | null;
    role: string;
  } | null;
};

type DbWorker = Database['public']['Tables']['users']['Row'];
type DbWorkerSkill = Database['public']['Tables']['worker_skills']['Row'] & {
  endorser: Database['public']['Tables']['users']['Row'] | null;
};

type WorkerWithSkills = {
  worker: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  skills: {
    name: string;
    proficiency_level: string;
    endorser: {
      id: string;
      name: string | null;
      role: string;
    } | null;
  }[];
};

type SupabaseWorker = DbWorker & {
  worker_skills: DbWorkerSkill[] | null;
};

export async function GET(request: NextRequest) {
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

    // Get workers with their skills
    const { data: workers, error: workersError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        worker_skills (
          skill_name,
          proficiency_level,
          endorser:endorsed_by (
            id,
            name,
            role
          )
        )
      `)
      .eq('role', 'Worker')
      .order('name');

    if (workersError) {
      return NextResponse.json(
        { error: { message: workersError.message } },
        { status: 400 }
      );
    }

    if (!workers) {
      return NextResponse.json({
        data: [],
        pagination: {
          total: 0,
          pages: 0,
          current_page: page,
          per_page: limit
        }
      });
    }

    // Group skills by worker
    const workersWithSkills: WorkerWithSkills[] = (workers as unknown as SupabaseWorker[]).map(worker => ({
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        role: worker.role
      },
      skills: (worker.worker_skills || []).map(skill => ({
        name: skill.skill_name,
        proficiency_level: skill.proficiency_level,
        endorser: skill.endorser
      }))
    }));

    return NextResponse.json({
      data: workersWithSkills,
      pagination: {
        total: workers.length,
        pages: Math.ceil(workers.length / limit),
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