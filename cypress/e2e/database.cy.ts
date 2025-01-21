import { supabase } from '../support/e2e'

describe('Database Operations', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  it('should create a user and verify their role', () => {
    const testEmail = `test-${Date.now()}@example.com`
    cy.createTestUser('Worker', testEmail).then((user) => {
      expect(user.email).to.equal(testEmail)
      expect(user.role).to.equal('Worker')
    })
  })

  it('should create a ticket and verify its status', () => {
    const testEmail = `customer-${Date.now()}@example.com`
    cy.createTestUser('Customer', testEmail).then((user) => {
      cy.createTestTicket(user.id, 'Test Ticket').then((ticket) => {
        expect(ticket.title).to.equal('Test Ticket')
        expect(ticket.status).to.equal('UNOPENED')
        expect(ticket.customer_id).to.equal(user.id)
      })
    })
  })

  it('should enforce role-based access control', () => {
    // Create a customer
    const customerEmail = `customer-${Date.now()}@example.com`
    const workerEmail = `worker-${Date.now()}@example.com`
    
    cy.createTestUser('Customer', customerEmail).then((customer) => {
      // Create a ticket for the customer
      cy.createTestTicket(customer.id, 'Customer Ticket').then((ticket) => {
        // Create a worker
        cy.createTestUser('Worker', workerEmail).then((worker) => {
          // Verify worker can access the ticket (through Supabase RLS)
          cy.wrap(null).then(async () => {
            const { data: workerView } = await supabase
              .from('tickets')
              .select()
              .eq('id', ticket.id)
              .single()
            
            expect(workerView).to.not.be.null
            expect(workerView.id).to.equal(ticket.id)

            // Verify performance monitoring logs were created
            const { data: syncLogs } = await supabase
              .from('realtime_sync_logs')
              .select()
              .eq('table_name', 'tickets')
              .order('timestamp', { ascending: false })
              .limit(1)
              .single()

            expect(syncLogs).to.not.be.null
            expect(syncLogs.table_name).to.equal('tickets')
          })
        })
      })
    })
  })

  it('should track performance metrics', () => {
    const testEmail = `customer-${Date.now()}@example.com`
    cy.createTestUser('Customer', testEmail).then((user) => {
      cy.createTestTicket(user.id, 'Performance Test Ticket').then(() => {
        cy.wrap(null).then(async () => {
          // Check query performance logs
          const { data: queryLogs } = await supabase
            .from('query_performance_logs')
            .select()
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()

          expect(queryLogs).to.not.be.null

          // Check realtime sync logs
          const { data: syncLogs } = await supabase
            .from('realtime_sync_logs')
            .select()
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()

          expect(syncLogs).to.not.be.null
          expect(syncLogs.sync_delay_ms).to.be.a('number')
        })
      })
    })
  })
}) 