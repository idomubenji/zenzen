describe('Basic Application Tests', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('http://localhost:3000')
  })

  it('should load the homepage', () => {
    // Check if the main heading exists
    cy.get('h1').should('contain', 'Welcome to ZenZen')
  })

  it('should have all button variants', () => {
    // Test that all our button variants are present
    cy.get('button').contains('Default Button').should('exist')
    cy.get('button').contains('Destructive Button').should('exist')
    cy.get('button').contains('Outline Button').should('exist')
    cy.get('button').contains('Secondary Button').should('exist')
    cy.get('button').contains('Ghost Button').should('exist')
    cy.get('button').contains('Link Button').should('exist')
  })
}) 