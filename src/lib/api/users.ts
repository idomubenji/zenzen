import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export type UserRole = 'Administrator' | 'Worker' | 'Customer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: string;
}

export interface CreateUserParams {
  email: string;
  role: UserRole;
  name: string;
}

export interface UpdateUserParams {
  name?: string;
  role?: UserRole;
}

export interface ListUsersParams {
  role?: UserRole;
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  data: User[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

/**
 * User Management API
 */
export const UserAPI = {
  /**
   * Create a new user
   * Requires admin privileges
   */
  async create({ email, role, name }: CreateUserParams): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, role, name }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  },

  /**
   * Get user by ID
   */
  async get(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  },

  /**
   * List users with pagination and filtering
   */
  async list({ role, page = 1, limit = 20 }: ListUsersParams = {}): Promise<ListUsersResponse> {
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    // Apply role filter if provided
    if (role) {
      query = query.eq('role', role);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
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
   * Update user
   * Requires admin privileges or self-update
   */
  async update(id: string, params: UpdateUserParams): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete user
   * Requires admin privileges
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  },

  /**
   * Update user role (requires admin approval)
   */
  async updateRole(id: string, role: UserRole): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    return data;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', user.id)
      .single();

    if (error) {
      throw new Error(`Failed to get current user: ${error.message}`);
    }

    return data;
  },
}; 