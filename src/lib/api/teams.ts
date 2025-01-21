import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { User } from './users';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export interface Team {
  id: string;
  name: string;
  focus_area: string | null;
  created_at: string;
}

export interface CreateTeamParams {
  name: string;
  focus_area?: string;
}

export interface UpdateTeamParams {
  name?: string;
  focus_area?: string;
}

export interface ListTeamsParams {
  page?: number;
  limit?: number;
}

export interface ListTeamsResponse {
  data: Team[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

interface UserTeamJoin {
  user_id: string;
  users: User;
}

interface TeamUserJoin {
  team_id: string;
  teams: Team;
}

/**
 * Team Management API
 */
export const TeamAPI = {
  /**
   * Create a new team
   * Requires admin privileges
   */
  async create({ name, focus_area }: CreateTeamParams): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert([{ name, focus_area }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create team: ${error.message}`);
    }

    return data;
  },

  /**
   * Get team by ID
   */
  async get(id: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get team: ${error.message}`);
    }

    return data;
  },

  /**
   * List teams with pagination
   */
  async list({ page = 1, limit = 20 }: ListTeamsParams = {}): Promise<ListTeamsResponse> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('teams')
      .select('*', { count: 'exact' })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list teams: ${error.message}`);
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
   * Update team
   * Requires admin privileges
   */
  async update(id: string, params: UpdateTeamParams): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update team: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete team
   * Requires admin privileges
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete team: ${error.message}`);
    }
  },

  /**
   * Add user to team
   * Requires admin privileges
   */
  async addUser(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_teams')
      .insert([{ team_id: teamId, user_id: userId }]);

    if (error) {
      throw new Error(`Failed to add user to team: ${error.message}`);
    }
  },

  /**
   * Remove user from team
   * Requires admin privileges
   */
  async removeUser(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_teams')
      .delete()
      .match({ team_id: teamId, user_id: userId });

    if (error) {
      throw new Error(`Failed to remove user from team: ${error.message}`);
    }
  },

  /**
   * List users in a team
   */
  async listUsers(teamId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select(`
        user_id,
        users:user_id (*)
      `)
      .eq('team_id', teamId) as { data: UserTeamJoin[] | null, error: any };

    if (error) {
      throw new Error(`Failed to list team users: ${error.message}`);
    }

    return data?.map(item => item.users) || [];
  },

  /**
   * List teams for a user
   */
  async listUserTeams(userId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select(`
        team_id,
        teams:team_id (*)
      `)
      .eq('user_id', userId) as { data: TeamUserJoin[] | null, error: any };

    if (error) {
      throw new Error(`Failed to list user teams: ${error.message}`);
    }

    return data?.map(item => item.teams) || [];
  },
}; 