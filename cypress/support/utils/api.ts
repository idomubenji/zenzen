import { createClient, AuthResponse, User, Session } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { getSupabase } from '../e2e';

/**
 * API test utilities
 */
export const ApiTestUtils = {
  /**
   * Login as a test user
   */
  async loginAs(email: string, password: string): Promise<AuthResponse['data']> {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Create and login as a test user
   */
  async createAndLoginAs(role: 'Administrator' | 'Worker' | 'Customer'): Promise<{ user: User; session: Session }> {
    const supabase = getSupabase();
    const password = 'testpassword123';
    const email = `test-${role.toLowerCase()}-${Date.now()}@test.com`;

    console.log('Creating user with:', {
      email,
      role,
      supabaseUrl: Cypress.env('NEXT_PUBLIC_SUPABASE_URL_DEV')
    });

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authError) throw authError;

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
    if (userError) throw userError;

    // Login as the user
    const authResponse = await this.loginAs(email, password);
    return { user, session: authResponse.session! };
  },

  /**
   * Test API response format
   */
  validateResponseFormat<T>(response: Cypress.Response<T>) {
    expect(response.status).to.be.oneOf([200, 201]);
    expect(response.body).to.exist;
    if ((response.body as any).error) {
      throw new Error(`API Error: ${(response.body as any).error.message}`);
    }
  },

  /**
   * Make authenticated API request
   */
  makeAuthRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
    token?: string
  ): Cypress.Chainable<Cypress.Response<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return cy.request<T>({
      method,
      url: `${Cypress.env('API_URL_DEV')}${path}`,
      headers,
      body,
      failOnStatusCode: false
    });
  },

  /**
   * Test pagination response format
   */
  validatePaginationFormat<T>(response: Cypress.Response<{ data: T[]; pagination: any }>) {
    expect(response.body).to.have.property('data').that.is.an('array');
    expect(response.body).to.have.property('pagination').that.is.an('object');
    expect(response.body.pagination).to.have.all.keys([
      'total',
      'pages',
      'current_page',
      'per_page'
    ]);
  },

  /**
   * Test error response format
   */
  validateErrorResponse(response: Cypress.Response<any>, expectedStatus: number) {
    expect(response.status).to.equal(expectedStatus);
    expect(response.body).to.have.property('error').that.is.an('object');
    expect(response.body.error).to.have.property('message').that.is.a('string');
  },

  /**
   * Test CRUD operations for an endpoint
   */
  testCrudOperations<T extends { id: string }>(
    basePath: string,
    createPayload: any,
    updatePayload: any,
    token: string
  ): Cypress.Chainable<{ id: string }> {
    // Test CREATE
    return this.makeAuthRequest<T>(
      'POST',
      basePath,
      createPayload,
      token
    ).then((createResponse) => {
      this.validateResponseFormat(createResponse);
      const id = createResponse.body.id;

      // Test READ
      return this.makeAuthRequest<T>(
        'GET',
        `${basePath}/${id}`,
        null,
        token
      ).then((readResponse) => {
        this.validateResponseFormat(readResponse);

        // Test UPDATE
        return this.makeAuthRequest<T>(
          'PATCH',
          `${basePath}/${id}`,
          updatePayload,
          token
        ).then((updateResponse) => {
          this.validateResponseFormat(updateResponse);

          // Test DELETE
          return this.makeAuthRequest(
            'DELETE',
            `${basePath}/${id}`,
            null,
            token
          ).then((deleteResponse) => {
            this.validateResponseFormat(deleteResponse);
            return { id };
          });
        });
      });
    });
  }
}; 