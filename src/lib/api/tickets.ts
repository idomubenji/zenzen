import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { User } from './users';
import { Team } from './teams';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export type TicketStatus = 'UNOPENED' | 'IN PROGRESS' | 'RESOLVED' | 'UNRESOLVED';
export type TicketPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Ticket {
  id: string;
  customer_id: string | null;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  reopen_count: number;
  assigned_to: string | null;
  assigned_team: string | null;
  tags: string[];
  custom_fields: Record<string, any>;
  timestamp: string;
}

export interface CreateTicketParams {
  title: string;
  customer_id?: string;
  priority?: TicketPriority;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface UpdateTicketParams {
  title?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
  assigned_team?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface ListTicketsParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  customer_id?: string;
  assigned_to?: string;
  assigned_team?: string;
  tags?: string[];
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface ListTicketsResponse {
  data: Ticket[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

interface TicketWithRelations extends Ticket {
  customer: User | null;
  assignee: User | null;
  team: Team | null;
}

/**
 * Ticket Management API
 */
export const TicketAPI = {
  /**
   * Create a new ticket
   */
  async create(params: CreateTicketParams): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        ...params,
        status: 'UNOPENED',
        priority: params.priority || 'NONE',
        reopen_count: 0,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    return data;
  },

  /**
   * Get ticket by ID with relations
   */
  async get(id: string): Promise<TicketWithRelations | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id (*),
        assignee:assigned_to (*),
        team:assigned_team (*)
      `)
      .eq('id', id)
      .single() as { data: TicketWithRelations | null, error: any };

    if (error) {
      throw new Error(`Failed to get ticket: ${error.message}`);
    }

    return data;
  },

  /**
   * List tickets with filtering and pagination
   */
  async list(params: ListTicketsParams = {}): Promise<ListTicketsResponse> {
    const {
      status,
      priority,
      customer_id,
      assigned_to,
      assigned_team,
      tags,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = params;

    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }
    if (assigned_team) {
      query = query.eq('assigned_team', assigned_team);
    }
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list tickets: ${error.message}`);
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
   * Update ticket
   */
  async update(id: string, params: UpdateTicketParams): Promise<Ticket> {
    const updates: any = { ...params };

    // Set updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Handle status changes
    if (params.status) {
      if (params.status === 'RESOLVED') {
        updates.resolved_at = new Date().toISOString();
      } else if (params.status === 'IN PROGRESS' && !updates.first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete ticket
   * Requires admin privileges
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  },

  /**
   * Assign ticket to user
   */
  async assign(id: string, userId: string | null): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        assigned_to: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign ticket: ${error.message}`);
    }

    return data;
  },

  /**
   * Assign ticket to team
   */
  async assignToTeam(id: string, teamId: string | null): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        assigned_team: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign ticket to team: ${error.message}`);
    }

    return data;
  },

  /**
   * Search tickets by title or content
   */
  async search(query: string, limit: number = 20): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select()
      .textSearch('title', query)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search tickets: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Reopen a resolved ticket
   */
  async reopen(id: string): Promise<Ticket> {
    const { data, error } = await supabase.rpc('reopen_ticket', { ticket_id: id });

    if (error) {
      throw new Error(`Failed to reopen ticket: ${error.message}`);
    }

    return data;
  },
}; 