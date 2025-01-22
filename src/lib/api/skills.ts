import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { User } from './users';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

export interface WorkerSkill {
  id: string;
  worker_id: string;
  skill_name: string;
  proficiency_level: ProficiencyLevel;
  endorsed_by: string;
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
    const { data: rawData, error } = await supabase
      .from('worker_skills')
      .insert([{
        ...params,
        endorsed_by: params.worker_id, // Self-endorse by default
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create skill: ${error.message}`);
    }

    if (!rawData) {
      throw new Error('No data returned from create operation');
    }

    // Cast the proficiency_level to our type
    const data: WorkerSkill = {
      ...rawData,
      proficiency_level: rawData.proficiency_level as ProficiencyLevel,
    };

    return data;
  },

  /**
   * Get worker skill by ID with endorsers
   */
  async get(id: string): Promise<SkillWithEndorsers | null> {
    const { data: rawData, error } = await supabase
      .from('worker_skills')
      .select(`
        *,
        endorsers:endorsed_by (*)
      `)
      .eq('id', id)
      .single() as { data: any, error: any };

    if (error) {
      throw new Error(`Failed to get skill: ${error.message}`);
    }

    if (!rawData) {
      return null;
    }

    // Cast the proficiency_level to our type
    const data: SkillWithEndorsers = {
      ...rawData,
      proficiency_level: rawData.proficiency_level as ProficiencyLevel,
      endorsers: rawData.endorsers || [],
    };

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
      limit = 10
    } = params;

    let query = supabase
      .from('worker_skills')
      .select('*', { count: 'exact' });

    if (worker_id) {
      query = query.eq('worker_id', worker_id);
    }

    if (skill_name) {
      query = query.ilike('skill_name', `%${skill_name}%`);
    }

    if (proficiency_level) {
      query = query.eq('proficiency_level', proficiency_level);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: rawData, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list skills: ${error.message}`);
    }

    if (!rawData || !count) {
      return {
        data: [],
        pagination: {
          total: 0,
          pages: 0,
          current_page: page,
          per_page: limit
        }
      };
    }

    // Cast the proficiency_level to our type for each skill
    const data: WorkerSkill[] = rawData.map(skill => ({
      ...skill,
      proficiency_level: skill.proficiency_level as ProficiencyLevel,
    }));

    return {
      data,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: page,
        per_page: limit
      }
    };
  },

  /**
   * Update worker skill
   */
  async update(id: string, params: UpdateSkillParams): Promise<WorkerSkill> {
    const { data: rawData, error } = await supabase
      .from('worker_skills')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update skill: ${error.message}`);
    }

    if (!rawData) {
      throw new Error('No data returned from update operation');
    }

    // Cast the proficiency_level to our type
    const data: WorkerSkill = {
      ...rawData,
      proficiency_level: rawData.proficiency_level as ProficiencyLevel,
    };

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
    const { data: rawData, error } = await supabase
      .from('worker_skills')
      .update({ endorsed_by: endorserId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to endorse skill: ${error.message}`);
    }

    if (!rawData) {
      throw new Error('No data returned from endorse operation');
    }

    // Cast the proficiency_level to our type
    const data: WorkerSkill = {
      ...rawData,
      proficiency_level: rawData.proficiency_level as ProficiencyLevel,
    };

    return data;
  },

  /**
   * Remove endorsement from a worker's skill
   */
  async removeEndorsement(id: string, endorserId: string): Promise<WorkerSkill> {
    // First get the current skill to check if endorsed by this user
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

    // Only remove endorsement if this user is the endorser
    if (skill.endorsed_by === endorserId) {
      const { data: rawData, error } = await supabase
        .from('worker_skills')
        .update({
          endorsed_by: skill.worker_id, // Reset to self-endorsement
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to remove endorsement: ${error.message}`);
      }

      if (!rawData) {
        throw new Error('No data returned from remove endorsement operation');
      }

      // Cast the proficiency_level to our type
      const data: WorkerSkill = {
        ...rawData,
        proficiency_level: rawData.proficiency_level as ProficiencyLevel,
      };

      return data;
    }

    // If not endorsed by this user, return the original skill
    return {
      ...skill,
      proficiency_level: skill.proficiency_level as ProficiencyLevel,
    };
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
      const levels: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];
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