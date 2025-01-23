import { supabase } from '@/lib/supabase/client'
import { UserRole, isValidRole } from './config'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export const AuthService = {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, role: UserRole, name: string) {
    // Validate role
    if (!isValidRole(role)) {
      throw new AuthError('Invalid role')
    }

    // Basic signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role, name } // Store role and name in metadata for later
      }
    })

    if (authError) {
      throw new AuthError(authError.message)
    }

    if (!authData.user) {
      throw new AuthError('Failed to create user')
    }

    return authData
  },

  /**
   * Sign in a user
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new AuthError(error.message)
    }

    return data
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new AuthError(error.message)
    }
  },

  /**
   * Get the current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      throw new AuthError(error.message)
    }

    return session
  },

  /**
   * Get the current user's role
   */
  async getCurrentUserRole(): Promise<UserRole | null> {
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()

    if (sessionError || !user) {
      return null
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return null
    }

    return userData.role as UserRole
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      throw new AuthError(error.message)
    }
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw new AuthError(error.message)
    }
  },
} 