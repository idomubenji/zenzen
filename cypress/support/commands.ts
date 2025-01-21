/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

declare global {
  namespace Cypress {
    interface Chainable {
      initSupabase(): Chainable<SupabaseClient<Database>>
    }
  }
}

// Initialize Supabase client
let supabaseClient: SupabaseClient<Database> | null = null;

// Function to initialize Supabase client
function initSupabaseClient() {
  if (!supabaseClient) {
    const url = Cypress.env('NEXT_PUBLIC_SUPABASE_URL_DEV');
    const key = Cypress.env('SUPABASE_SERVICE_ROLE_KEY_DEV');
    
    // Debug logging
    console.log('Supabase URL:', url);
    console.log('Supabase Key exists:', !!key);
    console.log('All env vars:', Cypress.env());
    
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL_DEV is not set in Cypress environment');
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY_DEV is not set in Cypress environment');
    
    supabaseClient = createClient<Database>(url, key);
  }
  return supabaseClient;
}

// Add command after Cypress is loaded
if (typeof Cypress !== 'undefined') {
  Cypress.Commands.add('initSupabase', () => {
    return cy.wrap(initSupabaseClient());
  });
}