import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { User } from './users';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface WorkerSkill {
  id: string;
  worker_id: string;
  skill_name: string;
  proficiency_level: ProficiencyLevel;
  endorsed_by: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillParams {
  worker_id: string;
  skill_name: string;
  proficiency_level: ProficiencyLevel;
}

export interface UpdateSkillParams {
  proficiency_level?: ProficiencyLevel;
}

export interface ListSkillsParams {
  worker_id?: string;
  skill_name?: string;
  proficiency_level?: ProficiencyLevel;
  page?: number;
  limit?: number;
}

export interface ListSkillsResponse {
  data: WorkerSkill[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

interface SkillWithEndorsers extends WorkerSkill {
  endorsers: User[];
}

interface WorkerWithSkill {
  worker_id: string;
  worker: User;
}

/**
 * Worker Skills API
 */
export const SkillsAPI = {
  /**
   * Add a skill to a worker
   */
  async create(params: CreateSkillParams): Promise<WorkerSkill> {
    const { data, error } = await supabase
      .from('worker_skills')
      .insert([{
        ...params,
        endorsed_by: [],
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create skill: ${error.message}`);
    }

    return data;
  },

  /**
   * Get worker skill by ID with endorsers
   */
  async get(id: string): Promise<SkillWithEndorsers | null> {
    const { data, error } = await supabase
      .from('worker_skills')
      .select(`
        *,
        endorsers:endorsed_by (*)
      `)
      .eq('id', id)
      .single() as { data: SkillWithEndorsers | null, error: any };

    if (error) {
      throw new Error(`Failed to get skill: ${error.message}`);
    }

    return data;
  },

  /**
   * List worker skills with filtering and pagination
   */
  async list(params: ListSkillsParams = {}): Promise<ListSkillsResponse> {
    const {
      worker_id,
      skill_name,
      proficiency_level,
      page = 1,
      limit = 20,
    } = params;

    let query = supabase
      .from('worker_skills')
      .select('*', { count: 'exact' });

    // Apply filters
    if (worker_id) {
      query = query.eq('worker_id', worker_id);
    }
    if (skill_name) {
      query = query.eq('skill_name', skill_name);
    }
    if (proficiency_level) {
      query = query.eq('proficiency_level', proficiency_level);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list skills: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        current_page: page,
        per_page: limit,
      },
    };
  },

  /**
   * Update worker skill
   */
  async update(id: string, params: UpdateSkillParams): Promise<WorkerSkill> {
    const { data, error } = await supabase
      .from('worker_skills')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update skill: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete worker skill
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('worker_skills')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete skill: ${error.message}`);
    }
  },

  /**
   * Endorse a worker's skill
   */
  async endorse(id: string, endorserId: string): Promise<WorkerSkill> {
    // First get the current skill to check if already endorsed
    const { data: skill, error: fetchError } = await supabase
      .from('worker_skills')
      .select('*')
      .eq('id', id)
      .single() as { data: WorkerSkill | null, error: any };

    if (fetchError) {
      throw new Error(`Failed to fetch skill: ${fetchError.message}`);
    }

    if (!skill) {
      throw new Error('Skill not found');
    }

    // Add endorser if not already endorsed
    const endorsedBy = skill.endorsed_by || [];
    if (!endorsedBy.includes(endorserId)) {
      const { data, error } = await supabase
        .from('worker_skills')
        .update({
          endorsed_by: [...endorsedBy, endorserId],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to endorse skill: ${error.message}`);
      }

      return data;
    }

    return skill;
  },

  /**
   * Remove endorsement from a worker's skill
   */
  async removeEndorsement(id: string, endorserId: string): Promise<WorkerSkill> {
    // First get the current skill
    const { data: skill, error: fetchError } = await supabase
      .from('worker_skills')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch skill: ${fetchError.message}`);
    }

    if (!skill) {
      throw new Error('Skill not found');
    }

    // Remove endorser
    const endorsedBy = (skill.endorsed_by || []).filter((eid: string) => eid !== endorserId);
    const { data, error } = await supabase
      .from('worker_skills')
      .update({
        endorsed_by: endorsedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to remove endorsement: ${error.message}`);
    }

    return data;
  },

  /**
   * Search workers by skill
   */
  async searchWorkers(skillName: string, minProficiency?: ProficiencyLevel): Promise<User[]> {
    let query = supabase
      .from('worker_skills')
      .select(`
        worker_id,
        worker:worker_id (*)
      `)
      .eq('skill_name', skillName);

    if (minProficiency) {
      const levels: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
      const minIndex = levels.indexOf(minProficiency);
      const validLevels = levels.slice(minIndex);
      query = query.in('proficiency_level', validLevels);
    }

    const { data, error } = await query as { data: WorkerWithSkill[] | null, error: any };

    if (error) {
      throw new Error(`Failed to search workers by skill: ${error.message}`);
    }

    return data?.map(item => item.worker) || [];
  },
}; 