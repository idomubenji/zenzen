/// <reference types="cypress" />
// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import { DatabaseTestUtils } from './utils/database'
import { ApiTestUtils } from './utils/api'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

declare global {
  namespace Cypress {
    interface Chainable {
      cleanupTestData(): Chainable<void>
      createTestUser(role: 'Administrator' | 'Worker' | 'Customer', email: string): Chainable<any>
      createTestTicket(customerId: string, title: string): Chainable<any>
      initSupabase(): Chainable<SupabaseClient<Database>>
    }
  }
}

// Export supabase client for use in tests
function getSupabaseClient() {
  const supabaseUrl = Cypress.env('NEXT_PUBLIC_SUPABASE_URL_DEV')
  const supabaseKey = Cypress.env('SUPABASE_SERVICE_ROLE_KEY_DEV')

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  console.log('Creating service role client with:', {
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
}

// Export getSupabase function after Cypress is loaded
export const getSupabase = typeof Cypress !== 'undefined' ? getSupabaseClient : () => {
  throw new Error('Cypress is not loaded yet')
}

// Add commands after Cypress is loaded
if (typeof Cypress !== 'undefined') {
  // Initialize Supabase client command
  Cypress.Commands.add('initSupabase', () => {
    return cy.wrap(getSupabaseClient());
  });

  // Database cleanup utility
  Cypress.Commands.add('cleanupTestData', () => {
    cy.initSupabase().then(supabase => {
      // Clean up test data in reverse order of dependencies
      const deletePromises = [
        supabase.from('query_performance_logs').delete().neq('id', ''),
        supabase.from('realtime_sync_logs').delete().neq('id', ''),
        supabase.from('file_upload_logs').delete().neq('id', ''),
        supabase.from('worker_chat_messages').delete().neq('id', ''),
        supabase.from('worker_chat').delete().neq('id', ''),
        supabase.from('templates').delete().neq('id', ''),
        supabase.from('files').delete().neq('id', ''),
        supabase.from('feedback').delete().neq('id', ''),
        supabase.from('notes').delete().neq('id', ''),
        supabase.from('messages').delete().neq('id', ''),
        supabase.from('tickets').delete().neq('id', ''),
        supabase.from('user_teams').delete().neq('id', ''),
        supabase.from('teams').delete().neq('id', ''),
        supabase.from('users').delete().neq('id', '')
      ];
      
      return Promise.all(deletePromises);
    });
  });

  // Test data creation utilities
  Cypress.Commands.add('createTestUser', (role: 'Administrator' | 'Worker' | 'Customer', email: string) => {
    return cy.initSupabase().then(async (supabase) => {
      const timestamp = new Date().toISOString()
      const { data, error } = await supabase.from('users').insert([
        {
          email,
          role,
          name: `Test ${role}`,
          created_at: timestamp,
          timestamp: timestamp
        }
      ]).select().single()

      if (error) throw error
      return data
    })
  });

  Cypress.Commands.add('createTestTicket', (customerId: string, title: string) => {
    return cy.initSupabase().then(async (supabase) => {
      const timestamp = new Date().toISOString()
      const { data, error } = await supabase.from('tickets').insert([
        {
          customer_id: customerId,
          title,
          status: 'UNOPENED',
          priority: 'NONE',
          created_at: timestamp,
          updated_at: timestamp,
          tags: [],
          custom_fields: {},
          timestamp: timestamp
        }
      ]).select().single()

      if (error) throw error
      return data
    })
  });
}