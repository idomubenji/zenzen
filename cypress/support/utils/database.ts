/// <reference types="cypress" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Database test utilities
 */
export const DatabaseTestUtils = {
  /**
   * Get Supabase client for database operations
   */
  getSupabaseClient() {
    const supabaseUrl = Cypress.env('NEXT_PUBLIC_SUPABASE_URL_DEV');
    const supabaseKey = Cypress.env('SUPABASE_SERVICE_ROLE_KEY_DEV');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    console.log('DatabaseTestUtils creating service role client with:', {
      url: supabaseUrl,
      keyExists: !!supabaseKey,
      isServiceRole: true
    });

    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });
  },

  /**
   * Cleans up test data from all tables
   */
  async clearTestData() {
    const tables = [
      'coverage_shifts',
      'coverage_schedules',
      'query_performance_logs',
      'realtime_sync_logs',
      'file_upload_logs',
      'worker_chat_messages',
      'worker_chat',
      'templates',
      'files',
      'feedback',
      'notes',
      'messages',
      'tickets',
      'user_teams',
      'teams',
      'users'
    ];

    const supabase = this.getSupabaseClient();

    await Promise.all(tables.map(table => 
      supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ));
  },

  /**
   * Creates a test user with specified role
   */
  async createTestUser(role: 'Administrator' | 'Worker' | 'Customer') {
    const supabase = this.getSupabaseClient();
    const email = `test-${role.toLowerCase()}-${Date.now()}@test.com`;

    console.log('Creating test user:', {
      email,
      role,
      isServiceRole: true
    });

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'testpassword123',
      email_confirm: true
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    // Insert into users table with role
    const { data, error } = await supabase.from('users').insert({
      id: authData.user.id,
      email: authData.user.email,
      role: role,
      name: `Test ${role}`
    }).select().single();

    if (error) {
      console.error('User creation error:', error);
      throw error;
    }

    // Get session for auth
    const { data: session, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password: 'testpassword123'
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    return { user: data, session: session.session };
  },

  /**
   * Creates a test team
   */
  async createTestTeam(name: string) {
    const supabase = this.getSupabaseClient();

    const { data, error } = await supabase
      .from('teams')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Team creation error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Creates a test coverage schedule
   */
  async createTestSchedule(params: { teamId: string; createdBy: string }) {
    const supabase = this.getSupabaseClient();

    const { data, error } = await supabase
      .from('coverage_schedules')
      .insert({
        team_id: params.teamId,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'UTC',
        created_by: params.createdBy
      })
      .select()
      .single();

    if (error) {
      console.error('Schedule creation error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Create a test ticket
   */
  createTestTicket(customerId: string, status: 'UNOPENED' | 'IN PROGRESS' | 'RESOLVED' | 'UNRESOLVED' = 'UNOPENED') {
    const supabase = this.getSupabaseClient();
    return supabase
      .from('tickets')
      .insert({
        customer_id: customerId,
        title: `Test Ticket ${Date.now()}`,
        status,
        priority: 'LOW'
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Ticket creation error:', error);
          throw error;
        }
        return data;
      });
  },

  /**
   * Create a test message
   */
  createTestMessage(ticketId: string, userId: string, content?: string) {
    const supabase = this.getSupabaseClient();
    return supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        content: content || `Test message ${Date.now()}`
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Message creation error:', error);
          throw error;
        }
        return data;
      });
  },

  /**
   * Verify database record exists
   */
  verifyRecord(table: keyof Database['public']['Tables'], id: string) {
    const supabase = this.getSupabaseClient();
    return supabase
      .from(table)
      .select()
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Record verification error:', error);
          throw error;
        }
        return data;
      });
  }
}; 