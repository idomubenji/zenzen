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
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for testing
const supabaseUrl = Cypress.env('SUPABASE_URL') || 'http://localhost:54321'
const supabaseKey = Cypress.env('SUPABASE_SERVICE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Use service role client for test data management
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database cleanup utility
Cypress.Commands.add('cleanupTestData', () => {
  cy.wrap(null, { timeout: 10000 }).then(async () => {
    // Clean up test data in reverse order of dependencies
    await supabase.from('query_performance_logs').delete().neq('id', '')
    await supabase.from('realtime_sync_logs').delete().neq('id', '')
    await supabase.from('file_upload_logs').delete().neq('id', '')
    await supabase.from('worker_chat_messages').delete().neq('id', '')
    await supabase.from('worker_chat').delete().neq('id', '')
    await supabase.from('templates').delete().neq('id', '')
    await supabase.from('files').delete().neq('id', '')
    await supabase.from('feedback').delete().neq('id', '')
    await supabase.from('notes').delete().neq('id', '')
    await supabase.from('messages').delete().neq('id', '')
    await supabase.from('tickets').delete().neq('id', '')
    await supabase.from('user_teams').delete().neq('id', '')
    await supabase.from('teams').delete().neq('id', '')
    await supabase.from('users').delete().neq('id', '')
  })
})

// Test data creation utilities
Cypress.Commands.add('createTestUser', (role: 'Administrator' | 'Worker' | 'Customer', email: string) => {
  return cy.wrap(null).then(async () => {
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
})

Cypress.Commands.add('createTestTicket', (customerId: string, title: string) => {
  return cy.wrap(null).then(async () => {
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
})

// Add more test utilities as needed