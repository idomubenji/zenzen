import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Initialize Supabase client with auth configuration
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV || ''

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
}

// Session timeout duration (30 minutes)
export const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

// Valid user roles
export const UserRoles = {
  ADMINISTRATOR: 'Administrator',
  WORKER: 'Worker',
  CUSTOMER: 'Customer',
} as const

export type UserRole = typeof UserRoles[keyof typeof UserRoles]

// Function to validate role
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRoles).includes(role as UserRole)
} 