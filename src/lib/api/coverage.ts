import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { User } from './users';
import { Team } from './teams';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export interface CoverageSchedule {
  id: string;
  team_id: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CoverageShift {
  id: string;
  schedule_id: string | null;
  worker_id: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface CreateScheduleParams {
  team_id: string;
  start_date: string;
  end_date: string;
  timezone?: string;
}

export interface UpdateScheduleParams {
  start_date?: string;
  end_date?: string;
  timezone?: string;
}

export interface CreateShiftParams {
  schedule_id: string;
  worker_id: string;
  start_time: string;
  end_time: string;
}

export interface UpdateShiftParams {
  start_time?: string;
  end_time?: string;
}

export interface ListSchedulesParams {
  team_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface ListShiftsParams {
  schedule_id?: string;
  worker_id?: string;
  from_time?: string;
  to_time?: string;
  page?: number;
  limit?: number;
}

export interface ListResponse<T> {
  data: T[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

interface ScheduleWithRelations extends CoverageSchedule {
  team: Team;
  created_by_user: User | null;
}

interface ShiftWithRelations extends CoverageShift {
  worker: User;
  schedule: CoverageSchedule;
}

/**
 * Coverage Schedule API
 */
export const CoverageAPI = {
  /**
   * Create a new coverage schedule
   * Requires admin privileges
   */
  async createSchedule(params: CreateScheduleParams): Promise<CoverageSchedule> {
    const { data, error } = await supabase
      .from('coverage_schedules')
      .insert([{
        ...params,
        timezone: params.timezone || 'UTC',
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    return data;
  },

  /**
   * Get schedule by ID with relations
   */
  async getSchedule(id: string): Promise<ScheduleWithRelations | null> {
    const { data, error } = await supabase
      .from('coverage_schedules')
      .select(`
        *,
        team:team_id (*),
        created_by_user:created_by (*)
      `)
      .eq('id', id)
      .single() as { data: ScheduleWithRelations | null, error: any };

    if (error) {
      throw new Error(`Failed to get schedule: ${error.message}`);
    }

    return data;
  },

  /**
   * List schedules with filtering and pagination
   */
  async listSchedules(params: ListSchedulesParams = {}): Promise<ListResponse<CoverageSchedule>> {
    const {
      team_id,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = params;

    let query = supabase
      .from('coverage_schedules')
      .select('*', { count: 'exact' });

    // Apply filters
    if (team_id) {
      query = query.eq('team_id', team_id);
    }
    if (from_date) {
      query = query.gte('start_date', from_date);
    }
    if (to_date) {
      query = query.lte('end_date', to_date);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list schedules: ${error.message}`);
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
   * Update schedule
   * Requires admin privileges
   */
  async updateSchedule(id: string, params: UpdateScheduleParams): Promise<CoverageSchedule> {
    const updates = {
      ...params,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('coverage_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete schedule
   * Requires admin privileges
   */
  async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase
      .from('coverage_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete schedule: ${error.message}`);
    }
  },

  /**
   * Create a new shift
   */
  async createShift(params: CreateShiftParams): Promise<CoverageShift> {
    const { data, error } = await supabase
      .from('coverage_shifts')
      .insert([params])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create shift: ${error.message}`);
    }

    return data;
  },

  /**
   * Get shift by ID with relations
   */
  async getShift(id: string): Promise<ShiftWithRelations | null> {
    const { data, error } = await supabase
      .from('coverage_shifts')
      .select(`
        *,
        worker:worker_id (*),
        schedule:schedule_id (*)
      `)
      .eq('id', id)
      .single() as { data: ShiftWithRelations | null, error: any };

    if (error) {
      throw new Error(`Failed to get shift: ${error.message}`);
    }

    return data;
  },

  /**
   * List shifts with filtering and pagination
   */
  async listShifts(params: ListShiftsParams = {}): Promise<ListResponse<CoverageShift>> {
    const {
      schedule_id,
      worker_id,
      from_time,
      to_time,
      page = 1,
      limit = 20,
    } = params;

    let query = supabase
      .from('coverage_shifts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (schedule_id) {
      query = query.eq('schedule_id', schedule_id);
    }
    if (worker_id) {
      query = query.eq('worker_id', worker_id);
    }
    if (from_time) {
      query = query.gte('start_time', from_time);
    }
    if (to_time) {
      query = query.lte('end_time', to_time);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list shifts: ${error.message}`);
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
   * Update shift
   */
  async updateShift(id: string, params: UpdateShiftParams): Promise<CoverageShift> {
    const { data, error } = await supabase
      .from('coverage_shifts')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update shift: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete shift
   */
  async deleteShift(id: string): Promise<void> {
    const { error } = await supabase
      .from('coverage_shifts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete shift: ${error.message}`);
    }
  },

  /**
   * Get worker's schedule for a date range
   */
  async getWorkerSchedule(workerId: string, fromDate: string, toDate: string): Promise<CoverageShift[]> {
    const { data, error } = await supabase
      .from('coverage_shifts')
      .select('*')
      .eq('worker_id', workerId)
      .gte('start_time', fromDate)
      .lte('end_time', toDate)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to get worker schedule: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get team coverage for a date range
   */
  async getTeamCoverage(teamId: string, fromDate: string, toDate: string): Promise<CoverageShift[]> {
    const { data, error } = await supabase
      .from('coverage_shifts')
      .select(`
        *,
        schedule:schedule_id (team_id)
      `)
      .eq('schedule:team_id', teamId)
      .gte('start_time', fromDate)
      .lte('end_time', toDate)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to get team coverage: ${error.message}`);
    }

    return data || [];
  },
}; 