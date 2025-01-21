/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    /**
     * Clean up all test data from the database
     */
    cleanupTestData(): Chainable<void>

    /**
     * Create a test user with the specified role and email
     */
    createTestUser(role: 'Administrator' | 'Worker' | 'Customer', email: string): Chainable<any>

    /**
     * Create a test ticket with the specified customer ID and title
     */
    createTestTicket(customerId: string, title: string): Chainable<any>
  }
} 