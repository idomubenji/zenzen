import { defineConfig } from "cypress";
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import * as dotenv from 'dotenv';

// Constants for test environment
const TEST_SUPABASE_URL = 'http://127.0.0.1:54321';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create a Supabase client for tasks
function getTaskSupabaseClient() {
  // Always use the test URL for Cypress
  const url = TEST_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV;

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY_DEV is not set');
  }

  console.log('Creating Supabase client with:', {
    url,
    keyExists: !!key,
    isServiceRole: true
  });

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
}

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      // Force test URL for Cypress
      NEXT_PUBLIC_SUPABASE_URL_DEV: TEST_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV,
      SUPABASE_SERVICE_ROLE_KEY_DEV: process.env.SUPABASE_SERVICE_ROLE_KEY_DEV,
      API_URL_DEV: 'http://localhost:3000/api'
    },
    setupNodeEvents(on, config) {
      // Override any environment variables with our test values
      config.env.NEXT_PUBLIC_SUPABASE_URL_DEV = TEST_SUPABASE_URL;
      
      // Debug logging during config
      console.log('Test environment:', {
        NEXT_PUBLIC_SUPABASE_URL_DEV: config.env.NEXT_PUBLIC_SUPABASE_URL_DEV,
        SUPABASE_SERVICE_ROLE_KEY_DEV: config.env.SUPABASE_SERVICE_ROLE_KEY_DEV ? '[HIDDEN]' : undefined
      });

      // Set environment variables for tasks
      process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = config.env.NEXT_PUBLIC_SUPABASE_URL_DEV;
      process.env.SUPABASE_SERVICE_ROLE_KEY_DEV = config.env.SUPABASE_SERVICE_ROLE_KEY_DEV;

      // Configure tasks
      on('task', {
        async clearTestData() {
          const supabase = getTaskSupabaseClient();
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

          await Promise.all(tables.map(table => 
            supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          ));

          return null;
        },
        async createTestUser({ role }: { role: 'Administrator' | 'Worker' | 'Customer' }) {
          const supabase = getTaskSupabaseClient();
          const email = `test-${role.toLowerCase()}-${Date.now()}@test.com`;

          console.log('Creating test user:', {
            email,
            role,
            supabaseUrl: TEST_SUPABASE_URL
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

          // Create user record
          const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email,
              role,
              name: `Test ${role}`
            })
            .select()
            .single();

          if (userError) {
            console.error('User error:', userError);
            throw userError;
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

          return { user, session: session.session };
        },
        async createTestTeam(name: string) {
          const supabase = getTaskSupabaseClient();
          const { data, error } = await supabase
            .from('teams')
            .insert({ name })
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        async createTestSchedule(params: { teamId: string; createdBy: string }) {
          const supabase = getTaskSupabaseClient();
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

          if (error) throw error;
          return data;
        }
      });

      return config;
    },
  },

  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  }
});
